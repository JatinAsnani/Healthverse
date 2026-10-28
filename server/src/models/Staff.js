import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  role: {
    type: String,
    enum: ['doctor', 'nurse', 'chw', 'hospital_admin'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  specialization: {
    type: String,
    trim: true
  },
  assignedPatients: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  }],
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export const Staff = mongoose.model('Staff', staffSchema);
export default Staff;
