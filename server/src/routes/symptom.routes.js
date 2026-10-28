import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requirePatientAccess } from '../middleware/rbac.js';
import { SymptomReport, RiskAssessment, Patient } from '../models/index.js';
import { performServerRiskAssessment } from '../services/riskService.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * @route GET /api/v1/symptoms/patient/:patientId
 * @desc Get symptom report history for a patient
 */
router.get('/patient/:patientId', authenticate, requirePatientAccess('patientId'), async (req, res, next) => {
  try {
    const reports = await SymptomReport.find({ patient: req.targetPatient._id })
      .populate('reportedBy', 'role phone')
      .sort({ reportedAt: -1 })
      .limit(30);

    // Also get corresponding risk assessments
    const assessments = await RiskAssessment.find({ patient: req.targetPatient._id })
      .sort({ createdAt: -1 })
      .limit(30);

    await logAuditEvent({
      userId: req.user._id,
      action: 'read',
      resourceType: 'SymptomReport',
      patientId: req.targetPatient._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: 'Symptom reports retrieved'
    });

    res.json({
      success: true,
      count: reports.length,
      data: {
        reports,
        assessments
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/v1/symptoms
 * @desc Log a symptom report with vitals and run authoritative risk assessment
 */
router.post(
  '/',
  authenticate,
  [
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('symptoms').isArray().withMessage('Symptoms must be an array')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        patientId,
        symptoms = [],
        vitals = {},
        deviceAssessment = null,
        clientUuid,
        deviceId = 'web-client',
        reportedAt
      } = req.body;

      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      // Create symptom report
      const report = await SymptomReport.create({
        patient: patient._id,
        reportedBy: req.user._id,
        symptoms,
        vitals,
        reportedAt: reportedAt ? new Date(reportedAt) : new Date(),
        clientUuid,
        deviceId,
        syncStatus: 'synced'
      });

      // Run authoritative server risk evaluation
      const { assessment, alert, evaluation } = await performServerRiskAssessment({
        patientId: patient._id,
        symptomReport: report,
        deviceAssessment,
        deviceId
      });

      await logAuditEvent({
        userId: req.user._id,
        action: 'create',
        resourceType: 'SymptomReport',
        resourceId: report._id,
        patientId: patient._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Symptom report logged with risk level '${evaluation.riskLevel}' (${evaluation.redFlags.length} red flags)`
      });

      res.status(201).json({
        success: true,
        message: 'Symptom report evaluated successfully',
        data: {
          report,
          assessment,
          alert,
          guidance: {
            riskLevel: evaluation.riskLevel,
            suggestedAction: evaluation.suggestedAction,
            explanation: evaluation.explanation,
            redFlags: evaluation.redFlags,
            emergencyNotice: evaluation.riskLevel === 'critical'
              ? 'EMERGENCY: Call 108 immediately or proceed to nearest hospital emergency.'
              : null
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
