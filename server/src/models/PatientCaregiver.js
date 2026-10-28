import mongoose from 'mongoose';

const patientCaregiverSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  caregiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Caregiver',
    required: true
  },
  relationship: {
    type: String,
    enum: ['spouse', 'child', 'parent', 'sibling', 'relative', 'guardian', 'neighbor', 'other'],
    required: true
  },
  alertsAllowed: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

patientCaregiverSchema.index({ patient: 1, caregiver: 1 }, { unique: true });

export const PatientCaregiver = mongoose.model('PatientCaregiver', patientCaregiverSchema);
export default PatientCaregiver;
