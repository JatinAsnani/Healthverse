import { Patient, PatientCaregiver, Consent } from '../models/index.js';

/**
 * Restrict endpoint to specific roles
 * @param  {...string} roles - e.g. 'doctor', 'nurse', 'hospital_admin'
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: role '${req.user.role}' does not have permission for this resource.`
      });
    }
    next();
  };
}

/**
 * Enforce data access boundaries for patient health records
 * - Patient: own data only
 * - Caregiver: only linked patients with active consent
 * - Doctor/Nurse: patients belonging to their hospital
 * - CHW: patients belonging to their hospital / assigned patients
 * - Hospital Admin: patients belonging to their hospital
 * @param {string} paramKey - URL parameter containing patient ID (e.g. 'patientId' or 'id')
 */
export function requirePatientAccess(paramKey = 'patientId') {
  return async (req, res, next) => {
    try {
      const patientId = req.params[paramKey] || req.query[paramKey] || req.body[paramKey];

      if (!patientId) {
        return res.status(400).json({ success: false, message: 'Patient identifier is required' });
      }

      const patient = await Patient.findById(patientId);
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      req.targetPatient = patient;

      // 1. Patient: own data only
      if (req.user.role === 'patient') {
        if (patient.user.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Patients may only access their own health records.'
          });
        }
        return next();
      }

      // 2. Caregiver: must be linked and have unrevoked consent
      if (req.user.role === 'caregiver') {
        if (!req.caregiver) {
          return res.status(403).json({ success: false, message: 'Caregiver profile not found.' });
        }

        const link = await PatientCaregiver.findOne({
          patient: patient._id,
          caregiver: req.caregiver._id
        });

        if (!link) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: You are not a linked caregiver for this patient.'
          });
        }

        // DPDP Check: Verify active consent for caregiver access
        const activeConsent = await Consent.findOne({
          patient: patient._id,
          purpose: 'caregiver_access',
          revokedAt: null
        });

        if (!activeConsent) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Patient has not granted active consent for caregiver access.'
          });
        }

        req.caregiverLink = link;
        return next();
      }

      // 3. Clinicians (doctor, nurse, hospital_admin, chw)
      if (['doctor', 'nurse', 'hospital_admin', 'chw'].includes(req.user.role)) {
        if (!req.staff || !req.staff.hospital) {
          return res.status(403).json({ success: false, message: 'Staff hospital assignment not found.' });
        }

        // Scope to staff's hospital
        const staffHospitalId = req.staff.hospital._id ? req.staff.hospital._id.toString() : req.staff.hospital.toString();
        const patientHospitalId = patient.hospital.toString();

        if (staffHospitalId !== patientHospitalId) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Patient is under care of another hospital facility.'
          });
        }

        return next();
      }

      return res.status(403).json({ success: false, message: 'Unauthorized role access.' });
    } catch (err) {
      return res.status(500).json({ success: false, message: `Access validation error: ${err.message}` });
    }
  };
}

export default {
  requireRole,
  requirePatientAccess
};
