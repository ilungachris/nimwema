/**
 * SMS Service
 * Handles SMS notifications via Africa's Talking or other providers
 */

const axios = require('axios');

class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'africas_talking';
    this.apiKey = process.env.SMS_API_KEY;
    this.username = process.env.SMS_USERNAME;
    this.senderId = process.env.SMS_SENDER_ID || 'NIMWEMA';
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Africa's Talking API endpoint
    this.apiUrl = this.isProduction 
      ? 'https://api.africastalking.com/version1/messaging'
      : 'https://api.sandbox.africastalking.com/version1/messaging';
  }

  /**
   * Send SMS via Africa's Talking
   * @param {string} phone - Recipient phone number
   * @param {string} message - SMS message
   * @returns {Promise<Object>} Send result
   */
  async sendViaAfricasTalking(phone, message) {
    try {
      const response = await axios.post(
        this.apiUrl,
        new URLSearchParams({
          username: this.username,
          to: phone,
          message: message,
          from: this.senderId
        }),
        {
          headers: {
            'apiKey': this.apiKey,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json'
          }
        }
      );

      console.log('SMS sent via Africa\'s Talking:', response.data);

      return {
        success: true,
        provider: 'africas_talking',
        messageId: response.data.SMSMessageData?.Recipients?.[0]?.messageId,
        status: response.data.SMSMessageData?.Recipients?.[0]?.status
      };
    } catch (error) {
      console.error('Africa\'s Talking SMS Error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send SMS (main method)
   * @param {string} phone - Recipient phone number
   * @param {string} message - SMS message
   * @param {string} type - Message type (voucher, request, redemption, etc.)
   * @returns {Promise<Object>} Send result
   */
  async send(phone, message, type = 'general') {
    // Format phone number
    const formattedPhone = this.formatPhoneNumber(phone);

    // Log SMS for demo/development
    console.log('📱 SMS:', {
      to: formattedPhone,
      message: message,
      type: type
    });

    // If no API key configured, simulate sending
    if (!this.apiKey) {
      console.log('⚠️ SMS API not configured - simulating send');
      return {
        success: true,
        simulated: true,
        phone: formattedPhone,
        message: message,
        type: type
      };
    }

    // Send via configured provider
    switch (this.provider) {
      case 'africas_talking':
        return await this.sendViaAfricasTalking(formattedPhone, message);
      
      default:
        console.warn('Unknown SMS provider:', this.provider);
        return {
          success: false,
          error: 'Unknown SMS provider'
        };
    }
  }

  /**
   * Send voucher code SMS
   * @param {string} phone - Recipient phone number
   * @param {string} code - Voucher code
   * @param {number} amount - Voucher amount
   * @param {string} currency - Currency
   * @param {string} senderName - Sender name (optional)
   * @returns {Promise<Object>} Send result
   */
  async sendVoucherCode(phone, code, amount, currency, senderName = null, baseUrl = 'https://nimwema.com') {
    const message = senderName
      ? `Nimwema: ${senderName} vous a envoyé un bon d'achat de ${amount} ${currency}. Code: ${code}. Valable 90 jours. Utilisez-le chez nos marchands partenaires. Dire merci: ${baseUrl}/thank-you.html?code=${code}`
      : `Nimwema: Vous avez reçu un bon d'achat de ${amount} ${currency}. Code: ${code}. Valable 90 jours. Utilisez-le chez nos marchands partenaires. Dire merci: ${baseUrl}/thank-you.html?code=${code}`;

    return await this.send(phone, message, 'voucher');
  }

  /**
   * Send request notification SMS
   * @param {string} phone - Sender phone number
   * @param {string} requesterName - Requester name
   * @param {string} message - Request message
   * @returns {Promise<Object>} Send result
   */
  async sendRequestNotification(phone, requesterName, message = null) {
    const smsMessage = message
      ? `Nimwema: ${requesterName} vous demande un bon d'achat. Message: "${message}". Répondez sur nimwema.com`
      : `Nimwema: ${requesterName} vous demande un bon d'achat. Répondez sur nimwema.com`;

    return await this.send(phone, smsMessage, 'request');
  }

  /**
   * Send redemption confirmation SMS
   * @param {string} phone - Recipient phone number
   * @param {string} code - Voucher code
   * @param {number} amount - Voucher amount
   * @param {string} currency - Currency
   * @param {string} merchantName - Merchant name
   * @returns {Promise<Object>} Send result
   */
  async sendRedemptionConfirmation(phone, code, amount, currency, merchantName) {
    const message = `Nimwema: Votre bon ${code} de ${amount} ${currency} a été utilisé chez ${merchantName}. Merci d'utiliser Nimwema!`;

    return await this.send(phone, message, 'redemption');
  }

  /**
   * Send payment confirmation SMS
   * @param {string} phone - Sender phone number
   * @param {string} orderId - Order ID
   * @param {number} amount - Payment amount
   * @param {string} currency - Currency
   * @param {number} quantity - Number of vouchers
   * @returns {Promise<Object>} Send result
   */
  async sendPaymentConfirmation(phone, orderId, amount, currency, quantity) {
    const message = `Nimwema: Paiement confirmé! ${quantity} bon(s) de ${amount} ${currency} créé(s). Commande: ${orderId}. Les codes ont été envoyés aux destinataires.`;

    return await this.send(phone, message, 'payment');
  }

  /**
   * Format phone number to international format
   * @param {string} phone - Phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // If starts with 0, replace with 243
    if (cleaned.startsWith('0')) {
      cleaned = '243' + cleaned.substring(1);
    }
    
    // If doesn't start with 243, add it
    if (!cleaned.startsWith('243')) {
      cleaned = '243' + cleaned;
    }
    
    // Add + prefix
    return '+' + cleaned;
  }

  /**
   * Validate phone number
   * @param {string} phone - Phone number
   * @returns {boolean} Is valid
   */
  isValidPhoneNumber(phone) {
    const formatted = this.formatPhoneNumber(phone);
    // DRC phone numbers: +243 followed by 9 digits
    return /^\+243\d{9}$/.test(formatted);
  }

  /**
   * Send bulk SMS
   * @param {Array} recipients - Array of {phone, message} objects
   * @returns {Promise<Array>} Send results
   */
  async sendBulk(recipients) {
    const results = [];
    
    for (const recipient of recipients) {
      const result = await this.send(
        recipient.phone,
        recipient.message,
        recipient.type || 'general'
      );
      
      results.push({
        phone: recipient.phone,
        ...result
      });
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}

module.exports = SMSService;