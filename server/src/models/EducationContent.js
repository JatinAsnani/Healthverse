import mongoose from 'mongoose';

const educationContentSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: true,
    enum: [
      'wound_care',
      'medication_adherence',
      'nutrition_recovery',
      'warning_signs',
      'hypertension_care',
      'diabetes_management',
      'breathing_exercises',
      'pmjay_benefits'
    ]
  },
  language: {
    type: String,
    enum: ['en', 'hi', 'gu'],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  summary: {
    type: String,
    required: true
  },
  body: {
    type: String,
    required: true
  },
  tags: [{
    type: String
  }],
  category: {
    type: String,
    default: 'post_discharge'
  },
  readingTimeMinutes: {
    type: Number,
    default: 3
  },
  icon: {
    type: String,
    default: 'HeartPulse'
  }
}, {
  timestamps: true
});

educationContentSchema.index({ topic: 1, language: 1 });

export const EducationContent = mongoose.model('EducationContent', educationContentSchema);
export default EducationContent;
