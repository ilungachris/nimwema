// FlexPay payment initiation
app.post('/api/payment/flexpay/initiate', async (req, res) => {
  try {
    const { orderId, amount, currency, phone } = req.body;
    
    // Validate payment data
    const validation = flexpay.validatePaymentData({
      amount,
      currency,
      phone,
      reference: orderId
    });
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment data',
        errors: validation.errors
      });
    }
    
    // Find order
    const order = data.orders.find(o => o.id === orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Prepare callback URL
    const baseUrl = process.env.BASE_URL || `http://localhost:${PORT}`;
    const callbackUrl = `${baseUrl}/api/payment/flexpay/callback`;
    
    // Initiate payment with FlexPay
    const paymentResult = await flexpay.initiateMobilePayment({
      phone: phone,
      amount: amount,
      currency: currency,
      reference: orderId,
      description: `Nimwema Voucher Purchase - Order ${orderId}`,
      callbackUrl: callbackUrl
    });
    
    if (paymentResult.success) {
      // Update order with FlexPay order number
      order.flexpay_order_number = paymentResult.orderNumber;
      order.payment_status = 'pending';
      order.payment_initiated_at = new Date().toISOString();
      
      res.json({
        success: true,
        message: 'Payment initiated successfully',
        orderNumber: paymentResult.orderNumber,
        reference: orderId,
        instructions: 'Please check your phone and confirm the payment'
      });
    } else {
      res.status(400).json({
        success: false,
        message: paymentResult.message || 'Failed to initiate payment',
        error: paymentResult.error
      });
    }
  } catch (error) {
    console.error('FlexPay Initiation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating payment',
      error: error.message
    });
  }
});

// FlexPay payment callback
app.post('/api/payment/flexpay/callback', async (req, res) => {
  try {
    console.log('FlexPay Callback Received:', req.body);
    
    // Parse callback data
    const callbackResult = flexpay.handleCallback(req.body);
    
    if (!callbackResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid callback data'
      });
    }
    
    // Find order by reference
    const order = data.orders.find(o => o.id === callbackResult.reference);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Update order status based on callback
    if (callbackResult.status === 'completed') {
      order.status = 'paid';
      order.payment_status = 'completed';
      order.transaction_id = callbackResult.providerReference;
      order.flexpay_order_number = callbackResult.orderNumber;
      order.paid_at = new Date().toISOString();
      
      // Generate vouchers
      const vouchers = [];
      for (let i = 0; i < order.quantity; i++) {
        const voucherCode = generateVoucherCode();
        const voucher = {
          id: data.vouchers.length + 1,
          code: voucherCode,
          amount: order.amount,
          currency: order.currency,
          status: 'pending',
          recipient: order.recipients[i] || order.recipients[0],
          recipientName: order.recipientNames ? order.recipientNames[i] : null,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
          message: order.message,
          senderName: order.senderName,
          hideIdentity: order.hideIdentity,
          orderId: order.id
        };
        data.vouchers.push(voucher);
        vouchers.push(voucher);
      }
      
      order.vouchers = vouchers.map(v => v.code);
      
      // Send SMS notifications (simulated)
      console.log(`SMS: Sending voucher codes to recipients`);
      vouchers.forEach(voucher => {
        console.log(`SMS to ${voucher.recipient}: Your voucher code is ${voucher.code}`);
      });
      
      res.json({
        success: true,
        message: 'Payment processed successfully'
      });
    } else {
      order.status = 'failed';
      order.payment_status = 'failed';
      order.failed_at = new Date().toISOString();
      
      res.json({
        success: true,
        message: 'Payment failed'
      });
    }
  } catch (error) {
    console.error('FlexPay Callback Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing callback',
      error: error.message
    });
  }
});

// Check FlexPay transaction status
app.get('/api/payment/flexpay/check/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const result = await flexpay.checkTransaction(orderNumber);
    
    if (result.success) {
      res.json({
        success: true,
        transaction: result.transaction
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message || 'Transaction not found'
      });
    }
  } catch (error) {
    console.error('FlexPay Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking transaction',
      error: error.message
    });
  }
});