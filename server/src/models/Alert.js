import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RiskAssessment',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['medium', 'high', 'critical'],
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'acknowledged', 'resolved', 'escalated'],
    default: 'open'
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  clinicianDecision: {
    actionTaken: {
      type: String,
      enum: ['medication_adjusted', 'emergency_transfer', 'in_person_visit_scheduled', 'telephonic_reassurance', 'admitted', 'other']
    },
    notes: String,
    decisionTime: Date
  },
  acknowledgedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  escalatedAt: {
    type: Date
  },
  escalationLevel: {
    type: Number,
    default: 0 // 0 = normal, 1 = escalated to next doctor, 2 = escalated to hospital admin
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  }
}, {
  timestamps: true
});

alertSchema.index({ hospital: 1, status: 1, createdAt: -1 });
alertSchema.index({ patient: 1, createdAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
