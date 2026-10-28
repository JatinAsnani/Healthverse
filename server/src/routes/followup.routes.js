import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole, requirePatientAccess } from '../middleware/rbac.js';
import { Followup, Discharge } from '../models/index.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

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
    body('dischargeId').notEmpty().withMessage('Discharge ID is required'),
    body('scheduledAt').notEmpty().withMessage('Scheduled date and time is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { patientId, dischargeId, scheduledAt, type = 'in_person', notes } = req.body;

      const followup = await Followup.create({
        discharge: dischargeId,
        patient: patientId,
        staff: req.staff?._id,
        scheduledAt: new Date(scheduledAt),
        type,
        notes: notes?.trim(),
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
