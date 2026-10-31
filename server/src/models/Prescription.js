import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  discharge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discharge',
    required: false
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  medicine: {
    type: String,
    required: true,
    trim: true
  },
  dosage: {
    type: String,
    required: true,
    trim: true
  },
  schedule: {
    timesPerDay: {
      type: Number,
      required: true,
      default: 1
    },
    timings: [{
      time: String, // e.g. "08:00", "14:00", "20:00"
      label: String // e.g. "Morning", "Afternoon", "Night"
    }],
    foodTiming: {
      type: String,
      enum: ['before_food', 'after_food', 'with_food', 'empty_stomach', 'anytime'],
      default: 'after_food'
    }
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  critical: {
    type: Boolean,
    default: false
  },
  purpose: {
    type: String,
    trim: true
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

export const Prescription = mongoose.model('Prescription', prescriptionSchema);
export default Prescription;
