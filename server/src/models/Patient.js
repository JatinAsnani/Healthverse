import mongoose from 'mongoose';
import { encryptField, decryptField } from '../utils/crypto.js';

const patientSchema = new mongoose.Schema({
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
  patientId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dob: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  language: {
    type: String,
    enum: ['en', 'hi', 'gu'],
    default: 'en'
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  // Sensitive field encrypted at rest
  address: {
    type: String,
    set: (val) => encryptField(val),
    get: (val) => decryptField(val, true)
  },
  // Sensitive field encrypted at rest (e.g. chronic conditions, past surgeries, allergies)
  medicalHistory: {
    type: String,
    default: '[]',
    set: (val) => encryptField(val),
    get: (val) => decryptField(val, true)
  },
  // Sensitive eligibility information (e.g. ration card, income group, SECC)
  eligibilityInfo: {
    type: String,
    default: '{}',
    set: (val) => encryptField(val),
    get: (val) => decryptField(val, true)
  },
  primaryDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  primaryCHW: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  // Offline-writable fields
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
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

export const Patient = mongoose.model('Patient', patientSchema);
export default Patient;
