// src/services/sms.js
// Centralised SMS service for Nimwema.
// Now uses Twilio instead of Africa's Talking.

const twilio = require('twilio');

class SMSService {
  constructor() {
    // Which provider to use (for now: Twilio only)
    this.provider   = process.env.SMS_PROVIDER || 'twilio';

    // Twilio credentials (ALWAYS via env vars)
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken  = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_FROM_NUMBER || null;

    console.log('[SMSService] Provider:', this.provider);
    console.log(
      '[SMSService] Twilio Account SID:',
      this.accountSid ? this.accountSid.substring(0, 10) + '...' : 'NOT SET'
    );
    console.log(
      '[SMSService] From number:',
      this.fromNumber || 'NOT SET'
    );

    this.client = null;

    // Initialise Twilio client
    if (this.provider === 'twilio') {
      try {
        if (!this.accountSid || !this.authToken || !this.fromNumber) {
          throw new Error(
            'Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER'
          );
        }

        this.client = twilio(this.accountSid, this.authToken);
        console.log('Twilio client initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Twilio client:', error);
      }
    }
  }

  /**
   * Basic phone normalisation for DRC and international numbers.
   * - trims spaces
   * - converts leading "0" to "+243" for local DRC numbers
   * - keeps +E.164 numbers as they are
   */
  formatPhoneNumber(phone) {
    if (!phone) return phone;

    let p = String(phone).trim();

    // Already in international format
    if (p.startsWith('+')) return p;

    // Replace leading "00" with "+"
    if (p.startsWith('00')) {
      return '+' + p.slice(2);
    }

    // If it's a 9-digit local DRC number (e.g. 8xxxxxxxx), prefix +243
    const digits = p.replace(/\D/g, '');
    if (digits.length === 9 && (digits.startsWith('8') || digits.startsWith('9'))) {
      return '+243' + digits;
    }

    // If it starts with "0" and is 10 digits, assume DRC and convert "0" -> "+243"
    if (digits.length === 10 && digits.startsWith('0')) {
      return '+243' + digits.slice(1);
    }

    // Fallback: just return trimmed value
    return p;
  }

  /**
   * Low-level send via Twilio.
   * Used internally by sendSMS() and other helpers.
   *
   * @param {string} phone E.164 phone number (e.g. +243...)
   * @param {string} message SMS body
   */
  async send(phone, message) {
    try {
      if (this.provider !== 'twilio') {
        throw new Error(`Unsupported SMS provider: ${this.provider}`);
      }
      if (!this.client) {
        throw new Error('Twilio client not initialized');
      }

      console.log('[SMSService] send() received phone:', phone);
      console.log('📱 Sending SMS via Twilio:', {
        to: phone,
        from: this.fromNumber,
        preview: message.substring(0, 80) + (message.length > 80 ? '...' : '')
      });

      const response = await this.client.messages.create({
        to: phone,
        from: this.fromNumber,
        body: message,
      });

      console.log('✅ Twilio SMS Response:', JSON.stringify({
        sid: response.sid,
        status: response.status,
        to: response.to,
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
      }, null, 2));

      return { success: true, data: response };
    } catch (error) {
      console.error('❌ Twilio SMS sending failed:', error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Generic send function used by your application.
   * This is what sendSMSNotification(...) calls for most types.
   *
   * @param {string} phoneNumber Raw user-entered phone number
   * @param {string} message SMS text
   * @param {string} [type='general'] Just for logging
   */
  async sendSMS(phoneNumber, message, type = 'general') {
    try {
      console.log('[SMSService] sendSMS() raw phoneNumber:', phoneNumber);

      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      console.log(`📱 SMS: {
  to: '${formattedPhone}',
  message: \`${message}\`,
  type: '${type}'
}`);

      if (this.provider === 'twilio') {
        return await this.send(formattedPhone, message);
      }

      return { success: false, error: 'Unsupported SMS provider' };
    } catch (error) {
      console.error('SMS service error:', error);
      return { success: false, error: error.message || String(error) };
    }
  }

  /**
   * Voucher code SMS template.
   * Used by sendSMSNotification when type === 'voucher_sent'.
   *
   * @param {string} phoneNumber
   * @param {string} code
   * @param {string} amountText e.g. "10 USD" or "25 000 CDF"
   * @param {string} senderName
   * @param {Date}   expiresAt JS Date instance
   */
async sendVoucherCode(phoneNumber, code, amountText, senderName, expiresAt) {
  const formattedPhone = this.formatPhoneNumber(phoneNumber);

  // Clean amount text to avoid double "CDF"
  // If amountText already contains "CDF" or "USD", do NOT add another symbol.
  const cleanAmount = amountText
    .replace(/FC|CDF|USD/gi, '')       // remove leftover currency fragments
    .trim();

  // Format final amount safely
  const finalAmount = amountText.includes('USD')
    ? `${cleanAmount} USD`
    : `${Number(cleanAmount).toLocaleString('fr-CD')} CDF`;

  // 90-day validity (short text, no timestamp)
  const expiryText = `Valide 90j. Présenter chez tous nos marchands: nimwema.com`;

  // FINAL CLEAN SMS (≤160 chars)
  const message =
    `Nimwema: Bon d'achat de ${finalAmount}.\n` +
    `Code: ${code}.\n` +
    `De la part de ${senderName}.\n` +
    `${expiryText}`;

  return this.sendSMS(formattedPhone, message, 'voucher_sent');
}


  /**
   * Payment confirmation for sender.
   *
   * @param {string} phoneNumber
   * @param {number} quantity
   * @param {number} amount
   * @param {string} currency "USD" or "CDF"
   */
  async sendPaymentConfirmation(phoneNumber, quantity, amount, currency) {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    const amountText =
      currency === 'USD'
        ? `${amount} USD`
        : `${amount.toLocaleString('fr-CD')} CDF`;

    const message =
      `Nimwema: Votre paiement de ${amountText} pour ${quantity} bon(s) ` +
      `a été confirmé. Merci !`;

    return this.sendSMS(formattedPhone, message, 'payment_confirmation');
  }

  /**
   * Redemption confirmation for beneficiary.
   *
   * @param {string} phoneNumber
   * @param {number} amount
   * @param {string} merchantName
   */
  async sendRedemptionConfirmation(phoneNumber, amount, merchantName) {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    const amountText = amount.toLocaleString('fr-CD') + ' CDF';

    const message =
      `Nimwema: Votre bon d'achat de ${amountText} a été utilisé chez ` +
      `${merchantName}. Merci pour votre confiance.`;

    return this.sendSMS(formattedPhone, message, 'redemption_confirmation');
  }

  /**
   * Send to multiple recipients (simple loop over sendSMS).
   *
   * @param {string[]} phoneNumbers
   * @param {string} message
   * @param {string} [type='bulk']
   */
  async sendBulkSMS(phoneNumbers, message, type = 'bulk') {
    try {
      if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
        throw new Error('phoneNumbers must be a non-empty array');
      }

      const results = [];
      for (const phone of phoneNumbers) {
        const result = await this.sendSMS(phone, message, type);
        results.push({ phone, result });
      }

      return { success: true, results };
    } catch (error) {
      console.error('Bulk SMS error:', error);
      return { success: false, error: error.message || String(error) };
    }
  }
}

module.exports = SMSService;
