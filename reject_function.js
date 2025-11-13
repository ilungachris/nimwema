app.post('/api/admin/pending-orders/:orderId/reject', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    
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
    
    console.log('❌ Admin rejecting order:', orderId, 'Reason:', reason);
    
    // Update order status in database
    await db.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      ['rejected', orderId]
    );
    
    // Notify sender if phone available
    if (order.sender_phone) {
      try {
        await sendSMSNotification(order.sender_phone, {
          type: 'payment_rejected',
          orderId: orderId,
          reason: reason
        });
        console.log('📱 Rejection SMS sent to sender: ' + order.sender_phone);
      } catch (smsError) {
        console.error('❌ Rejection SMS failed:', smsError);
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Commande rejetée'
    });
    
  } catch (error) {
    console.error('Reject order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
