// src/services/sms.js
// Centralised SMS service for Nimwema using Twilio.

const twilio = require('twilio');

class SMSService {
  constructor() {
    this.provider   = process.env.SMS_PROVIDER || 'twilio';
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

  // ---- Helpers -------------------------------------------------------------

  formatPhoneNumber(phone) {
    if (!phone) return phone;

    let p = String(phone).trim();

    if (p.startsWith('+')) return p;

    if (p.startsWith('00')) {
      return '+' + p.slice(2);
    }

    const digits = p.replace(/\D/g, '');
    if (digits.length === 9 && (digits.startsWith('8') || digits.startsWith('9'))) {
      return '+243' + digits;
    }

    if (digits.length === 10 && digits.startsWith('0')) {
      return '+243' + digits.slice(1);
    }

    return p;
  }

  // ---- Core low-level Twilio send() ---------------------------------------

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

  // ---- Public generic SMS API ---------------------------------------------

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

  // ---- Templates: voucher, payment, redemption, bulk ----------------------

  /*async sendVoucherCode(phoneNumber, code, amountText, senderName, expiresAt) {
  console.log("\n================= SEND VOUCHER CODE =================");
  console.log("[RAW INPUT] phoneNumber:", phoneNumber);
  console.log("[RAW INPUT] amountText:", amountText);
  console.log("[RAW INPUT] senderName:", senderName);
  console.log("[RAW INPUT] expiresAt:", expiresAt);

  const formattedPhone = this.formatPhoneNumber(phoneNumber);
  console.log("[FORMATTED PHONE]", formattedPhone);

  // Detect currency
  const isUSD = /USD/i.test(amountText);
  console.log("[CURRENCY DETECTED]", isUSD ? "USD" : "CDF");

  // Strip everything except digits
  const digitsOnly = amountText.replace(/[^\d]/g, '');
  console.log("[DIGITS ONLY EXTRACTED]", digitsOnly);

  let finalAmount;

  if (!digitsOnly) {
    console.log("[WARN] digitsOnly is EMPTY → fallback to raw amountText");
    finalAmount = amountText.trim();
  } else {
    const numericValue = Number(digitsOnly);
    console.log("[NUMERIC VALUE PARSED]", numericValue);

    if (!Number.isFinite(numericValue)) {
      console.log("[ERROR] numericValue is NOT a number → fallback");
      finalAmount = amountText.trim();
    } else {
      finalAmount = isUSD
        ? `${numericValue} USD`
        : `${numericValue.toLocaleString('fr-CD')} CDF`;
    }
  }

  console.log("[FINAL AMOUNT]", finalAmount);

  const expiryText = `Valide 90 jours. Toute question: nimwema.com`;
  console.log("[EXPIRY TEXT]", expiryText);

  const message =
    `${senderName} Vous a envoyé un bon d'achat de ${finalAmount}.\n` +
    `Code: ${code}.\n` +
    `${expiryText}`;

  console.log("[FINAL SMS MESSAGE BEFORE SEND]\n", message);
  console.log("=====================================================\n");

  return this.sendSMS(formattedPhone, message, 'voucher_sent');
} */

////
// ============================================
// SMS SERVICE FIX - sendVoucherCode Function
// Location: services/sms.js (or wherever your SMS service is)
// ============================================

// REPLACE YOUR CURRENT sendVoucherCode FUNCTION WITH THIS:

async sendVoucherCode(phoneNumber, voucherCode, amountText, senderName, expiresAt) {
  console.log('================= SEND VOUCHER CODE =================');
  console.log('[RAW INPUT] phoneNumber:', phoneNumber);
  console.log('[RAW INPUT] amountText:', amountText);
  console.log('[RAW INPUT] senderName:', senderName);
  console.log('[RAW INPUT] expiresAt:', expiresAt);

  const formattedPhone = this.formatPhoneNumber(phoneNumber);
  console.log('[FORMATTED PHONE]', formattedPhone);

  // Detect currency
  const currencyMatch = amountText.match(/USD|CDF/);
  const currency = currencyMatch ? currencyMatch[0] : 'USD';
  console.log('[CURRENCY DETECTED]', currency);

  // 🔥 FIX: Extract digits AND decimal point
  const digitsOnly = amountText.replace(/[^\d.]/g, '');  // Keep the decimal point!
  console.log('[DIGITS ONLY EXTRACTED]', digitsOnly);

  // 🔥 FIX: Use parseFloat to handle decimals properly
  const numericAmount = parseFloat(digitsOnly) || 0;
  console.log('[NUMERIC VALUE PARSED]', numericAmount);

  // Format amount with proper decimal places
  const formattedAmount = currency === 'USD' 
    ? numericAmount.toFixed(2)  // USD: always 2 decimals (e.g., 10.00)
    : Math.round(numericAmount);  // CDF: no decimals (e.g., 22500)

  const finalAmount = `${formattedAmount} ${currency}`;
  console.log('[FINAL AMOUNT]', finalAmount);

  // Calculate expiry text
  const expiryDays = Math.ceil((new Date(expiresAt) - new Date()) / (1000 * 60 * 60 * 24));
  const expiryText = expiryDays > 0 
    ? `Valide ${expiryDays} jours. Toute question: nimwema.com`
    : 'Valide 90 jours. Toute question: nimwema.com';
  
  console.log('[EXPIRY TEXT]', expiryText);

  // Build final message
  const message = `${senderName} Vous a envoyé un bon d'achat de ${finalAmount}.\nCode: ${voucherCode}.\n${expiryText}`;
  
  console.log('[FINAL SMS MESSAGE BEFORE SEND]\n', message);
  console.log('=====================================================');

  return await this.sendSMS(formattedPhone, message, 'voucher_sent');
}

// ============================================
// SUMMARY OF CHANGES
// ============================================

// BEFORE (BROKEN):
// const digitsOnly = amountText.replace(/[^\d]/g, '');     // Removes decimal point
// const numericAmount = parseInt(digitsOnly);              // Treats 1000 as integer

// AFTER (FIXED):
// const digitsOnly = amountText.replace(/[^\d.]/g, '');    // Keeps decimal point
// const numericAmount = parseFloat(digitsOnly) || 0;       // Handles decimals properly

// RESULT:
// Input:  "10.00 USD"
// Before: "1000" → 1000
// After:  "10.00" → 10.00 ✅


  ////
  async sendRedemptionConfirmation(phoneNumber, amount, merchantName) {
    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    const amountText = amount.toLocaleString('fr-CD') + ' CDF';

    const message =
      `Nimwema: Votre bon d'achat de ${amountText} a été utilisé chez ` +
      `${merchantName}. Merci pour votre confiance.`;

    return this.sendSMS(formattedPhone, message, 'redemption_confirmation');
  }

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
