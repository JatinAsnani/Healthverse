import mongoose from 'mongoose';

const symptomItemSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    enum: [
      'chest_pain',
      'breathlessness',
      'fever',
      'bleeding',
      'wound_discharge',
      'confusion',
      'persistent_vomiting',
      'reduced_urine_output',
      'headache',
      'dizziness',
      'swelling_legs',
      'cough',
      'fatigue',
      'other'
    ]
  },
  severity: {
    type: Number,
    min: 0,
    max: 3,
    required: true
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const vitalsSchema = new mongoose.Schema({
  temperature: Number, // in Celsius
  pulse: Number, // bpm
  spo2: Number, // percentage
  bloodPressure: {
    systolic: Number,
    diastolic: Number
  }
}, { _id: false });

const symptomReportSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  symptoms: [symptomItemSchema],
  vitals: vitalsSchema,
  reportedAt: {
    type: Date,
    default: Date.now
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

symptomReportSchema.index({ patient: 1, reportedAt: -1 });

export const SymptomReport = mongoose.model('SymptomReport', symptomReportSchema);
export default SymptomReport;
