import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient'
  },
  channel: {
    type: String,
    enum: ['in_app', 'sms', 'push'],
    default: 'in_app'
  },
  type: {
    type: String,
    enum: [
      'medication_reminder',
      'followup_reminder',
      'investigation_reminder',
      'critical_alert',
      'escalation',
      'general'
    ],
    required: true
  },
  payload: {
    title: {
      type: String,
      required: true
    },
    message: {
      type: String,
      required: true
    },
    link: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'read'],
    default: 'pending'
  },
  scheduledFor: {
    type: Date,
    default: Date.now
  },
  sentAt: {
    type: Date
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

notificationSchema.index({ recipient: 1, status: 1, scheduledFor: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
