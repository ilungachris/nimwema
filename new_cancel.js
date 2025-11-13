app.post('/api/orders/:orderId/cancel', async (req, res) => {
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
      return res.status(400).json({ success: false, message: 'Cette commande ne peut pas être annulée' });
    }
    
    // Update order status in database
    await db.query(
      'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
      ['cancelled', orderId]
    );
    
    console.log('❌ User cancelled order:', orderId);
    
    res.json({ 
      success: true, 
      message: 'Commande annulée avec succès'
    });
    
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
