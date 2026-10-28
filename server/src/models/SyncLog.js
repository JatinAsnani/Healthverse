import mongoose from 'mongoose';

const syncLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deviceId: {
    type: String,
    required: true
  },
  recordsUploaded: {
    type: Number,
    default: 0
  },
  recordsCreated: {
    type: Number,
    default: 0
  },
  recordsMerged: {
    type: Number,
    default: 0
  },
  conflicts: [{
    collectionName: String,
    clientUuid: String,
    serverRecordId: mongoose.Schema.Types.ObjectId,
    resolution: String, // 'server_wins', 'client_merged', 'rejected'
    details: String
  }],
  syncedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export const SyncLog = mongoose.model('SyncLog', syncLogSchema);
export default SyncLog;
