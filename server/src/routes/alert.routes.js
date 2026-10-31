import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { Alert } from '../models/index.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * @route GET /api/v1/alerts
 * @desc Get alerts inbox for clinician dashboard (scoped to hospital)
 */
router.get('/', authenticate, requireRole('doctor', 'nurse', 'hospital_admin'), async (req, res, next) => {
  try {
    const hospitalId = req.staff?.hospital?._id || req.staff?.hospital;
    if (!hospitalId) {
      return res.status(400).json({ success: false, message: 'Hospital context required' });
    }

    const { status, riskLevel } = req.query;
    const filter = { hospital: hospitalId };

    if (status && status !== 'all') {
      filter.status = status;
    }
    if (riskLevel && riskLevel !== 'all') {
      filter.riskLevel = riskLevel;
    }

    const [alerts, openCount, criticalCount] = await Promise.all([
      Alert.find(filter)
        .populate({
          path: 'patient',
          select: 'name patientId phone dob gender address primaryDoctor',
          populate: { path: 'primaryDoctor', select: 'name' }
        })
        .populate('assessment')
        .populate('reviewer', 'name role')
        .populate('assignedTo', 'name role')
        .sort({ createdAt: -1 })
        .lean(),
      Alert.countDocuments({ hospital: hospitalId, status: { $in: ['open', 'escalated'] } }),
      Alert.countDocuments({ hospital: hospitalId, riskLevel: 'critical', status: { $in: ['open', 'escalated'] } })
    ]);

    logAuditEvent({
      userId: req.user._id,
      action: 'read',
      resourceType: 'Alert',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: `Clinician alert inbox viewed (Found: ${alerts.length}, Open: ${openCount})`
    }).catch(() => {});

    res.json({
      success: true,
      counts: {
        total: alerts.length,
        open: openCount,
        critical: criticalCount
      },
      data: alerts
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route PATCH /api/v1/alerts/:id/acknowledge
 * @desc Doctor or Nurse acknowledges an open alert
 */
router.patch(
  '/:id/acknowledge',
  authenticate,
  requireRole('doctor', 'nurse', 'hospital_admin'),
  async (req, res, next) => {
    try {
      const alert = await Alert.findById(req.params.id).populate('patient');
      if (!alert) {
        return res.status(404).json({ success: false, message: 'Alert not found' });
      }

      alert.status = 'acknowledged';
      alert.reviewer = req.staff?._id;
      alert.acknowledgedAt = new Date();
      await alert.save();

      await logAuditEvent({
        userId: req.user._id,
        action: 'update',
        resourceType: 'Alert',
        resourceId: alert._id,
        patientId: alert.patient?._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Alert ${alert._id} acknowledged by ${req.staff?.name} (${req.user.role})`
      });

      res.json({
        success: true,
        message: 'Alert acknowledged successfully',
        data: alert
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route PATCH /api/v1/alerts/:id/resolve
 * @desc Doctor records clinical decision and resolves the alert
 */
router.patch(
  '/:id/resolve',
  authenticate,
  requireRole('doctor', 'nurse', 'hospital_admin'),
  [
    body('actionTaken').notEmpty().withMessage('Action taken is required'),
    body('notes').notEmpty().withMessage('Clinical decision notes are required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { actionTaken, notes } = req.body;
      const alert = await Alert.findById(req.params.id).populate('patient');

      if (!alert) {
        return res.status(404).json({ success: false, message: 'Alert not found' });
      }

      alert.status = 'resolved';
      alert.reviewer = req.staff?._id;
      alert.resolvedAt = new Date();
      alert.clinicianDecision = {
        actionTaken,
        notes: notes.trim(),
        decisionTime: new Date()
      };

      await alert.save();

      await logAuditEvent({
        userId: req.user._id,
        action: 'update',
        resourceType: 'Alert',
        resourceId: alert._id,
        patientId: alert.patient?._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Alert resolved by Dr. ${req.staff?.name}. Action: ${actionTaken}. Notes: ${notes}`
      });

      res.json({
        success: true,
        message: 'Alert resolved and clinical decision recorded',
        data: alert
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
