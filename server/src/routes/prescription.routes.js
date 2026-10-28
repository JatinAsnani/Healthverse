import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole, requirePatientAccess } from '../middleware/rbac.js';
import { Prescription, Discharge } from '../models/index.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * @route GET /api/v1/prescriptions/patient/:patientId
 * @desc Get all prescriptions for a patient
 */
router.get('/patient/:patientId', authenticate, requirePatientAccess('patientId'), async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ patient: req.targetPatient._id })
      .populate('discharge', 'diagnosis dischargeDate')
      .sort({ startDate: -1 });

    await logAuditEvent({
      userId: req.user._id,
      action: 'read',
      resourceType: 'Prescription',
      patientId: req.targetPatient._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: 'Patient prescriptions list viewed'
    });

    res.json({ success: true, count: prescriptions.length, data: prescriptions });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/v1/prescriptions
 * @desc Add a new prescription (Doctor only)
 */
router.post(
  '/',
  authenticate,
  requireRole('doctor'),
  [
    body('dischargeId').notEmpty().withMessage('Discharge ID is required'),
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('medicine').notEmpty().withMessage('Medicine name is required'),
    body('dosage').notEmpty().withMessage('Dosage is required'),
    body('startDate').notEmpty().withMessage('Start date is required'),
    body('endDate').notEmpty().withMessage('End date is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        dischargeId,
        patientId,
        medicine,
        dosage,
        schedule,
        startDate,
        endDate,
        critical = false,
        purpose,
        instructions
      } = req.body;

      const discharge = await Discharge.findById(dischargeId);
      if (!discharge) {
        return res.status(404).json({ success: false, message: 'Discharge not found' });
      }

      const prescription = await Prescription.create({
        discharge: discharge._id,
        patient: patientId,
        medicine: medicine.trim(),
        dosage: dosage.trim(),
        schedule: schedule || {
          timesPerDay: 1,
          timings: [{ time: '09:00', label: 'Morning' }],
          foodTiming: 'after_food'
        },
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        critical: Boolean(critical),
        purpose: purpose?.trim(),
        instructions: instructions?.trim(),
        syncStatus: 'synced'
      });

      await logAuditEvent({
        userId: req.user._id,
        action: 'create',
        resourceType: 'Prescription',
        resourceId: prescription._id,
        patientId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Prescription for ${medicine} created (critical: ${critical})`
      });

      res.status(201).json({
        success: true,
        message: 'Prescription added successfully',
        data: prescription
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
