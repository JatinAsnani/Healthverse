import mongoose from 'mongoose';

const investigationSchema = new mongoose.Schema({
  discharge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discharge',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  testName: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['ordered', 'collected', 'resulted'],
    default: 'ordered'
  },
  orderedDate: {
    type: Date,
    default: Date.now
  },
  sampleCollectedDate: {
    type: Date
  },
  result: {
    type: String,
    trim: true
  },
  resultValue: {
    type: String
  },
  normalRange: {
    type: String
  },
  isAbnormal: {
    type: Boolean,
    default: false
  },
  resultedAt: {
    type: Date
  },
  instructions: {
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

export const Investigation = mongoose.model('Investigation', investigationSchema);
export default Investigation;
