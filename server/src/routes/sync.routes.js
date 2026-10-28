import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  AdherenceLog,
  SymptomReport,
  Patient,
  Followup,
  Consent,
  SyncLog,
  Prescription
} from '../models/index.js';
import { performServerRiskAssessment } from '../services/riskService.js';
import { logAuditEvent } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * @route POST /api/v1/sync
 * @desc Batch sync endpoint accepting queued offline records
 * Deduplicates by clientUuid and applies conflict rules
 */
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { deviceId = 'web-client', records = [] } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({ success: false, message: 'Records must be an array' });
    }

    const results = [];
    const conflicts = [];
    let recordsCreated = 0;
    let recordsMerged = 0;

    for (const item of records) {
      const { collection, clientUuid, data, updatedAt } = item;

      if (!collection || !clientUuid) {
        results.push({
          clientUuid,
          collection,
          status: 'rejected',
          message: 'Missing collection name or clientUuid'
        });
        continue;
      }

      try {
        // 1. Adherence Logs: Append-only, deduplicated by clientUuid
        if (collection === 'adherence') {
          const existing = await AdherenceLog.findOne({ clientUuid });
          if (existing) {
            results.push({
              clientUuid,
              collection,
              status: 'merged',
              serverId: existing._id,
              message: 'Record already synced (deduplicated by clientUuid)'
            });
            recordsMerged++;
            continue;
          }

          const prescription = await Prescription.findById(data.prescription || data.prescriptionId);
          if (!prescription) {
            results.push({
              clientUuid,
              collection,
              status: 'rejected',
              message: 'Associated prescription not found'
            });
            continue;
          }

          const log = await AdherenceLog.create({
            prescription: prescription._id,
            patient: data.patient || data.patientId,
            dueAt: new Date(data.dueAt),
            takenAt: data.takenAt ? new Date(data.takenAt) : undefined,
            status: data.status,
            loggedBy: req.user._id,
            notes: data.notes,
            clientUuid,
            deviceId,
            syncStatus: 'synced'
          });

          // Check if critical medication missed
          if (prescription.critical && (data.status === 'missed' || data.status === 'skipped')) {
            await performServerRiskAssessment({
              patientId: data.patient || data.patientId,
              deviceId
            });
          }

          results.push({
            clientUuid,
            collection,
            status: 'created',
            serverId: log._id,
            message: 'Adherence log synced successfully'
          });
          recordsCreated++;
        }

        // 2. Symptom Reports: Append-only, deduplicated by clientUuid, triggers authoritative risk engine
        else if (collection === 'symptoms') {
          const existing = await SymptomReport.findOne({ clientUuid });
          if (existing) {
            results.push({
              clientUuid,
              collection,
              status: 'merged',
              serverId: existing._id,
              message: 'Symptom report already synced'
            });
            recordsMerged++;
            continue;
          }

          const report = await SymptomReport.create({
            patient: data.patient || data.patientId,
            reportedBy: req.user._id,
            symptoms: data.symptoms || [],
            vitals: data.vitals || {},
            reportedAt: data.reportedAt ? new Date(data.reportedAt) : new Date(),
            clientUuid,
            deviceId,
            syncStatus: 'synced'
          });

          // Authoritative risk evaluation with device discrepancy check
          const assessmentOutcome = await performServerRiskAssessment({
            patientId: data.patient || data.patientId,
            symptomReport: report,
            deviceAssessment: data.deviceAssessment,
            deviceId
          });

          results.push({
            clientUuid,
            collection,
            status: 'created',
            serverId: report._id,
            assessmentId: assessmentOutcome.assessment?._id,
            riskLevel: assessmentOutcome.evaluation.riskLevel,
            alertGenerated: Boolean(assessmentOutcome.alert),
            message: 'Symptom report synced and authoritative risk evaluated'
          });
          recordsCreated++;
        }

        // 3. Patient Registration / Profiles: Last-Write-Wins by updatedAt
        else if (collection === 'patients') {
          const existing = await Patient.findOne({ clientUuid });
          if (existing) {
            const clientDate = new Date(updatedAt || data.updatedAt || 0);
            const serverDate = new Date(existing.updatedAt);

            if (clientDate > serverDate) {
              if (data.name) existing.name = data.name;
              if (data.phone) existing.phone = data.phone;
              if (data.address) existing.address = data.address;
              if (data.medicalHistory) existing.medicalHistory = typeof data.medicalHistory === 'string' ? data.medicalHistory : JSON.stringify(data.medicalHistory);
              existing.version = (existing.version || 1) + 1;
              existing.updatedAt = clientDate;
              await existing.save();

              conflicts.push({
                collectionName: 'Patient',
                clientUuid,
                serverRecordId: existing._id,
                resolution: 'client_merged',
                details: `Patient profile overwritten by newer offline edit (${clientDate.toISOString()})`
              });

              results.push({
                clientUuid,
                collection,
                status: 'merged',
                serverId: existing._id,
                message: 'Patient record updated via Last-Write-Wins'
              });
              recordsMerged++;
            } else {
              conflicts.push({
                collectionName: 'Patient',
                clientUuid,
                serverRecordId: existing._id,
                resolution: 'server_wins',
                details: `Server record was newer (${serverDate.toISOString()} vs client ${clientDate.toISOString()})`
              });

              results.push({
                clientUuid,
                collection,
                status: 'conflict',
                serverId: existing._id,
                message: 'Conflict resolved: Server version is more recent'
              });
            }
            continue;
          }

          // New patient registered offline by CHW
          const patientId = `HV-${Date.now().toString().slice(-6)}`;
          const patient = await Patient.create({
            user: req.user._id,
            hospital: req.staff?.hospital?._id || req.staff?.hospital,
            patientId,
            name: data.name,
            dob: new Date(data.dob || '1990-01-01'),
            gender: data.gender || 'other',
            language: data.language || 'en',
            phone: data.phone,
            address: data.address || '',
            medicalHistory: JSON.stringify(data.medicalHistory || []),
            clientUuid,
            deviceId,
            syncStatus: 'synced'
          });

          results.push({
            clientUuid,
            collection,
            status: 'created',
            serverId: patient._id,
            patientId: patient.patientId,
            message: 'Offline-registered patient created on server'
          });
          recordsCreated++;
        }

        // 4. Follow-up Notes: Clinician-owned data wins, CHW notes append/merge
        else if (collection === 'followups') {
          const existing = await Followup.findOne({
            $or: [{ clientUuid }, { _id: data._id }]
          });

          if (existing) {
            // Append CHW visit note without overriding clinical schedule
            if (data.notes && !existing.notes?.includes(data.notes)) {
              existing.notes = existing.notes ? `${existing.notes} | [Offline CHW]: ${data.notes}` : data.notes;
            }
            if (data.status === 'completed') {
              existing.status = 'completed';
              existing.completedAt = new Date();
            }
            await existing.save();

            results.push({
              clientUuid,
              collection,
              status: 'merged',
              serverId: existing._id,
              message: 'Follow-up notes merged with server record'
            });
            recordsMerged++;
          } else {
            // Clinician-owned data rule: Unrecognized new followups from offline client are flagged
            conflicts.push({
              collectionName: 'Followup',
              clientUuid,
              resolution: 'rejected',
              details: 'Clinician authority: New scheduled follow-ups must originate from authorized clinician'
            });
            results.push({
              clientUuid,
              collection,
              status: 'rejected',
              message: 'Clinician-owned rule: Only clinicians may schedule new follow-ups'
            });
          }
        }

        // 5. Consent: Offline captured consent
        else if (collection === 'consent') {
          const existing = await Consent.findOne({ clientUuid });
          if (existing) {
            results.push({
              clientUuid,
              collection,
              status: 'merged',
              serverId: existing._id,
              message: 'Consent already recorded'
            });
            recordsMerged++;
          } else {
            const consent = await Consent.create({
              patient: data.patient || data.patientId,
              purpose: data.purpose,
              grantedTo: data.grantedTo,
              grantedAt: new Date(data.grantedAt || Date.now()),
              clientUuid,
              deviceId,
              syncStatus: 'synced'
            });

            results.push({
              clientUuid,
              collection,
              status: 'created',
              serverId: consent._id,
              message: 'Consent record synced'
            });
            recordsCreated++;
          }
        }
      } catch (itemErr) {
        results.push({
          clientUuid,
          collection,
          status: 'rejected',
          message: itemErr.message
        });
      }
    }

    // Save SyncLog record
    const syncLog = await SyncLog.create({
      user: req.user._id,
      deviceId,
      recordsUploaded: records.length,
      recordsCreated,
      recordsMerged,
      conflicts,
      syncedAt: new Date()
    });

    await logAuditEvent({
      userId: req.user._id,
      action: 'sync',
      resourceType: 'SyncLog',
      resourceId: syncLog._id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: `Batch sync processed: ${records.length} uploaded, ${recordsCreated} created, ${recordsMerged} merged, ${conflicts.length} conflicts`
    });

    res.json({
      success: true,
      summary: {
        totalReceived: records.length,
        created: recordsCreated,
        merged: recordsMerged,
        conflictsCount: conflicts.length,
        syncedAt: syncLog.syncedAt
      },
      results,
      conflicts
    });
  } catch (err) {
    next(err);
  }
});

export default router;
