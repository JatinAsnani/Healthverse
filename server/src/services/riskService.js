import { evaluateRisk } from '@healthverse/shared';
import {
  Patient,
  Prescription,
  AdherenceLog,
  RiskAssessment,
  Alert,
  Notification,
  PatientCaregiver,
  Staff
} from '../models/index.js';
import smsAdapter from './smsAdapter.js';
import logger from '../config/logger.js';

/**
 * Perform server-authoritative risk assessment on a symptom report or adherence update
 * @param {Object} params
 * @param {string} params.patientId
 * @param {Object} [params.symptomReport]
 * @param {Object} [params.deviceAssessment] - Optional offline assessment result sent by client
 * @param {string} [params.deviceId]
 * @returns {Promise<Object>} Assessment document and Alert (if generated)
 */
export async function performServerRiskAssessment({
  patientId,
  symptomReport = null,
  deviceAssessment = null,
  deviceId = 'web-client'
}) {
  const patient = await Patient.findById(patientId).populate('hospital primaryDoctor primaryCHW');
  if (!patient) {
    throw new Error(`Patient ${patientId} not found`);
  }

  // Load patient prescriptions & recent adherence logs (last 7 days)
  const [prescriptions, adherenceLogs] = await Promise.all([
    Prescription.find({ patient: patient._id }),
    AdherenceLog.find({ patient: patient._id }).sort({ dueAt: -1 }).limit(30)
  ]);

  const symptoms = symptomReport?.symptoms || [];
  const vitals = symptomReport?.vitals || {};

  // Authoritative server evaluation using shared engine
  const serverResult = evaluateRisk({
    symptoms,
    vitals,
    adherenceLogs,
    prescriptions,
    assessedOn: 'server'
  });

  // Check for discrepancy if device sent an assessment
  let isDiscrepancy = false;
  if (deviceAssessment && deviceAssessment.riskLevel) {
    if (deviceAssessment.riskLevel !== serverResult.riskLevel) {
      isDiscrepancy = true;
      logger.warn(`Risk assessment discrepancy for patient ${patient.patientId}: Device='${deviceAssessment.riskLevel}', Server='${serverResult.riskLevel}'`);
    }
  }

  // Save authoritative RiskAssessment
  const assessmentDoc = await RiskAssessment.create({
    report: symptomReport?._id,
    patient: patient._id,
    riskLevel: serverResult.riskLevel,
    redFlags: serverResult.redFlags,
    rulesFired: serverResult.rulesFired,
    assessedOn: 'server',
    rulesetVersion: serverResult.rulesetVersion,
    explanation: serverResult.explanation,
    suggestedAction: serverResult.suggestedAction,
    isDiscrepancy,
    deviceAssessment: deviceAssessment ? {
      riskLevel: deviceAssessment.riskLevel,
      redFlags: deviceAssessment.redFlags,
      rulesFired: deviceAssessment.rulesFired,
      explanation: deviceAssessment.explanation,
      assessedAt: deviceAssessment.assessedAt || new Date()
    } : undefined,
    deviceId,
    syncStatus: 'synced'
  });

  let createdAlert = null;

  // Medium creates follow-up notification/suggestion
  if (serverResult.riskLevel === 'medium') {
    if (patient.primaryCHW?.user) {
      await Notification.create({
        recipient: patient.primaryCHW.user,
        patient: patient._id,
        channel: 'in_app',
        type: 'followup_reminder',
        payload: {
          title: `Follow-up Suggested: ${patient.name}`,
          message: `Medium risk indicators reported for ${patient.name} (${patient.patientId}). Please plan a home or phone check-in.`,
          link: `/patient/${patient._id}`
        }
      });
    }
  }

  // High & Critical create an Alert for hospital dashboard
  if (serverResult.riskLevel === 'high' || serverResult.riskLevel === 'critical') {
    createdAlert = await Alert.create({
      assessment: assessmentDoc._id,
      patient: patient._id,
      hospital: patient.hospital?._id || patient.hospital,
      riskLevel: serverResult.riskLevel,
      status: 'open',
      escalationLevel: 0,
      assignedTo: patient.primaryDoctor?._id
    });

    // Notify attending doctor and nurses in-app
    const hospitalStaff = await Staff.find({
      hospital: patient.hospital?._id || patient.hospital,
      role: { $in: ['doctor', 'nurse'] }
    });

    for (const staff of hospitalStaff) {
      await Notification.create({
        recipient: staff.user,
        patient: patient._id,
        channel: 'in_app',
        type: 'critical_alert',
        payload: {
          title: `[${serverResult.riskLevel.toUpperCase()} ALERT] Patient ${patient.name}`,
          message: `${serverResult.redFlags.join(', ')}. Action: ${serverResult.suggestedAction}`,
          link: `/clinician/alerts`
        }
      });
    }

    // Emergency SMS to permitted caregivers
    const permittedCaregivers = await PatientCaregiver.find({
      patient: patient._id,
      alertsAllowed: true
    }).populate('caregiver');

    for (const pc of permittedCaregivers) {
      if (pc.caregiver?.phone) {
        await smsAdapter.sendSMS({
          to: pc.caregiver.phone,
          message: `[HealthVerse Alert] Important health update for ${patient.name}. Symptoms: ${serverResult.redFlags.join(', ')}. Please contact attending hospital or call 108 if in emergency.`,
          templateId: 'DLT_HEALTH_ALERT_01'
        });
      }
    }
  }

  return {
    assessment: assessmentDoc,
    alert: createdAlert,
    evaluation: serverResult
  };
}

export default {
  performServerRiskAssessment
};
