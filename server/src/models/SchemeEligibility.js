import mongoose from 'mongoose';

const schemeEligibilitySchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  scheme: {
    type: String,
    enum: ['PM-JAY'],
    default: 'PM-JAY',
    required: true
  },
  result: {
    type: String,
    enum: ['likely_eligible', 'not_eligible', 'needs_verification'],
    required: true
  },
  reasons: [{
    type: String
  }],
  questionnaireResponses: {
    hasAyushmanCard: Boolean,
    rationCardType: String, // 'bpl_antyodaya', 'state_bpl', 'apl', 'none'
    ruralDeprivationCriteria: [String], // e.g. 'one_room_kuccha', 'female_headed', 'sc_st', 'landless_manual'
    urbanOccupationCriteria: [String], // e.g. 'rag_picker', 'domestic_worker', 'street_vendor', 'construction'
    annualFamilyIncomeUnder2_5Lakh: Boolean
  },
  nextSteps: [{
    type: String
  }],
  checkedAt: {
    type: Date,
    default: Date.now
  },
  checkedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  disclaimer: {
    type: String,
    default: 'This screening is guidance only and not an official government determination. For official enrollment, visit your nearest Ayushman Mitra at any empaneled hospital or CSC center.'
  }
}, {
  timestamps: true
});

export const SchemeEligibility = mongoose.model('SchemeEligibility', schemeEligibilitySchema);
export default SchemeEligibility;
