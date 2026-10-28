import mongoose from 'mongoose';

const consentSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  purpose: {
    type: String,
    enum: [
      'caregiver_access',
      'chw_home_monitoring',
      'telephonic_followup',
      'emergency_sms_alerts',
      'clinical_continuity'
    ],
    required: true
  },
  grantedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // e.g. Caregiver user or CHW user
  },
  grantedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  revokedAt: {
    type: Date,
    default: null
  },
  revokedReason: {
    type: String,
    trim: true
  },
  noticeVersion: {
    type: String,
    default: 'DPDP-2023-v1.0'
  },
  // Offline sync fields
  clientUuid: {
    type: String,
    unique: true,
    sparse: true
  },
  version: {
    type: Number,
    default: 1
  },
  deviceId: {
    type: String,
    default: 'web-client'
  },
  syncStatus: {
    type: String,
    enum: ['synced', 'pending', 'conflict'],
    default: 'synced'
  }
}, {
  timestamps: true
});

consentSchema.index({ patient: 1, purpose: 1, revokedAt: 1 });

export const Consent = mongoose.model('Consent', consentSchema);
export default Consent;
