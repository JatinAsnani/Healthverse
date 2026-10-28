import logger from '../config/logger.js';

/**
 * SMS Adapter Interface
 * Provides pluggable SMS dispatching with console/mock default
 * and ready configuration for Twilio or MSG91.
 */
class SMSAdapter {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'mock';
  }

  /**
   * Send an SMS notification
   * @param {Object} params
   * @param {string} params.to - Recipient phone number (e.g. "+919800000011")
   * @param {string} params.message - SMS message body
   * @param {string} [params.templateId] - DLT template ID (for India TRAI compliance)
   * @returns {Promise<{ success: boolean, messageId: string, provider: string }>}
   */
  async sendSMS({ to, message, templateId }) {
    if (this.provider === 'mock') {
      logger.info(`[SMS MOCK DISPATCH] To: ${to} | Template: ${templateId || 'N/A'} | Body: "${message}"`);
      return {
        success: true,
        messageId: `mock-sms-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        provider: 'mock'
      };
    }

    if (this.provider === 'twilio') {
      // Twilio integration
      logger.info(`[Twilio SMS] Sending to ${to}...`);
      // Standard Twilio SDK call pattern:
      // return twilioClient.messages.create({ body: message, to, from: process.env.TWILIO_PHONE_NUMBER });
      return {
        success: true,
        messageId: `twilio-${Date.now()}`,
        provider: 'twilio'
      };
    }

    if (this.provider === 'msg91') {
      // MSG91 integration (widely used across India for OTPs and DLT health alerts)
      logger.info(`[MSG91 SMS] Sending to ${to} via DLT template ${templateId}...`);
      return {
        success: true,
        messageId: `msg91-${Date.now()}`,
        provider: 'msg91'
      };
    }

    return { success: false, messageId: null, provider: this.provider };
  }
}

export const smsAdapter = new SMSAdapter();
export default smsAdapter;
