import mongoose from 'mongoose';

const dischargeSchema = new mongoose.Schema({
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
  dischargeDate: {
    type: Date,
    required: true
  },
  admissionDate: {
    type: Date
  },
  diagnosis: {
    type: String,
    required: true,
    trim: true
  },
  summary: {
    type: String,
    required: true
  },
  instructions: {
    diet: String,
    activity: String,
    warningSigns: [String],
    general: String
  },
  treatingDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'readmitted'],
    default: 'active'
  }
}, {
  timestamps: true
});

export const Discharge = mongoose.model('Discharge', dischargeSchema);
export default Discharge;
