import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import {
  Hospital,
  Staff,
  User,
  Patient,
  Discharge,
  AdherenceLog,
  Alert,
  Followup,
  RiskAssessment,
  SyncLog,
  AuditLog
} from '../models/index.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

// All routes require hospital_admin role
router.use(authenticate, requireRole('hospital_admin'));

/**
 * @route GET /api/v1/admin/analytics
 * @desc Clinical dashboard metrics: adherence, alerts, missed visits, readmission risk, sync health
 */
router.get('/analytics', async (req, res, next) => {
  try {
    const hospitalId = req.staff?.hospital?._id || req.staff?.hospital;

    const [
      totalPatients,
      totalDischarges,
      adherenceLogs,
      openAlerts,
      criticalAlerts,
      alertsByLevelGroup,
      missedFollowups,
      recentRiskAssessments,
      syncLogs
    ] = await Promise.all([
      Patient.countDocuments({ hospital: hospitalId }),
      Discharge.countDocuments({ hospital: hospitalId }),
      AdherenceLog.find().limit(500),
      Alert.countDocuments({ hospital: hospitalId, status: { $in: ['open', 'escalated'] } }),
      Alert.countDocuments({ hospital: hospitalId, riskLevel: 'critical', status: { $in: ['open', 'escalated'] } }),
      Alert.aggregate([
        { $match: { hospital: hospitalId } },
        { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
      ]),
      Followup.countDocuments({ status: 'missed' }),
      RiskAssessment.aggregate([
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$patient', latestRisk: { $first: '$riskLevel' } } },
        { $group: { _id: '$latestRisk', count: { $sum: 1 } } }
      ]),
      SyncLog.find().sort({ syncedAt: -1 }).limit(10)
    ]);

    // Calculate overall adherence percentage
    const totalDoses = adherenceLogs.length;
    const takenDoses = adherenceLogs.filter(l => l.status === 'taken').length;
    const adherenceRate = totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : 100;

    // Format alerts by level
    const alertsByLevel = { medium: 0, high: 0, critical: 0 };
    alertsByLevelGroup.forEach(g => {
      if (alertsByLevel[g._id] !== undefined) {
        alertsByLevel[g._id] = g.count;
      }
    });

    // Format readmission risk distribution
    const readmissionRiskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
    recentRiskAssessments.forEach(g => {
      if (readmissionRiskCounts[g._id] !== undefined) {
        readmissionRiskCounts[g._id] = g.count;
      }
    });

    // Sync health metrics
    const totalRecordsUploaded = syncLogs.reduce((acc, l) => acc + (l.recordsUploaded || 0), 0);
    const totalConflicts = syncLogs.reduce((acc, l) => acc + (l.conflicts?.length || 0), 0);

    res.json({
      success: true,
      analytics: {
        totalPatients,
        totalDischarges,
        adherenceRate,
        openAlerts,
        criticalAlerts,
        alertsByLevel,
        missedFollowups,
        readmissionRiskCounts,
        syncHealth: {
          totalSyncSessions: syncLogs.length,
          totalRecordsUploaded,
          totalConflicts,
          recentSyncLogs: syncLogs
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/v1/admin/staff
 * @desc Get all clinical and community staff for hospital
 */
router.get('/staff', async (req, res, next) => {
  try {
    const hospitalId = req.staff?.hospital?._id || req.staff?.hospital;
    const staffList = await Staff.find({ hospital: hospitalId })
      .populate('user', 'email phone role active language')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: staffList.length, data: staffList });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/v1/admin/staff
 * @desc Register new clinical or field staff member
 */
router.post(
  '/staff',
  [
    body('name').trim().notEmpty().withMessage('Staff name is required'),
    body('phone').trim().notEmpty().withMessage('Contact phone is required'),
    body('role').isIn(['doctor', 'nurse', 'chw', 'hospital_admin']).withMessage('Valid staff role is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, phone, email, role, password, specialization } = req.body;
      const hospitalId = req.staff?.hospital?._id || req.staff?.hospital;

      const existingUser = await User.findOne({ phone: phone.trim() });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'User with this phone already exists' });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        phone: phone.trim(),
        email: email ? email.trim().toLowerCase() : undefined,
        passwordHash,
        role
      });

      const staff = await Staff.create({
        user: user._id,
        hospital: hospitalId,
        role,
        name: name.trim(),
        phone: phone.trim(),
        specialization: specialization?.trim()
      });

      res.status(201).json({
        success: true,
        message: 'Staff member registered successfully',
        data: staff
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route GET /api/v1/admin/audits
 * @desc Get DPDP Act 2023 audit access trail
 */
router.get('/audits', async (req, res, next) => {
  try {
    const audits = await AuditLog.find()
      .populate('user', 'phone role')
      .populate('patient', 'name patientId')
      .sort({ timestamp: -1 })
      .limit(100);

    res.json({ success: true, count: audits.length, data: audits });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/v1/admin/hospital
 * @desc Get current hospital settings
 */
router.get('/hospital', async (req, res, next) => {
  try {
    const hospitalId = req.staff?.hospital?._id || req.staff?.hospital;
    const hospital = await Hospital.findById(hospitalId);
    res.json({ success: true, data: hospital });
  } catch (err) {
    next(err);
  }
});

/**
 * @route PUT /api/v1/admin/hospital
 * @desc Update hospital configuration
 */
router.put('/hospital', async (req, res, next) => {
  try {
    const hospitalId = req.staff?.hospital?._id || req.staff?.hospital;
    const { name, contactPhone, address } = req.body;

    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ success: false, message: 'Hospital not found' });
    }

    if (name) hospital.name = name.trim();
    if (contactPhone) hospital.contactPhone = contactPhone.trim();
    if (address) hospital.address = address;

    await hospital.save();

    res.json({ success: true, message: 'Hospital settings updated', data: hospital });
  } catch (err) {
    next(err);
  }
});

export default router;
