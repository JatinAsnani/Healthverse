import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  facilityCode: {
    type: String,
    trim: true,
    unique: true
  },
  address: {
    street: String,
    district: String,
    state: String,
    pincode: String
  },
  contactPhone: String,
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

export const Hospital = mongoose.model('Hospital', hospitalSchema);
export default Hospital;
