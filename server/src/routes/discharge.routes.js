import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole, requirePatientAccess } from '../middleware/rbac.js';
import { Discharge, Patient, Prescription, Followup, Investigation } from '../models/index.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * @route GET /api/v1/discharges/patient/:patientId
 * @desc Get all discharges for a patient
 */
router.get('/patient/:patientId', authenticate, requirePatientAccess('patientId'), async (req, res, next) => {
  try {
    const discharges = await Discharge.find({ patient: req.targetPatient._id })
      .populate('treatingDoctor', 'name specialization')
      .populate('hospital', 'name facilityCode')
      .sort({ dischargeDate: -1 });

    await logAuditEvent({
      userId: req.user._id,
      action: 'read',
      resourceType: 'Discharge',
      patientId: req.targetPatient._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: 'Discharge list retrieved'
    });

    res.json({ success: true, count: discharges.length, data: discharges });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/v1/discharges/:id
 * @desc Get discharge summary details with associated meds, followups, tests
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const discharge = await Discharge.findById(req.params.id)
      .populate('patient')
      .populate('treatingDoctor', 'name specialization phone')
      .populate('hospital');

    if (!discharge) {
      return res.status(404).json({ success: false, message: 'Discharge record not found' });
    }

    const [prescriptions, followups, investigations] = await Promise.all([
      Prescription.find({ discharge: discharge._id }),
      Followup.find({ discharge: discharge._id }).populate('staff', 'name'),
      Investigation.find({ discharge: discharge._id })
    ]);

    await logAuditEvent({
      userId: req.user._id,
      action: 'read',
      resourceType: 'Discharge',
      resourceId: discharge._id,
      patientId: discharge.patient?._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: 'Single discharge record viewed'
    });

    res.json({
      success: true,
      data: {
        discharge,
        prescriptions,
        followups,
        investigations
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/v1/discharges
 * @desc Create new Discharge with optional initial prescriptions & follow-ups (Doctor only)
 */
router.post(
  '/',
  authenticate,
  requireRole('doctor'),
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('diagnosis').notEmpty().withMessage('Clinical diagnosis is required'),
    body('summary').notEmpty().withMessage('Discharge clinical summary is required'),
    body('dischargeDate').notEmpty().withMessage('Discharge date is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        patientId,
        diagnosis,
        summary,
        admissionDate,
        dischargeDate,
        instructions = {},
        prescriptions = [],
        followup = null,
        investigations = []
      } = req.body;

      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      const hospitalId = req.staff?.hospital?._id || req.staff?.hospital;

      // Create discharge
      const discharge = await Discharge.create({
        patient: patient._id,
        hospital: hospitalId,
        dischargeDate: new Date(dischargeDate),
        admissionDate: admissionDate ? new Date(admissionDate) : undefined,
        diagnosis: diagnosis.trim(),
        summary: summary.trim(),
        instructions: {
          diet: instructions.diet || 'Nutritious balanced diet',
          activity: instructions.activity || 'Rest and light ambulation',
          warningSigns: instructions.warningSigns || [],
          general: instructions.general || 'Take medicines on time'
        },
        treatingDoctor: req.staff._id,
        status: 'active'
      });

      // Create prescriptions if provided
      const createdPrescriptions = [];
      for (const p of prescriptions) {
        const presc = await Prescription.create({
          discharge: discharge._id,
          patient: patient._id,
          medicine: p.medicine,
          dosage: p.dosage,
          schedule: {
            timesPerDay: p.timesPerDay || 1,
            timings: p.timings || [{ time: '09:00', label: 'Morning' }],
            foodTiming: p.foodTiming || 'after_food'
          },
          startDate: p.startDate ? new Date(p.startDate) : new Date(dischargeDate),
          endDate: p.endDate ? new Date(p.endDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          critical: Boolean(p.critical),
          instructions: p.instructions || '',
          syncStatus: 'synced'
        });
        createdPrescriptions.push(presc);
      }

      // Create follow-up if provided
      let createdFollowup = null;
      if (followup && followup.scheduledAt) {
        createdFollowup = await Followup.create({
          discharge: discharge._id,
          patient: patient._id,
          staff: req.staff._id,
          scheduledAt: new Date(followup.scheduledAt),
          type: followup.type || 'in_person',
          notes: followup.notes || 'Routine post-discharge clinical review',
          syncStatus: 'synced'
        });
      }

      // Create investigations if provided
      const createdInvestigations = [];
      for (const inv of investigations) {
        const item = await Investigation.create({
          discharge: discharge._id,
          patient: patient._id,
          testName: inv.testName,
          status: 'ordered',
          instructions: inv.instructions || '',
          syncStatus: 'synced'
        });
        createdInvestigations.push(item);
      }

      await logAuditEvent({
        userId: req.user._id,
        action: 'create',
        resourceType: 'Discharge',
        resourceId: discharge._id,
        patientId: patient._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Discharge summary created by Dr. ${req.staff?.name} with ${createdPrescriptions.length} meds`
      });

      res.status(201).json({
        success: true,
        message: 'Discharge summary created successfully',
        data: {
          discharge,
          prescriptions: createdPrescriptions,
          followup: createdFollowup,
          investigations: createdInvestigations
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
