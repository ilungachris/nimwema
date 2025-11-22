class FlexPayService {
  constructor() {
    this.momoUrl = 'https://backend.flexpay.cd/api/rest/v1/paymentService';
    this.cardUrl = 'https://cardpayment.flexpay.cd/v1.1/pay';        // CORRECT
    this.checkUrl = 'https://apicheck.flexpaie.com/api/rest/v1/check'; // CORRECT
    this.token = process.env.FLEXPAY_TOKEN.trim();
    this.merchant = process.env.FLEXPAY_MERCHANT || 'CPOSSIBLE';
  }

  async initiateMobilePayment(data) {
    const payload = {
      merchant: this.merchant,
      type: '1',
      phone: data.phone.replace(/\D/g, '').replace(/^0/, '243'),
      amount: data.amount.toString(),
      currency: 'CDF',
      reference: data.reference,
      callbackUrl: data.callbackUrl || 'https://nimwema.com',
    };

    console.log('MoMo → FlexPay:', payload);
    try {
      const res = await require('axios').post(this.momoUrl, payload, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      console.log('MoMo ← FlexPay:', res.data);
      return { success: res.data.code === '0', orderNumber: res.data.orderNumber };
    } catch (e) {
      console.error('MoMo ERROR:', e.response?.data || e.message);
      return { success: false, message: e.message };
    }
  }

  async initiateCardPayment(data) {
    const payload = {
      authorization: `Bearer ${this.token}`,
      merchant: this.merchant,
      amount: data.amount,
      currency: data.currency || 'USD',
      reference: data.reference,
      callback_url: data.callbackUrl || 'https://nimwema.com',
      approve_url: 'https://nimwema.com/payment-success.html',
      cancel_url: 'https://nimwema.com/payment-cancel.html',
      decline_url: 'https://nimwema.com/payment-cancel.html',
    };

    console.log('Card → FlexPay:', payload);
    try {
      const res = await require('axios').post(this.cardUrl, payload);
      console.log('Card ← FlexPay:', res.data);
      return { success: res.data.code === '0', redirectUrl: res.data.url };
    } catch (e) {
      console.error('Card ERROR:', e.response?.data || e.message);
      return { success: false, message: e.message };
    }
  }

  async checkTransaction(orderNumber) {
    try {
      const res = await require('axios').get(`${this.checkUrl}/${orderNumber}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      console.log('Check ← FlexPay:', res.data);
      return { success: res.data.code === '0', status: res.data.transaction.status };
    } catch (e) {
      console.error('Check ERROR:', e.response?.data || e.message);
      return { success: false };
    }
  }
}

module.exports = FlexPayService;