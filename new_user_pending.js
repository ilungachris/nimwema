app.get('/api/orders/my-pending', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM orders WHERE status IN ($1, $2) ORDER BY created_at DESC',
      ['pending', 'pending_payment']
    );
    
    const userOrders = result.rows.map(order => ({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      quantity: order.quantity,
      total: order.total_amount,
      paymentMethod: order.payment_method,
      createdAt: order.created_at,
      status: order.status
    }));
    
    res.json({ success: true, orders: userOrders });
  } catch (error) {
    console.error('Get user pending orders error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
