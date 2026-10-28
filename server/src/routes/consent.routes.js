import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requirePatientAccess } from '../middleware/rbac.js';
import { Consent, PatientCaregiver } from '../models/index.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * @route GET /api/v1/consent/patient/:patientId
 * @desc Get all consent records for a patient (DPDP Act 2023 principle: transparency)
 */
router.get('/patient/:patientId', authenticate, requirePatientAccess('patientId'), async (req, res, next) => {
  try {
    const consents = await Consent.find({ patient: req.targetPatient._id })
      .populate('grantedTo', 'phone role')
      .sort({ grantedAt: -1 });

    await logAuditEvent({
      userId: req.user._id,
      action: 'read',
      resourceType: 'Consent',
      patientId: req.targetPatient._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: 'Consent records viewed'
    });

    res.json({ success: true, count: consents.length, data: consents });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/v1/consent
 * @desc Grant consent for a specific healthcare purpose
 */
router.post(
  '/',
  authenticate,
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('purpose').isIn([
      'caregiver_access',
      'chw_home_monitoring',
      'telephonic_followup',
      'emergency_sms_alerts',
      'clinical_continuity'
    ]).withMessage('Valid purpose required under DPDP Act')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { patientId, purpose, grantedTo, clientUuid, deviceId = 'web-client' } = req.body;

      // Revoke any existing active consent for this exact purpose & grantedTo
      await Consent.updateMany(
        {
          patient: patientId,
          purpose,
          grantedTo: grantedTo || null,
          revokedAt: null
        },
        {
          $set: {
            revokedAt: new Date(),
            revokedReason: 'Superseded by renewed consent grant'
          }
        }
      );

      const consent = await Consent.create({
        patient: patientId,
        purpose,
        grantedTo: grantedTo || null,
        grantedAt: new Date(),
        noticeVersion: 'DPDP-2023-v1.0',
        clientUuid,
        deviceId,
        syncStatus: 'synced'
      });

      await logAuditEvent({
        userId: req.user._id,
        action: 'create',
        resourceType: 'Consent',
        resourceId: consent._id,
        patientId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Consent granted for '${purpose}'`
      });

      res.status(201).json({
        success: true,
        message: 'Consent granted successfully',
        data: consent
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route POST /api/v1/consent/:id/revoke
 * @desc Revoke consent (Right to Withdraw under DPDP Act 2023 - Never deleted, only marked revoked)
 */
router.post('/:id/revoke', authenticate, async (req, res, next) => {
  try {
    const { reason = 'Revoked by patient or authorized representative' } = req.body;
    const consent = await Consent.findById(req.params.id);

    if (!consent) {
      return res.status(404).json({ success: false, message: 'Consent record not found' });
    }

    consent.revokedAt = new Date();
    consent.revokedReason = reason.trim();
    consent.version = (consent.version || 1) + 1;
    await consent.save();

    // If purpose was caregiver access, update caregiver link alertsAllowed
    if (consent.purpose === 'caregiver_access' && consent.grantedTo) {
      await PatientCaregiver.updateMany(
        { patient: consent.patient },
        { $set: { alertsAllowed: false } }
      );
    }

    await logAuditEvent({
      userId: req.user._id,
      action: 'revoke_consent',
      resourceType: 'Consent',
      resourceId: consent._id,
      patientId: consent.patient,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: `Consent for '${consent.purpose}' revoked: ${reason}`
    });

    res.json({
      success: true,
      message: 'Consent revoked successfully. Access has been immediately restricted.',
      data: consent
    });
  } catch (err) {
    next(err);
  }
});

export default router;
