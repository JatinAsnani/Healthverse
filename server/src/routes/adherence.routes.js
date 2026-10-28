import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requirePatientAccess } from '../middleware/rbac.js';
import { AdherenceLog, Prescription, Patient } from '../models/index.js';
import { performServerRiskAssessment } from '../services/riskService.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * @route GET /api/v1/adherence/patient/:patientId
 * @desc Get adherence logs for a patient
 */
router.get('/patient/:patientId', authenticate, requirePatientAccess('patientId'), async (req, res, next) => {
  try {
    const logs = await AdherenceLog.find({ patient: req.targetPatient._id })
      .populate('prescription')
      .populate('loggedBy', 'role phone')
      .sort({ dueAt: -1 })
      .limit(60);

    // Calculate adherence stats (last 14 days)
    const totalDoses = logs.length;
    const takenDoses = logs.filter(l => l.status === 'taken').length;
    const adherencePercentage = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

    await logAuditEvent({
      userId: req.user._id,
      action: 'read',
      resourceType: 'AdherenceLog',
      patientId: req.targetPatient._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: `Adherence logs retrieved (Rate: ${adherencePercentage}%)`
    });

    res.json({
      success: true,
      stats: {
        totalDoses,
        takenDoses,
        adherencePercentage
      },
      data: logs
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/v1/adherence
 * @desc Log medicine adherence (taken/missed/skipped)
 * Triggered by patient, caregiver, or visiting CHW
 */
router.post(
  '/',
  authenticate,
  [
    body('prescriptionId').notEmpty().withMessage('Prescription ID is required'),
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('status').isIn(['taken', 'missed', 'skipped']).withMessage('Status must be taken, missed, or skipped'),
    body('dueAt').notEmpty().withMessage('Due date/time is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        prescriptionId,
        patientId,
        status,
        dueAt,
        notes,
        clientUuid,
        deviceId = 'web-client'
      } = req.body;

      const prescription = await Prescription.findById(prescriptionId);
      if (!prescription) {
        return res.status(404).json({ success: false, message: 'Prescription not found' });
      }

      const log = await AdherenceLog.create({
        prescription: prescription._id,
        patient: patientId,
        dueAt: new Date(dueAt),
        takenAt: status === 'taken' ? new Date() : undefined,
        status,
        loggedBy: req.user._id,
        notes: notes?.trim(),
        clientUuid,
        deviceId,
        syncStatus: 'synced'
      });

      // If prescription was critical and marked missed/skipped, re-evaluate risk
      let riskAssessment = null;
      if (prescription.critical && (status === 'missed' || status === 'skipped')) {
        riskAssessment = await performServerRiskAssessment({
          patientId,
          deviceId
        });
      }

      await logAuditEvent({
        userId: req.user._id,
        action: 'create',
        resourceType: 'AdherenceLog',
        resourceId: log._id,
        patientId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Medicine ${prescription.medicine} logged as '${status}' by ${req.user.role}`
      });

      res.status(201).json({
        success: true,
        message: 'Medication dose logged successfully',
        data: {
          log,
          riskAssessment: riskAssessment?.assessment || null,
          alert: riskAssessment?.alert || null
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
