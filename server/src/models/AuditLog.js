import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  action: {
    type: String,
    enum: ['read', 'create', 'update', 'delete', 'export', 'revoke_consent', 'sync'],
    required: true
  },
  resourceType: {
    type: String,
    enum: [
      'Patient',
      'Discharge',
      'Prescription',
      'AdherenceLog',
      'SymptomReport',
      'RiskAssessment',
      'Alert',
      'Followup',
      'Investigation',
      'Consent',
      'SchemeEligibility',
      'SyncLog'
    ],
    required: true
  },
  resourceId: {
    type: mongoose.Schema.Types.Mixed
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  ip: {
    type: String,
    default: '127.0.0.1'
  },
  userAgent: {
    type: String
  },
  details: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

auditLogSchema.index({ patient: 1, timestamp: -1 });
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, timestamp: -1 });

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
