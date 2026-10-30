import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireRole, requirePatientAccess } from '../middleware/rbac.js';
import {
  Patient,
  User,
  Discharge,
  Prescription,
  Followup,
  Investigation,
  SymptomReport,
  RiskAssessment,
  Alert,
  PatientCaregiver,
  Consent,
  AdherenceLog
} from '../models/index.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * @route GET /api/v1/patients
 * @desc Get scoped patient list based on role
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const role = req.user.role;
    let filter = {};

    if (['doctor', 'nurse', 'hospital_admin'].includes(role)) {
      if (!req.staff?.hospital) {
        return res.status(400).json({ success: false, message: 'Hospital context not found' });
      }
      filter.hospital = req.staff.hospital._id || req.staff.hospital;
    } else if (role === 'chw') {
      if (!req.staff?.hospital) {
        return res.status(400).json({ success: false, message: 'Hospital context not found' });
      }
      // CHW sees assigned patients or their hospital
      if (req.staff.assignedPatients && req.staff.assignedPatients.length > 0) {
        filter._id = { $in: req.staff.assignedPatients };
      } else {
        filter.hospital = req.staff.hospital._id || req.staff.hospital;
      }
    } else if (role === 'caregiver') {
      if (!req.caregiver) {
        return res.status(403).json({ success: false, message: 'Caregiver profile not found' });
      }
      const links = await PatientCaregiver.find({ caregiver: req.caregiver._id });
      const patientIds = links.map(l => l.patient);

      // Filter only those with active consent
      const validConsents = await Consent.find({
        patient: { $in: patientIds },
        purpose: 'caregiver_access',
        revokedAt: null
      });
      const consentedPatientIds = validConsents.map(c => c.patient);
      filter._id = { $in: consentedPatientIds };
    } else if (role === 'patient') {
      filter.user = req.user._id;
    }

    const { search, riskLevel } = req.query;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { patientId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const patients = await Patient.find(filter)
      .populate('primaryDoctor', 'name specialization')
      .populate('primaryCHW', 'name phone')
      .populate('hospital', 'name facilityCode')
      .sort({ updatedAt: -1 })
      .lean();

    // Attach latest risk assessment and open alerts for clinical quick-glance
    const enrichedPatients = await Promise.all(
      patients.map(async (p) => {
        const [latestRisk, openAlert, activeDischarge] = await Promise.all([
          RiskAssessment.findOne({ patient: p._id }).sort({ createdAt: -1 }).lean(),
          Alert.findOne({ patient: p._id, status: { $in: ['open', 'acknowledged', 'escalated'] } })
            .sort({ createdAt: -1 })
            .lean(),
          Discharge.findOne({ patient: p._id, status: 'active' }).sort({ dischargeDate: -1 }).lean()
        ]);

        return {
          ...p,
          latestRisk: latestRisk || { riskLevel: 'low', explanation: 'Baseline' },
          openAlert: openAlert || null,
          activeDischarge: activeDischarge || null
        };
      })
    );

    // Optional risk filter
    let finalResults = enrichedPatients;
    if (riskLevel && riskLevel !== 'all') {
      finalResults = enrichedPatients.filter(p => p.latestRisk?.riskLevel === riskLevel);
    }

    await logAuditEvent({
      userId: req.user._id,
      action: 'read',
      resourceType: 'Patient',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: `Scoped patient list requested (Returned: ${finalResults.length} records)`
    });

    res.json({
      success: true,
      count: finalResults.length,
      data: finalResults
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route GET /api/v1/patients/:id
 * @desc Get complete patient health record and timeline
 */
router.get('/:id', authenticate, requirePatientAccess('id'), async (req, res, next) => {
  try {
    const patient = req.targetPatient;

    const [
      discharges,
      prescriptions,
      followups,
      investigations,
      symptoms,
      riskAssessments,
      alerts,
      caregivers,
      consents,
      adherenceLogs
    ] = await Promise.all([
      Discharge.find({ patient: patient._id }).populate('treatingDoctor', 'name').sort({ dischargeDate: -1 }),
      Prescription.find({ patient: patient._id }).sort({ startDate: -1 }),
      Followup.find({ patient: patient._id }).populate('staff', 'name role specialization phone').sort({ scheduledAt: 1 }),
      Investigation.find({ patient: patient._id }).sort({ orderedDate: -1 }),
      SymptomReport.find({ patient: patient._id }).sort({ reportedAt: -1 }).limit(15),
      RiskAssessment.find({ patient: patient._id }).sort({ createdAt: -1 }).limit(10),
      Alert.find({ patient: patient._id }).populate('reviewer', 'name').sort({ createdAt: -1 }),
      PatientCaregiver.find({ patient: patient._id }).populate('caregiver').lean(),
      Consent.find({ patient: patient._id }).sort({ grantedAt: -1 }),
      AdherenceLog.find({ patient: patient._id }).populate('prescription').sort({ dueAt: -1 }).limit(100)
    ]);

    await logAuditEvent({
      userId: req.user._id,
      action: 'read',
      resourceType: 'Patient',
      resourceId: patient._id,
      patientId: patient._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: `Full clinical chart viewed for patient ${patient.patientId}`
    });

    res.json({
      success: true,
      data: {
        patient,
        discharges,
        prescriptions,
        followups,
        investigations,
        recentSymptoms: symptoms,
        riskAssessments,
        alerts,
        caregivers,
        consents,
        adherenceLogs
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @route POST /api/v1/patients
 * @desc Register a new patient (Doctor, Nurse, Admin, CHW) with consent capture
 */
router.post(
  '/',
  authenticate,
  requireRole('doctor', 'nurse', 'hospital_admin', 'chw'),
  [
    body('name').trim().notEmpty().withMessage('Patient name is required'),
    body('phone').trim().notEmpty().withMessage('Valid contact phone is required'),
    body('dob').notEmpty().withMessage('Date of birth is required'),
    body('gender').isIn(['male', 'female', 'other']).withMessage('Gender is required')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        name,
        phone,
        dob,
        gender,
        language = 'en',
        address = '',
        medicalHistory = [],
        eligibilityInfo = {},
        caregiverPhone,
        caregiverName,
        caregiverRelationship = 'relative',
        clientUuid,
        deviceId = 'web-client'
      } = req.body;

      // Hospital scoping
      const hospitalId = req.staff?.hospital?._id || req.staff?.hospital;
      if (!hospitalId) {
        return res.status(400).json({ success: false, message: 'Hospital context required for registration' });
      }

      // Check if user account already exists with this phone
      let user = await User.findOne({ phone: phone.trim() });
      const rawPassword = (req.body.password && typeof req.body.password === 'string' && req.body.password.trim().length >= 6)
        ? req.body.password.trim()
        : 'password123';
      const passwordHash = await bcrypt.hash(rawPassword, 10);

      if (!user) {
        user = await User.create({
          phone: phone.trim(),
          passwordHash,
          role: 'patient',
          language
        });
      } else if (req.body.password && typeof req.body.password === 'string' && req.body.password.trim().length >= 6) {
        user.passwordHash = passwordHash;
        await user.save();
      }

      const patientId = `HV-${Date.now().toString().slice(-6)}`;

      const patient = await Patient.create({
        user: user._id,
        hospital: hospitalId,
        patientId,
        name: name.trim(),
        dob: new Date(dob),
        gender,
        language,
        phone: phone.trim(),
        address,
        medicalHistory: JSON.stringify(medicalHistory),
        eligibilityInfo: JSON.stringify(eligibilityInfo),
        primaryDoctor: req.user.role === 'doctor' ? req.staff._id : undefined,
        primaryCHW: req.user.role === 'chw' ? req.staff._id : undefined,
        clientUuid,
        deviceId,
        syncStatus: 'synced'
      });

      // If registered by CHW, automatically link to CHW's assigned patients
      if (req.user.role === 'chw') {
        await Staff.findByIdAndUpdate(req.staff._id, {
          $addToSet: { assignedPatients: patient._id }
        });
      }

      // Create initial mandatory consent for clinical continuity
      await Consent.create({
        patient: patient._id,
        purpose: 'clinical_continuity',
        grantedAt: new Date(),
        deviceId
      });

      // Optional Caregiver Link creation if provided
      let linkedCaregiver = null;
      if (caregiverPhone && caregiverName) {
        let cgUser = await User.findOne({ phone: caregiverPhone.trim() });
        if (!cgUser) {
          const defaultPassword = await bcrypt.hash('password123', 10);
          cgUser = await User.create({
            phone: caregiverPhone.trim(),
            passwordHash: defaultPassword,
            role: 'caregiver',
            language
          });
        }

        let cgProfile = await Caregiver.findOne({ user: cgUser._id });
        if (!cgProfile) {
          cgProfile = await Caregiver.create({
            user: cgUser._id,
            name: caregiverName.trim(),
            phone: caregiverPhone.trim(),
            language
          });
        }

        linkedCaregiver = await PatientCaregiver.create({
          patient: patient._id,
          caregiver: cgProfile._id,
          relationship: caregiverRelationship,
          alertsAllowed: true
        });

        // Grant consent for caregiver access
        await Consent.create({
          patient: patient._id,
          purpose: 'caregiver_access',
          grantedTo: cgUser._id,
          grantedAt: new Date(),
          deviceId
        });
      }

      await logAuditEvent({
        userId: req.user._id,
        action: 'create',
        resourceType: 'Patient',
        resourceId: patient._id,
        patientId: patient._id,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: `Patient ${patient.patientId} registered by ${req.user.role} (${req.staff?.name})`
      });

      res.status(201).json({
        success: true,
        message: 'Patient registered successfully',
        data: {
          patient,
          linkedCaregiver
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * @route PUT /api/v1/patients/:id
 * @desc Update patient demographic and medical history
 */
router.put('/:id', authenticate, requirePatientAccess('id'), async (req, res, next) => {
  try {
    const patient = req.targetPatient;
    const { name, phone, address, medicalHistory, eligibilityInfo, language } = req.body;

    if (name) patient.name = name.trim();
    if (phone) patient.phone = phone.trim();
    if (address !== undefined) patient.address = address;
    if (medicalHistory !== undefined) patient.medicalHistory = typeof medicalHistory === 'string' ? medicalHistory : JSON.stringify(medicalHistory);
    if (eligibilityInfo !== undefined) patient.eligibilityInfo = typeof eligibilityInfo === 'string' ? eligibilityInfo : JSON.stringify(eligibilityInfo);
    if (language) patient.language = language;

    patient.version = (patient.version || 1) + 1;
    patient.updatedAt = new Date();
    await patient.save();

    await logAuditEvent({
      userId: req.user._id,
      action: 'update',
      resourceType: 'Patient',
      resourceId: patient._id,
      patientId: patient._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: `Patient details updated by ${req.user.role}`
    });

    res.json({
      success: true,
      message: 'Patient record updated successfully',
      data: patient
    });
  } catch (err) {
    next(err);
  }
});

export default router;
