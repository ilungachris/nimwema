/**
 * FlexPay Payment Service
 * Mobile Money Payment Aggregator for DRC
 * Supports: Airtel Money, Orange Money, Afrimoney, M-Pesa
 */

const axios = require('axios');

class FlexPayService {
  constructor() {
    this.baseUrl = process.env.FLEXPAY_BASE_URL || 'https://backend.flexpay.cd/api/rest/v1';
    this.cardBaseUrl = 'https://cardpayment.flexpay.cd/v1.1/pay'; // Use the same backend as mobile money
    this.MoMoBaseUrl = 'https://backend.flexpay.cd/api/rest/v1'; // Use the same backend as mobile money

	this.authToken = process.env.FLEXPAY_TOKEN;
    this.merchantCode = process.env.FLEXPAY_MERCHANT || 'CPOSSIBLE';
    this.environment = process.env.FLEXPAY_ENVIRONMENT || 'prod'; // Use production environment
    
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds
    });

    // Create axios instance for card payments
    this.cardClient = axios.create({
      baseURL: this.cardBaseUrl,
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 seconds
    });
  }

  /**
   * Initiate a mobile money payment
   * @param {Object} paymentData - Payment details
   * @param {string} paymentData.phone - Customer phone number (243XXXXXXXXX)
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.currency - Currency (USD or CDF)
   * @param {string} paymentData.reference - Your internal transaction reference
   * @param {string} paymentData.description - Payment description
   * @param {string} paymentData.callbackUrl - Webhook URL for payment result
   * @returns {Promise<Object>} Payment response with orderNumber
   */
  async initiateMobilePayment(paymentData) {
    try {
      const payload = {
        merchant: this.merchantCode,
        type: '1', // 1 = mobile money, 2 = bank card
        phone: this.formatPhoneNumber(paymentData.phone),
        reference: paymentData.reference,
        amount: paymentData.amount.toString(),
        currency: paymentData.currency || 'USD',
        callbackUrl: paymentData.callbackUrl,
        description: paymentData.description || 'Payment'
      };

      console.log('FlexPay Payment Request:', {
        ...payload,
        merchant: this.merchantCode
      });
// we may need to change this next line to use https://backend.flexpay.cd/api/rest/v1/ in this.client
      const response = await this.client.post('/paymentService', payload);

      console.log('FlexPay Payment Response:', response.data);

      return {
        success: response.data.code === '0' || response.data.code === 0,
        message: response.data.message,
        orderNumber: response.data.orderNumber,
        reference: paymentData.reference
      };
    } catch (error) {
      console.error('FlexPay Payment Error:', error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Initiate a bank card payment (VPOS)
   * @param {Object} paymentData - Payment details
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.currency - Currency (USD or CDF)
   * @param {string} paymentData.reference - Your internal transaction reference
   * @param {string} paymentData.description - Payment description
   * @param {string} paymentData.callbackUrl - Webhook URL for payment result
   * @param {string} paymentData.homeUrl - URL to redirect after payment
   * @returns {Promise<Object>} Payment response with redirect URL
   */
  async initiateCardPayment(paymentData) {
    try {
      const payload = {
        merchant: this.merchantCode,
        type: '2', // 2 = bank card
        reference: paymentData.reference,
        amount: paymentData.amount.toString(),
        currency: paymentData.currency || 'USD',
        callbackUrl: paymentData.callbackUrl,
        approveUrl: paymentData.approveUrl || paymentData.homeUrl,
        cancelUrl: paymentData.cancelUrl || paymentData.homeUrl,
        declineUrl: paymentData.declineUrl || paymentData.homeUrl,
        description: paymentData.description || 'Payment'
      };
       
       // Add card data if provided (for direct card payment with 3D Secure)
       if (paymentData.cardNumber) {
         payload.cardNumber = paymentData.cardNumber;
         payload.expiryMonth = parseInt(paymentData.expiryMonth);
         payload.expiryYear = parseInt(paymentData.expiryYear);
         payload.cvv = paymentData.cvv;
         if (paymentData.cardHolderName) payload.cardholderName = paymentData.cardHolderName; // REQUIRED by FlexPay (lowercase 'h')
        }
        
           if (paymentData.phone) payload.phone = paymentData.phone;
        // Add billing address if provided
        if (paymentData.postalCode) payload.postalCode = paymentData.postalCode;

      console.log('FlexPay Card Payment Request:', {
         cvv: payload.cvv ? '***' : undefined, // Hide CVV in logs
        ...payload,
        merchant: this.merchantCode
      });

      // Remove token from payload as it should be in headers
         const response = await this.client.post('/paymentService', payload);

      console.log('FlexPay Card Payment Response:', response.data);

      return {
        success: response.data.code === '0' || response.data.code === 0,
        message: response.data.message,
        orderNumber: response.data.orderNumber,
        redirectUrl: response.data.url,
        reference: paymentData.reference
      };
    } catch (error) {
      console.error('FlexPay Card Payment Error:', error.message);
      console.error('Full error details:', error.response?.data || error);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        error: error.response?.data || error.message,
        orderNumber: error.response?.data?.orderNumber || null
      };
    }
  }

  /**
   * Check transaction status
   * @param {string} orderNumber - FlexPay order number
   * @returns {Promise<Object>} Transaction status
   */

  /**
   * Generate a FlexPay payment link (Simple URL approach)
   * @param {Object} paymentData - Payment details
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.currency - Currency (USD or CDF)
   * @param {string} paymentData.reference - Your internal transaction reference
   * @param {string} paymentData.callbackUrl - Optional callback URL for payment result
   * @returns {string} Payment link URL
   */
  generatePaymentLink(paymentData) {
    const baseUrl = 'https://www.flexpay.cd/pay';
    
    // Build query parameters
    const params = new URLSearchParams({
      amount: paymentData.amount.toString(),
      currency: paymentData.currency || 'USD',
      reference: paymentData.reference
    });
    
    // Add callback URL if provided
    if (paymentData.callbackUrl) {
      params.append('callback', paymentData.callbackUrl);
    }
    
    const paymentLink = `${baseUrl}/${this.merchantCode}?${params.toString()}`;
    
    console.log('FlexPay Payment Link Generated:', paymentLink);
    
    return paymentLink;
  }

  /**
   * Initiate a hosted card payment (redirect to FlexPay page)
   * @param {Object} paymentData - Payment details
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.currency - Currency (USD or CDF)
   * @param {string} paymentData.reference - Your internal transaction reference
   * @param {string} paymentData.description - Payment description
   * @param {string} paymentData.callbackUrl - Webhook URL for payment result
   * @param {string} paymentData.approveUrl - URL to redirect after successful payment
   * @param {string} paymentData.cancelUrl - URL to redirect after cancelled payment
   * @param {string} paymentData.declineUrl - URL to redirect after declined payment
   * @returns {Promise<Object>} Payment response with redirect URL
   */
  async initiateHostedCardPayment(paymentData) {
    try {
      const payload = {
        merchant: this.merchantCode,
		authorization: this.authToken
        type: '2', // 2 = bank card
        reference: paymentData.reference,
        amount: paymentData.amount.toString(),
        currency: paymentData.currency || 'USD',
        callbackUrl: paymentData.callbackUrl,
        approveUrl: paymentData.approveUrl,
        cancelUrl: paymentData.cancelUrl,
        declineUrl: paymentData.declineUrl,
        description: paymentData.description || 'Payment'
        // NO CARD DATA - FlexPay will collect it on their hosted page
      };

      console.log('FlexPay Hosted Page Request:', {
        ...payload,
        merchant: this.merchantCode
      });

      // Use /paymentService endpoint (FlexPay doesn't have /payment)
      const response = await this.client.post('/paymentService', payload);

      console.log('FlexPay Hosted Page Response:', response.data);

      return {
        success: response.data.code === '0' || response.data.code === 0,
        message: response.data.message,
        orderNumber: response.data.orderNumber,
        redirectUrl: response.data.url, // FlexPay returns URL to their hosted page
        reference: paymentData.reference
      };
    } catch (error) {
      console.error('FlexPay Hosted Page Error:', error.message);

      return {
        success: false,
        message: error.response?.data?.message || error.message,
        error: error.response?.data || error.message
      };
    }
  }

  async checkTransaction(orderNumber) {
    try {
      const response = await this.client.post('/check', {
        orderNumber: orderNumber
      });

      console.log('FlexPay Check Transaction Response:', response.data);

      if (response.data.code === '0' || response.data.code === 0) {
        const transaction = response.data.transaction;
        return {
          success: true,
          transaction: {
            reference: transaction.reference,
            orderNumber: transaction.orderNumber,
            status: transaction.status === '0' || transaction.status === 0 ? 'success' : 'failed',
            amount: parseFloat(transaction.amount),
            amountCustomer: parseFloat(transaction.amountCustomer),
            currency: transaction.currency,
            createdAt: transaction.createdAt
          }
        };
      }

      return {
        success: false,
        message: response.data.message
      };
    } catch (error) {
      console.error('FlexPay Check Transaction Error:', error.message);
      
      return {
        success: false,
        message: error.response?.data?.message || error.message,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Handle payment callback from FlexPay
   * @param {Object} callbackData - Callback data from FlexPay
   * @returns {Object} Parsed callback result
   */
  handleCallback(callbackData) {
    try {
      console.log('FlexPay Callback Received:', callbackData);

      const isSuccess = callbackData.code === '0' || callbackData.code === 0;

      return {
        success: isSuccess,
        reference: callbackData.reference,
        orderNumber: callbackData.orderNumber,
        providerReference: callbackData.provider_reference,
        status: isSuccess ? 'completed' : 'failed',
        message: isSuccess ? 'Payment successful' : 'Payment failed'
      };
    } catch (error) {
      console.error('FlexPay Callback Parsing Error:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format phone number to FlexPay format (243XXXXXXXXX)
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
    
    return cleaned;
  }

  /**
   * Validate payment data
   * @param {Object} paymentData - Payment data to validate
   * @returns {Object} Validation result
   */
  validatePaymentData(paymentData) {
    const errors = [];

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Invalid amount');
    }

    if (!paymentData.currency || !['USD', 'CDF'].includes(paymentData.currency)) {
      errors.push('Invalid currency (must be USD or CDF)');
    }

    if (!paymentData.reference) {
      errors.push('Reference is required');
    }

    if (paymentData.phone) {
      const formattedPhone = this.formatPhoneNumber(paymentData.phone);
      if (formattedPhone.length < 12) {
        errors.push('Invalid phone number');
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Get payment method from phone number
   * @param {string} phone - Phone number
   * @returns {string} Payment method (airtel, orange, vodacom, africell)
   */
  getPaymentMethod(phone) {
    const cleaned = this.formatPhoneNumber(phone);
    
    // DRC mobile operators by prefix
    const prefixes = {
      '24397': 'airtel',
      '24398': 'airtel',
      '24399': 'airtel',
      '24384': 'orange',
      '24385': 'orange',
      '24389': 'orange',
      '24381': 'vodacom',
      '24382': 'vodacom',
      '24383': 'vodacom',
      '24390': 'africell',
      '24391': 'africell'
    };

    for (const [prefix, operator] of Object.entries(prefixes)) {
      if (cleaned.startsWith(prefix)) {
        return operator;
      }
    }

    return 'unknown';
  }
}

module.exports = FlexPayService;