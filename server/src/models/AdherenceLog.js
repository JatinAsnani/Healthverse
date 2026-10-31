import mongoose from 'mongoose';

const adherenceLogSchema = new mongoose.Schema({
  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  dueAt: {
    type: Date,
    required: true
  },
  takenAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['taken', 'missed', 'skipped'],
    required: true
  },
  loggedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notes: {
    type: String,
    trim: true
  },
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

adherenceLogSchema.index({ patient: 1, dueAt: -1 });
adherenceLogSchema.index({ prescription: 1, dueAt: -1 });

export const AdherenceLog = mongoose.model('AdherenceLog', adherenceLogSchema);
export default AdherenceLog;
