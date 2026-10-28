import mongoose from 'mongoose';

const followupSchema = new mongoose.Schema({
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
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  scheduledAt: {
    type: Date,
    required: true
  },
  completedAt: {
    type: Date
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'missed', 'rescheduled'],
    default: 'scheduled'
  },
  type: {
    type: String,
    enum: ['in_person', 'home_visit_chw', 'telephonic'],
    default: 'in_person'
  },
  notes: {
    type: String,
    trim: true
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

export const Followup = mongoose.model('Followup', followupSchema);
export default Followup;
