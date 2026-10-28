import mongoose from 'mongoose';

const caregiverSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  language: {
    type: String,
    enum: ['en', 'hi', 'gu'],
    default: 'en'
  }
}, {
  timestamps: true
});

export const Caregiver = mongoose.model('Caregiver', caregiverSchema);
export default Caregiver;
