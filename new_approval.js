app.post('/api/admin/pending-orders/:orderId/approve', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get order from database
    const orderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1',
      [orderId]
    );
    
    if (orderResult.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Commande introuvable' });
    }
    
    const order = orderResult.rows[0];
    
    // Check status - accept both 'pending' and 'pending_payment' for backward compatibility
    if (order.status !== 'pending' && order.status !== 'pending_payment') {
      return res.status(400).json({ success: false, message: 'Cette commande n\'est pas en attente' });
    }
    
    console.log('📢 Admin approving order:', orderId);
    
    // Parse recipients
    let recipients = [];
    try {
      recipients = JSON.parse(order.recipients);
    } catch (e) {
      console.error('Error parsing recipients:', e);
      recipients = [];
    }
    
    // Generate vouchers in batches of 50
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < recipients.length; i += batchSize) {
      batches.push(recipients.slice(i, i + batchSize));
    }
    
    const allVouchers = [];
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log('📦 Processing batch ' + (batchIndex + 1) + '/' + batches.length + ' (' + batch.length + ' vouchers)');
      
      for (const recipient of batch) {
        const voucherCode = generateVoucherCode();
        const voucher = {
          code: voucherCode,
          amount: parseFloat(order.amount),
          currency: order.currency,
          recipient_phone: recipient.phone,
          recipient_name: recipient.name || null,
          sender_name: order.sender_name,
          message: order.message,
          status: 'active',
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + (parseInt(process.env.VOUCHER_EXPIRY_DAYS) || 90) * 24 * 60 * 60 * 1000).toISOString(),
          order_id: orderId,
          request_id: recipient.requestId || null
        };
        
        // Insert voucher into database
        try {
          const voucherResult = await db.query(
            'INSERT INTO vouchers (code, amount, currency, recipient_phone, recipient_name, sender_name, message, status, created_at, expires_at, order_id, request_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
            [voucher.code, voucher.amount, voucher.currency, voucher.recipient_phone, voucher.recipient_name, voucher.sender_name, voucher.message, voucher.status, voucher.created_at, voucher.expires_at, voucher.order_id, voucher.request_id]
          );
          
          allVouchers.push(voucherResult.rows[0]);
          
          // Send SMS to recipient
          try {
            await sendSMSNotification(recipient.phone, {
              type: 'voucher_sent',
              code: voucher.code,
              amount: order.amount,
              currency: order.currency,
              senderName: order.sender_name,
              expiresAt: voucher.expires_at
            });
            console.log('📱 SMS sent to ' + recipient.phone);
          } catch (smsError) {
            console.error('❌ SMS failed for ' + recipient.phone + ':', smsError);
          }
        } catch (dbError) {
          console.error('❌ Database error creating voucher:', dbError);
        }
      }
      
      // Wait 10 seconds between batches
      if (batchIndex < batches.length - 1) {
        console.log('⏳ Waiting 10 seconds before next batch...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    // Send confirmation SMS to sender
    if (order.sender_phone) {
      try {
        await sendSMSNotification(order.sender_phone, {
          type: 'payment_confirmation',
          quantity: order.quantity,
          amount: order.amount,
          currency: order.currency
        });
        console.log('📱 Confirmation SMS sent to sender: ' + order.sender_phone);
      } catch (smsError) {
        console.error('❌ Sender SMS failed:', smsError);
      }
    }
    
    // Update order status in database
    await db.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      ['completed', orderId]
    );
    
    console.log('✅ Order ' + orderId + ' approved: ' + allVouchers.length + ' vouchers created');
    
    res.json({ 
      success: true, 
      message: 'Commande approuvée: ' + allVouchers.length + ' bons créés et envoyés',
      vouchersCreated: allVouchers.length
    });
    
  } catch (error) {
    console.error('Approve order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
