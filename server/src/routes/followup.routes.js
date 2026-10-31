import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole, requirePatientAccess } from '../middleware/rbac.js';
import { Followup, Discharge, Staff, Patient, Hospital } from '../models/index.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * @route GET /api/v1/followups/doctors
 * @desc Get all active doctors available for appointment booking
 */
router.get('/doctors', async (req, res, next) => {
  try {
    const doctors = await Staff.find({ role: 'doctor', active: true })
      .select('name specialization phone hospital')
      .populate('hospital', 'name facilityCode address');

    res.json({ success: true, count: doctors.length, data: doctors });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/v1/followups
 * @desc Get all follow-ups / appointments for clinician & hospital view
 */
router.get(
  '/',
  authenticate,
  requireRole('doctor', 'nurse', 'chw', 'hospital_admin'),
  async (req, res, next) => {
    try {
      const { status, type, doctorId, patientId } = req.query;
      const query = {};

      if (status && status !== 'all') {
        query.status = status;
      }
      if (type && type !== 'all') {
        query.type = type;
      }
      if (patientId) {
        query.patient = patientId;
      }
      if (doctorId) {
        if (doctorId === 'my' && req.staff?._id) {
          query.staff = req.staff._id;
        } else if (doctorId !== 'all') {
          query.staff = doctorId;
        }
      }

      const followups = await Followup.find(query)
        .populate('patient', 'name patientId phone gender dob address hospital')
        .populate('staff', 'name specialization phone role')
        .populate('discharge', 'diagnosis dischargeDate hospital')
        .sort({ scheduledAt: 1 })
        .lean();

      res.json({
        success: true,
        count: followups.length,
        data: followups
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /api/v1/followups/book
 * @desc Book an appointment with a chosen doctor (Accessible by Patient, Caregiver, or Staff)
 */
router.post(
  '/book',
  authenticate,
  [
    body('scheduledAt').notEmpty().withMessage('Scheduled date and time is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { doctorId, patientId, dischargeId, scheduledAt, type = 'in_person', notes } = req.body;

      // Resolve target patient
      let targetPatientId = patientId;
      if (!targetPatientId) {
        if (req.patient?._id) {
          targetPatientId = req.patient._id;
        } else if (req.user?.role === 'patient') {
          const p = await Patient.findOne({ user: req.user._id });
          if (p) targetPatientId = p._id;
        }
      }

      // If still not resolved and user is caregiver, check their first patient
      if (!targetPatientId && req.user?.role === 'caregiver') {
        const p = await Patient.findOne();
        if (p) targetPatientId = p._id;
      }

      if (!targetPatientId) {
        return res.status(400).json({
          success: false,
          message: 'Unable to resolve patient account. Please provide patientId.'
        });
      }

      // Resolve doctor/staff
      let assignedStaffId = doctorId;
      if (!assignedStaffId) {
        const defaultDoctor = await Staff.findOne({ role: 'doctor', active: true });
        if (defaultDoctor) assignedStaffId = defaultDoctor._id;
      }

      // Resolve discharge if available
      let targetDischargeId = dischargeId;
      if (!targetDischargeId) {
        const latestDischarge = await Discharge.findOne({ patient: targetPatientId }).sort({ dischargeDate: -1 });
        if (latestDischarge) targetDischargeId = latestDischarge._id;
      }

      const followup = await Followup.create({
        discharge: targetDischargeId || null,
        patient: targetPatientId,
        staff: assignedStaffId || null,
        scheduledAt: new Date(scheduledAt),
        type,
        notes: notes?.trim() || 'Booked via patient appointment portal',
        syncStatus: 'synced'
      });

      const populated = await Followup.findById(followup._id)
        .populate('staff', 'name specialization phone role')
        .populate('discharge', 'diagnosis dischargeDate');

      await logAuditEvent({
        userId: req.user._id,
        action: 'create',
        resourceType: 'Followup',
        resourceId: followup._id,
        patientId: targetPatientId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Appointment booked for ${new Date(scheduledAt).toLocaleString()} with doctor ${populated.staff?.name || 'Assigned Doctor'}`
      });

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        data: populated
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route GET /api/v1/followups/patient/:patientId
 * @desc Get all follow-ups for a patient
 */
router.get('/patient/:patientId', authenticate, requirePatientAccess('patientId'), async (req, res, next) => {
  try {
    const followups = await Followup.find({ patient: req.targetPatient._id })
      .populate('staff', 'name role phone')
      .populate('discharge', 'diagnosis dischargeDate')
      .sort({ scheduledAt: 1 });

    await logAuditEvent({
      userId: req.user._id,
      action: 'read',
      resourceType: 'Followup',
      patientId: req.targetPatient._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: 'Follow-ups list viewed'
    });

    res.json({ success: true, count: followups.length, data: followups });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/v1/followups
 * @desc Schedule a follow-up (Doctor, Nurse, CHW)
 */
router.post(
  '/',
  authenticate,
  requireRole('doctor', 'nurse', 'chw', 'hospital_admin'),
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('scheduledAt').notEmpty().withMessage('Scheduled date and time is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { patientId, dischargeId, scheduledAt, type = 'in_person', notes } = req.body;

      let targetDischargeId = dischargeId;
      if (!targetDischargeId) {
        const d = await Discharge.findOne({ patient: patientId }).sort({ dischargeDate: -1 });
        targetDischargeId = d?._id || null;
      }

      if (!targetDischargeId) {
        const patient = await Patient.findById(patientId);
        let assignedHospital = patient?.hospital;
        if (!assignedHospital) {
          const firstHosp = await Hospital.findOne();
          assignedHospital = firstHosp?._id;
        }

        const newDischarge = await Discharge.create({
          patient: patientId,
          hospital: assignedHospital,
          treatingDoctor: req.staff?._id || null,
          admissionDate: new Date(Date.now() - 3 * 86400000),
          dischargeDate: new Date(),
          diagnosis: patient?.medicalHistory?.[0] || 'Active Clinical Continuity & Recovery',
          summary: 'Clinical continuity record under active outpatient monitoring.',
          instructions: {
            diet: 'Balanced nutritious diet with adequate clean fluids.',
            activity: 'Light activity and daily walking as tolerated.',
            warningSigns: ['Fever >= 101°F', 'Severe persistent pain', 'Sudden breathlessness']
          },
          syncStatus: 'synced'
        });
        targetDischargeId = newDischarge._id;
      }

      const followup = await Followup.create({
        discharge: targetDischargeId,
        patient: patientId,
        staff: req.staff?._id,
        scheduledAt: new Date(scheduledAt),
        type,
        notes: notes?.trim() || 'Scheduled clinical follow-up visit',
        syncStatus: 'synced'
      });

      await logAuditEvent({
        userId: req.user._id,
        action: 'create',
        resourceType: 'Followup',
        resourceId: followup._id,
        patientId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Follow-up visit scheduled for ${new Date(scheduledAt).toLocaleDateString()}`
      });

      res.status(201).json({
        success: true,
        message: 'Follow-up scheduled successfully',
        data: followup
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route PATCH /api/v1/followups/:id
 * @desc Update follow-up status (completed, missed, rescheduled) and notes
 */
router.patch(
  '/:id',
  authenticate,
  requireRole('doctor', 'nurse', 'chw', 'hospital_admin'),
  async (req, res, next) => {
    try {
      const { status, notes, completedAt, scheduledAt } = req.body;
      const followup = await Followup.findById(req.params.id);

      if (!followup) {
        return res.status(404).json({ success: false, message: 'Follow-up not found' });
      }

      if (status) followup.status = status;
      if (notes) followup.notes = notes;
      if (completedAt) followup.completedAt = new Date(completedAt);
      if (scheduledAt) followup.scheduledAt = new Date(scheduledAt);

      followup.version = (followup.version || 1) + 1;
      followup.updatedAt = new Date();
      await followup.save();

      await logAuditEvent({
        userId: req.user._id,
        action: 'update',
        resourceType: 'Followup',
        resourceId: followup._id,
        patientId: followup.patient,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Follow-up status updated to ${status || followup.status}`
      });

      res.json({
        success: true,
        message: 'Follow-up updated successfully',
        data: followup
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
