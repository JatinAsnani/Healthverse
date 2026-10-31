import cron from 'node-cron';
import { Alert, Staff, Notification, Followup } from '../models/index.js';
import logger from '../config/logger.js';

const CRITICAL_ESCALATION_MINS = Number(process.env.ESCALATION_CRITICAL_MINUTES || 15);
const HIGH_ESCALATION_MINS = Number(process.env.ESCALATION_HIGH_MINUTES || 60);

export function initializeScheduler() {
  logger.info('Initializing Node-Cron HealthVerse Schedulers...');

  // 1. Alert Escalation Job: Runs every minute
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const criticalCutoff = new Date(now.getTime() - CRITICAL_ESCALATION_MINS * 60 * 1000);
      const highCutoff = new Date(now.getTime() - HIGH_ESCALATION_MINS * 60 * 1000);

      // Find unacknowledged critical alerts older than 15 mins (at escalationLevel < 2)
      const pendingCritical = await Alert.find({
        status: 'open',
        riskLevel: 'critical',
        createdAt: { $lte: criticalCutoff },
        escalationLevel: { $lt: 2 }
      }).populate('patient hospital');

      // Find unacknowledged high alerts older than 60 mins
      const pendingHigh = await Alert.find({
        status: 'open',
        riskLevel: 'high',
        createdAt: { $lte: highCutoff },
        escalationLevel: { $lt: 2 }
      }).populate('patient hospital');

      const alertsToEscalate = [...pendingCritical, ...pendingHigh];

      for (const alert of alertsToEscalate) {
        const newLevel = (alert.escalationLevel || 0) + 1;
        alert.escalationLevel = newLevel;
        alert.status = 'escalated';
        alert.escalatedAt = now;

        // Find escalation target: Hospital Admin if level 2, or another Doctor if level 1
        let escalationTarget = null;
        if (newLevel >= 2) {
          escalationTarget = await Staff.findOne({
            hospital: alert.hospital._id,
            role: 'hospital_admin'
          });
        } else {
          // Alternative doctor in same hospital
          escalationTarget = await Staff.findOne({
            hospital: alert.hospital._id,
            role: 'doctor',
            _id: { $ne: alert.assignedTo }
          });
        }

        if (escalationTarget) {
          alert.assignedTo = escalationTarget._id;
        }

        await alert.save();

        logger.warn(`[ESCALATION TRIGGERED] Alert ${alert._id} (${alert.riskLevel}) escalated to Level ${newLevel} for hospital ${alert.hospital.name}`);

        // In-app notification to escalated staff
        if (escalationTarget?.user) {
          await Notification.create({
            recipient: escalationTarget.user,
            patient: alert.patient._id,
            channel: 'in_app',
            type: 'escalation',
            payload: {
              title: `[ESCALATED ${alert.riskLevel.toUpperCase()} ALERT] Patient ${alert.patient.name}`,
              message: `Unacknowledged ${alert.riskLevel} alert for patient ${alert.patient.name} has been escalated to you for urgent review.`,
              link: '/clinician/alerts'
            }
          });
        }
      }
    } catch (err) {
      logger.error(`Error in alert escalation cron job: ${err.message}`);
    }
  });

  // 2. Medication & Follow-up Reminders Job: Runs every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    try {
      const now = new Date();
      // Generate daily notifications for patients having follow-ups tomorrow
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const dayAfter = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const upcomingFollowups = await Followup.find({
        status: 'scheduled',
        scheduledAt: { $gte: tomorrow, $lte: dayAfter }
      }).populate('patient discharge');

      for (const fu of upcomingFollowups) {
        if (!fu.patient?.user) continue;

        const existingNotif = await Notification.findOne({
          recipient: fu.patient.user,
          type: 'followup_reminder',
          createdAt: { $gte: new Date(now.getTime() - 24 * 3600 * 1000) }
        });

        if (!existingNotif) {
          await Notification.create({
            recipient: fu.patient.user,
            patient: fu.patient._id,
            channel: 'in_app',
            type: 'followup_reminder',
            payload: {
              title: 'Upcoming Hospital Follow-up Appointment',
              message: `Reminder: You have a scheduled follow-up on ${new Date(fu.scheduledAt).toLocaleDateString()} at the clinic.`,
              link: '/patient/timeline'
            }
          });
        }
      }
    } catch (err) {
      logger.error(`Error in reminders cron job: ${err.message}`);
    }
  });

  logger.info('Node-Cron Schedulers started successfully.');
}

export default initializeScheduler;
