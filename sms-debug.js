/**
 * SMS Service - Debug Version to fix undefined response
 * Shows the actual response structure from Africa's Talking SDK
 */

const AfricasTalking = require('africastalking');

class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'africas_talking';
    this.apiKey = process.env.SMS_API_KEY;
    this.username = process.env.SMS_USERNAME;
    this.senderId = process.env.SMS_SENDER_ID || null;
    
    // Initialize Africa's Talking SDK
    try {
      this.at = AfricasTalking({
        apiKey: this.apiKey,
        username: this.username
      });
      this.sms = this.at.SMS;
      console.log('Africa\'s Talking SDK initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Africa\'s Talking SDK:', error);
      this.sms = null;
    }
  }

  /**
   * Send SMS via Africa's Talking using official SDK
   * @param {string} phone - Recipient phone number
   * @param {string} message - SMS message
   * @returns {Promise<Object>} Send result
   */
  async send(phone, message) {
    try {
      if (!this.sms) {
        throw new Error('Africa\'s Talking SMS service not initialized');
      }

      const options = {
        to: phone,
        message: message
      };
      
      // Add sender ID if available
      if (this.senderId) {
        options.from = this.senderId;
      }
      
      console.log('📱 Sending SMS:', { to: phone, message: message.substring(0, 50) + '...' });
      
      const response = await this.sms.send(options);
      
      // Debug: Show the actual response structure
      console.log('🔍 Full response object:', JSON.stringify(response, null, 2));
      console.log('🔍 Response type:', typeof response);
      console.log('🔍 Response keys:', Object.keys(response || {}));
      
      // Try to extract the actual data
      let responseData = response;
      if (response && response.data) {
        responseData = response.data;
      } else if (response && response.SMSMessageData) {
        responseData = response.SMSMessageData;
      }
      
      console.log('✅ SMS sent successfully:', responseData);
      return { success: true, data: responseData };
    } catch (error) {
      console.error('❌ SMS sending failed:', error.response?.data || error.message);
      return { success: false, error: error.response?.data || error.message };
    }
  }

  /**
   * Send SMS notification
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - SMS message
   * @param {string} type - Type of SMS (request, voucher, redemption, payment)
   * @returns {Promise<Object>} Send result
   */
  async sendSMS(phoneNumber, message, type = 'general') {
    try {
      // Format phone number
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      console.log(`📱 SMS: {
  to: '${formattedPhone}',
  message: \`${message}\`,
  type: '${type}'
}`);
      
      // Send based on provider
      if (this.provider === 'africas_talking') {
        return await this.send(formattedPhone, message);
      }
      
      return { success: false, error: 'Unsupported SMS provider' };
    } catch (error) {
      console.error('SMS service error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Format phone number to +243 format
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Add +243 if not present
    if (!cleaned.startsWith('243')) {
      cleaned = '243' + cleaned;
    }
    
    return '+' + cleaned;
  }

  /**
   * Send voucher code via SMS
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} code - Voucher code
   * @param {string} amount - Voucher amount
   * @param {string} currency - Currency (USD or CDF)
   * @param {string} senderName - Sender name
   * @returns {Promise<Object>} Send result
   */
  async sendVoucherCode(phoneNumber, code, amount, currency, senderName) {
    const message = `Nimwema: Vous avez reçu un bon d'achat de ${amount} ${currency}. Code: ${code}. De la part de ${senderName}. Valide 90 jours. Toute question: nimwema.com`;
    return await this.sendSMS(phoneNumber, message, 'voucher');
  }

  /**
   * Send request notification via SMS
   * @param {string} phoneNumber - Sender phone number
   * @param {string} requesterName - Requester name
   * @param {string} message - Request message
   * @returns {Promise<Object>} Send result
   */
  async sendRequestNotification(phoneNumber, requesterName, message) {
    const smsMessage = `Nimwema: ${requesterName} vous demande un bon d'achat. Message: "${message}". Répondez sur nimwema.com`;
    return await this.sendSMS(phoneNumber, smsMessage, 'request');
  }

  /**
   * Send redemption confirmation via SMS
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} code - Voucher code
   * @param {string} amount - Amount redeemed
   * @param {string} merchantName - Merchant name
   * @returns {Promise<Object>} Send result
   */
  async sendRedemptionConfirmation(phoneNumber, code, amount, merchantName) {
    const message = `Nimwema: Votre bon ${code} de ${amount} a été utilisé chez ${merchantName}. Merci de votre confiance!`;
    return await this.sendSMS(phoneNumber, message, 'redemption');
  }

  /**
   * Send payment confirmation via SMS
   * @param {string} phoneNumber - Sender phone number
   * @param {string} amount - Amount paid
   * @param {string} recipientCount - Number of recipients
   * @returns {Promise<Object>} Send result
   */
  async sendPaymentConfirmation(phoneNumber, amount, recipientCount) {
    const message = `Nimwema: Paiement de ${amount} confirmé. ${recipientCount} bon(s) envoyé(s). Vous pouvez suivre sur nimwema.com/dashboard`;
    return await this.sendSMS(phoneNumber, message, 'payment');
  }

  /**
   * Send bulk SMS to multiple recipients
   * @param {Array} phoneNumbers - Array of phone numbers
   * @param {string} message - SMS message
   * @param {string} type - Type of SMS
   * @returns {Promise<Object>} Send result
   */
  async sendBulkSMS(phoneNumbers, message, type = 'bulk') {
    try {
      const results = [];
      
      for (const phone of phoneNumbers) {
        const result = await this.sendSMS(phone, message, type);
        results.push({ phone, result });
      }
      
      return { success: true, results };
    } catch (error) {
      console.error('Bulk SMS error:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SMSService;