// ADD THIS TO YOUR server.js (temporary test endpoint)
// Add after your other FlexPay endpoints

// 🧪 TEST ENDPOINT: FlexPay Card without card data
app.post('/api/test-flexpay-card', async (req, res) => {
  try {
    const { amount, currency } = req.body;
    
    console.log('🧪 TEST: FlexPay card payment WITHOUT card data');
    
    const orderId = 'TEST_' + Date.now();
    const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
    
    // Call FlexPay with card data but NO NAME
    const result = await flexpayService.initiateCardPayment({
      amount: amount,
      currency: currency,
      reference: orderId,
      callbackUrl: `${APP_BASE_URL}/api/payment/flexpay/callback`,
      approveUrl: `${APP_BASE_URL}/payment-success.html?order=${orderId}`,
      cancelUrl: `${APP_BASE_URL}/payment-cancel.html?order=${orderId}`,
      declineUrl: `${APP_BASE_URL}/payment-cancel.html?order=${orderId}`,
      homeUrl: `${APP_BASE_URL}`,
      description: `Test Order ${orderId}`,
      cardNumber: req.body.cardNumber,
      expiryMonth: req.body.expiryMonth,
      expiryYear: req.body.expiryYear,
      cvv: req.body.cvv
    });
    
    console.log('🧪 TEST Result:', result);
    
    // Return result to test page
    res.json({
      success: result.success,
      redirectUrl: result.redirectUrl,
      orderNumber: result.orderNumber,
      message: result.message,
      fullResponse: result
    });
    
  } catch (error) {
    console.error('🧪 TEST Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
});

// Serve test page
app.get('/test-flexpay-card.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-flexpay-card.html'));
});