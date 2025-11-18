// src/services/sms.js
const AfricasTalking = require('africastalking');

class SMSService {
  constructor() {
    this.provider = process.env.SMS_PROVIDER || 'africas_talking';
    this.apiKey = process.env.SMS_API_KEY;
    this.username = process.env.SMS_USERNAME;
    this.senderId = process.env.SMS_SENDER_ID || null;

    try {
      this.at = AfricasTalking({
        apiKey: this.apiKey,
        username: this.username
      });
      this.sms = this.at.SMS;
      console.log("Africa's Talking SDK initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Africa's Talking SDK:", error);
      this.sms = null;
    }
  }

  async send(phone, message) {
    try {
      if (!this.sms) {
        throw new Error("Africa's Talking SMS service not initialized");
      }

      console.log('[SMSService] send() received phone:', phone);

     /**   const options = {
        to: [phone],
        message: message
      };

      if (this.senderId) {
        options.from = this.senderId;
      }*/




        const options = {
  to: [phone],
  message: message
};

// Only use from in production; avoid custom sender in sandbox
if (this.senderId && process.env.SMS_USERNAME !== 'sandbox') {
  options.from = this.senderId;
}


      console.log('📱 Sending SMS:', {
        to: phone,
        message: message.substring(0, 80) + '...'
      });
      console.log('📱 SMS Options:', JSON.stringify(options));
      console.log('📱 API Key:', this.apiKey ? `Set (length: ${this.apiKey.length})` : 'Not set');
      console.log('📱 Username:', this.username);

      const response = await this.sms.send(options);
      console.log('✅ SMS Response:', JSON.stringify(response, null, 2));

      if (response.SMSMessageData && response.SMSMessageData.Recipients) {
        return { success: true, data: response.SMSMessageData };
      }

      return { success: true, data: response };
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return { success: false, error: error.message || error.toString() };
    }
  }

  formatPhoneNumber(phone) {
    console.log('[SMSService] formatPhoneNumber input:', phone);

    if (!phone) {
      console.warn('[SMSService] formatPhoneNumber called with empty phone');
      return '';
    }

    let cleaned = String(phone).replace(/\D/g, '');

    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // Add DRC country code if missing
    if (!cleaned.startsWith('243')) {
      cleaned = '243' + cleaned;
    }

    const result = '+' + cleaned;
    console.log('[SMSService] formatPhoneNumber output:', result);
    return result;
  }

  async sendSMS(phoneNumber, message, type = 'general') {
    try {
      console.log('[SMSService] sendSMS() raw phoneNumber:', phoneNumber);

      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      console.log(`📱 SMS: {
  to: '${formattedPhone}',
  message: \`${message}\`,
  type: '${type}'
}`);

      if (this.provider === 'africas_talking') {
        return await this.send(formattedPhone, message);
      }

      return { success: false, error: 'Unsupported SMS provider' };
    } catch (error) {
      console.error('SMS service error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendVoucherCode(phoneNumber, code, amount, currency, senderName) {
    const message = `Nimwema: Vous avez reçu un bon d'achat de ${amount} ${currency}. Code: ${code}. De la part de ${senderName}. Valide 90 jours. Toute question: nimwema.com`;
    return await this.sendSMS(phoneNumber, message, 'voucher');
  }

  async sendRequestNotification(phoneNumber, requesterName, message) {
    const smsMessage = `Nimwema: ${requesterName} vous demande un bon d'achat. Message: "${message}". Répondez sur nimwema.com`;
    return await this.sendSMS(phoneNumber, smsMessage, 'request');
  }

  async sendRedemptionConfirmation(phoneNumber, code, amount, merchantName) {
    const message = `Nimwema: Votre bon ${code} de ${amount} a été utilisé chez ${merchantName}. Merci de votre confiance!`;
    return await this.sendSMS(phoneNumber, message, 'redemption');
  }

  async sendPaymentConfirmation(phoneNumber, amount, recipientCount) {
    const message = `Nimwema: Paiement de ${amount} confirmé. ${recipientCount} bon(s) envoyé(s). Vous pouvez suivre sur nimwema.com/dashboard`;
    return await this.sendSMS(phoneNumber, message, 'payment');
  }

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
