import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole, requirePatientAccess } from '../middleware/rbac.js';
import { Investigation, Notification } from '../models/index.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * @route GET /api/v1/investigations/patient/:patientId
 * @desc Get all investigations for a patient
 */
router.get('/patient/:patientId', authenticate, requirePatientAccess('patientId'), async (req, res, next) => {
  try {
    const investigations = await Investigation.find({ patient: req.targetPatient._id })
      .populate('discharge', 'diagnosis dischargeDate')
      .sort({ orderedDate: -1 });

    await logAuditEvent({
      userId: req.user._id,
      action: 'read',
      resourceType: 'Investigation',
      patientId: req.targetPatient._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: 'Investigation reports list viewed'
    });

    res.json({ success: true, count: investigations.length, data: investigations });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/v1/investigations
 * @desc Order an investigation (Doctor, Nurse)
 */
router.post(
  '/',
  authenticate,
  requireRole('doctor', 'nurse', 'hospital_admin'),
  [
    body('dischargeId').notEmpty().withMessage('Discharge ID is required'),
    body('patientId').notEmpty().withMessage('Patient ID is required'),
    body('testName').notEmpty().withMessage('Investigation test name is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { dischargeId, patientId, testName, instructions } = req.body;

      const investigation = await Investigation.create({
        discharge: dischargeId,
        patient: patientId,
        testName: testName.trim(),
        instructions: instructions?.trim(),
        status: 'ordered',
        syncStatus: 'synced'
      });

      await logAuditEvent({
        userId: req.user._id,
        action: 'create',
        resourceType: 'Investigation',
        resourceId: investigation._id,
        patientId,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Investigation '${testName}' ordered`
      });

      res.status(201).json({
        success: true,
        message: 'Investigation ordered successfully',
        data: investigation
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route PATCH /api/v1/investigations/:id
 * @desc Update investigation status & results (ordered -> collected -> resulted)
 */
router.patch(
  '/:id',
  authenticate,
  requireRole('doctor', 'nurse', 'hospital_admin', 'chw'),
  async (req, res, next) => {
    try {
      const { status, result, resultValue, normalRange, isAbnormal } = req.body;
      const investigation = await Investigation.findById(req.params.id).populate('patient');

      if (!investigation) {
        return res.status(404).json({ success: false, message: 'Investigation not found' });
      }

      if (status) {
        investigation.status = status;
        if (status === 'collected' && !investigation.sampleCollectedDate) {
          investigation.sampleCollectedDate = new Date();
        }
        if (status === 'resulted') {
          investigation.resultedAt = new Date();
        }
      }
      if (result !== undefined) investigation.result = result;
      if (resultValue !== undefined) investigation.resultValue = resultValue;
      if (normalRange !== undefined) investigation.normalRange = normalRange;
      if (isAbnormal !== undefined) investigation.isAbnormal = Boolean(isAbnormal);

      investigation.version = (investigation.version || 1) + 1;
      investigation.updatedAt = new Date();
      await investigation.save();

      // Core Data Flow 6: "Investigations: staff update status and results; patients are notified and results appear in their timeline."
      if (status === 'resulted' && investigation.patient?.user) {
        await Notification.create({
          recipient: investigation.patient.user,
          patient: investigation.patient._id,
          channel: 'in_app',
          type: 'investigation_reminder',
          payload: {
            title: `Lab Result Ready: ${investigation.testName}`,
            message: `Your test result for ${investigation.testName} has been updated by the hospital: ${investigation.result || 'Normal'}`,
            link: `/patient/results`
          },
          status: 'pending'
        });
      }

      await logAuditEvent({
        userId: req.user._id,
        action: 'update',
        resourceType: 'Investigation',
        resourceId: investigation._id,
        patientId: investigation.patient?._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Investigation '${investigation.testName}' updated to status '${status}'`
      });

      res.json({
        success: true,
        message: 'Investigation updated successfully',
        data: investigation
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
