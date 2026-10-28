import { AuditLog } from '../models/index.js';
import logger from '../config/logger.js';

/**
 * Record an audit log entry for DPDP Act 2023 compliance
 * @param {Object} params
 * @param {string} params.userId
 * @param {string} params.action - 'read' | 'create' | 'update' | 'delete' | 'export' | 'revoke_consent' | 'sync'
 * @param {string} params.resourceType - 'Patient' | 'Discharge' | 'Prescription' | 'AdherenceLog' etc.
 * @param {string} [params.resourceId]
 * @param {string} [params.patientId]
 * @param {string} [params.ip]
 * @param {string} [params.userAgent]
 * @param {string} [params.details]
 */
export async function logAuditEvent({
  userId,
  action,
  resourceType,
  resourceId,
  patientId,
  ip = '127.0.0.1',
  userAgent = '',
  details = ''
}) {
  try {
    await AuditLog.create({
      user: userId || null,
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : undefined,
      patient: patientId || null,
      ip,
      userAgent,
      details,
      timestamp: new Date()
    });
  } catch (err) {
    // Non-blocking log failure
    logger.error(`Audit logging failed: ${err.message}`);
  }
}

export default logAuditEvent;
