import Dexie from 'dexie';
import { encryptAtRest } from '../utils/webCrypto.js';

export const db = new Dexie('HealthVerseOfflineDB');

db.version(1).stores({
  syncQueue: '++id, clientUuid, collection, syncStatus, createdAt',
  adherenceLogs: 'clientUuid, prescriptionId, patientId, dueAt, syncStatus, createdAt',
  symptomReports: 'clientUuid, patientId, reportedAt, syncStatus, createdAt',
  patients: 'clientUuid, patientId, phone, syncStatus, updatedAt',
  prescriptions: 'id, patientId, critical, syncStatus',
  followups: 'id, patientId, scheduledAt, status, syncStatus',
  investigations: 'id, patientId, status, syncStatus',
  educationCache: 'id, topic, language'
});

/**
 * Generate a random UUIDv4 for offline records
 */
export function generateClientUuid() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return 'offline-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Save an adherence log locally to IndexedDB and queue it for sync
 */
export async function saveAdherenceOffline({ prescriptionId, patientId, dueAt, status, notes = '' }) {
  const clientUuid = generateClientUuid();
  const record = {
    clientUuid,
    prescriptionId,
    patientId,
    dueAt: new Date(dueAt).toISOString(),
    takenAt: status === 'taken' ? new Date().toISOString() : null,
    status,
    notes,
    syncStatus: 'pending',
    createdAt: new Date().toISOString()
  };

  // Encrypt sensitive notes/payload at rest
  const encryptedPayload = await encryptAtRest(record);

  await db.transaction('rw', db.adherenceLogs, db.syncQueue, async () => {
    await db.adherenceLogs.put({
      ...record,
      encryptedData: encryptedPayload
    });

    await db.syncQueue.put({
      clientUuid,
      collection: 'adherence',
      data: record,
      syncStatus: 'pending',
      createdAt: new Date().toISOString()
    });
  });

  return record;
}

/**
 * Save a symptom report locally to IndexedDB and queue it for sync
 */
export async function saveSymptomReportOffline({ patientId, symptoms, vitals, deviceAssessment }) {
  const clientUuid = generateClientUuid();
  const record = {
    clientUuid,
    patientId,
    symptoms,
    vitals,
    deviceAssessment,
    reportedAt: new Date().toISOString(),
    syncStatus: 'pending',
    createdAt: new Date().toISOString()
  };

  const encryptedPayload = await encryptAtRest(record);

  await db.transaction('rw', db.symptomReports, db.syncQueue, async () => {
    await db.symptomReports.put({
      ...record,
      encryptedData: encryptedPayload
    });

    await db.syncQueue.put({
      clientUuid,
      collection: 'symptoms',
      data: record,
      syncStatus: 'pending',
      createdAt: new Date().toISOString()
    });
  });

  return record;
}

/**
 * Save patient registration locally (CHW offline workflow)
 */
export async function savePatientOffline({ name, phone, dob, gender, language, address, medicalHistory }) {
  const clientUuid = generateClientUuid();
  const record = {
    clientUuid,
    name,
    phone,
    dob,
    gender,
    language,
    address,
    medicalHistory,
    syncStatus: 'pending',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  const encryptedPayload = await encryptAtRest(record);

  await db.transaction('rw', db.patients, db.syncQueue, async () => {
    await db.patients.put({
      ...record,
      encryptedData: encryptedPayload
    });

    await db.syncQueue.put({
      clientUuid,
      collection: 'patients',
      data: record,
      syncStatus: 'pending',
      createdAt: new Date().toISOString()
    });
  });

  return record;
}

/**
 * Get all pending queue records count
 */
export async function getPendingSyncCount() {
  return db.syncQueue.where('syncStatus').equals('pending').count();
}

export default db;
