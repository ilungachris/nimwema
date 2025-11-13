// UPDATED FlexPay Service - Remove card fields from payload
// This is what we'll test to see if FlexPay returns redirectUrl

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
      // ✅ NO CARD DATA - Let FlexPay collect it on their page!
    };

    console.log('FlexPay Card Payment Request (NO CARD DATA):', {
      ...payload,
      merchant: this.merchantCode
    });

    const response = await this.client.post('/paymentService', payload);

    console.log('FlexPay Card Payment Response:', response.data);

    return {
      success: response.data.code === '0' || response.data.code === 0,
      message: response.data.message,
      orderNumber: response.data.orderNumber,
      redirectUrl: response.data.url, // FlexPay should return this!
      reference: paymentData.reference
    };
  } catch (error) {
    console.error('FlexPay Card Payment Error:', error.message);
    
    return {
      success: false,
      message: error.response?.data?.message || error.message,
      error: error.response?.data || error.message
    };
  }
}