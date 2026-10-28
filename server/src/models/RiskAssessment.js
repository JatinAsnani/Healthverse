import mongoose from 'mongoose';

const riskAssessmentSchema = new mongoose.Schema({
  report: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SymptomReport'
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true
  },
  redFlags: [{
    type: String
  }],
  rulesFired: [{
    type: String
  }],
  assessedOn: {
    type: String,
    enum: ['device', 'server'],
    default: 'server'
  },
  rulesetVersion: {
    type: String,
    default: '1.0.0'
  },
  explanation: {
    type: String,
    required: true
  },
  suggestedAction: {
    type: String
  },
  // If device and server differed
  isDiscrepancy: {
    type: Boolean,
    default: false
  },
  deviceAssessment: {
    riskLevel: String,
    redFlags: [String],
    rulesFired: [String],
    explanation: String,
    assessedAt: Date
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

riskAssessmentSchema.index({ patient: 1, createdAt: -1 });

export const RiskAssessment = mongoose.model('RiskAssessment', riskAssessmentSchema);
export default RiskAssessment;
