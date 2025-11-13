/**
 * Order Model
 * Handles all order-related database operations
 */

const db = require('../connection');

class Order {
  /**
   * Create a new order
   */
  static async create(orderData) {
    const query = `
      INSERT INTO orders (
        id, sender_phone, sender_name, amount, currency, quantity,
        service_fee, total_amount, payment_method, message,
        hide_identity, cover_fees
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const values = [
      orderData.id,
      orderData.sender_phone,
      orderData.sender_name,
      orderData.amount,
      orderData.currency,
      orderData.quantity,
      orderData.service_fee,
      orderData.total_amount,
      orderData.payment_method,
      orderData.message,
      orderData.hide_identity,
      orderData.cover_fees
    ];
    
    const result = await db.query(query, values);
    
    // Insert recipients
    if (orderData.recipients && orderData.recipients.length > 0) {
      await this.addRecipients(orderData.id, orderData.recipients, orderData.recipientNames);
    }
    
    return result.rows[0];
  }

  /**
   * Add recipients to an order
   */
  static async addRecipients(orderId, phones, names = []) {
    const query = `
      INSERT INTO order_recipients (order_id, phone, name)
      VALUES ($1, $2, $3)
    `;
    
    for (let i = 0; i < phones.length; i++) {
      await db.query(query, [orderId, phones[i], names[i] || null]);
    }
  }

  /**
   * Find order by ID
   */
  static async findById(orderId) {
    const query = `
      SELECT o.*, 
        array_agg(DISTINCT or2.phone) as recipients,
        array_agg(DISTINCT or2.name) as recipient_names
      FROM orders o
      LEFT JOIN order_recipients or2 ON o.id = or2.order_id
      WHERE o.id = $1
      GROUP BY o.id
    `;
    
    const result = await db.query(query, [orderId]);
    return result.rows[0] || null;
  }

  /**
   * Find order by FlexPay order number
   */
  static async findByFlexPayOrderNumber(orderNumber) {
    const query = `
      SELECT * FROM orders
      WHERE flexpay_order_number = $1
    `;
    
    const result = await db.query(query, [orderNumber]);
    return result.rows[0] || null;
  }

  /**
   * Update order status
   */
  static async updateStatus(orderId, status, additionalData = {}) {
    const fields = ['status = $2'];
    const values = [orderId, status];
    let paramIndex = 3;
    
    if (additionalData.payment_status) {
      fields.push(`payment_status = $${paramIndex}`);
      values.push(additionalData.payment_status);
      paramIndex++;
    }
    
    if (additionalData.transaction_id) {
      fields.push(`transaction_id = $${paramIndex}`);
      values.push(additionalData.transaction_id);
      paramIndex++;
    }
    
    if (additionalData.flexpay_order_number) {
      fields.push(`flexpay_order_number = $${paramIndex}`);
      values.push(additionalData.flexpay_order_number);
      paramIndex++;
    }
    
    if (additionalData.paid_at) {
      fields.push(`paid_at = $${paramIndex}`);
      values.push(additionalData.paid_at);
      paramIndex++;
    }
    
    if (additionalData.failed_at) {
      fields.push(`failed_at = $${paramIndex}`);
      values.push(additionalData.failed_at);
      paramIndex++;
    }
    
    const query = `
      UPDATE orders
      SET ${fields.join(', ')}
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all orders for a sender
   */
  static async findBySenderPhone(senderPhone, limit = 100, offset = 0) {
    const query = `
      SELECT o.*,
        array_agg(DISTINCT or2.phone) as recipients
      FROM orders o
      LEFT JOIN order_recipients or2 ON o.id = or2.order_id
      WHERE o.sender_phone = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [senderPhone, limit, offset]);
    return result.rows;
  }

  /**
   * Get order statistics
   */
  static async getStatistics(startDate = null, endDate = null) {
    let query = `
      SELECT 
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_orders,
        SUM(total_amount) as total_amount,
        AVG(total_amount) as average_amount
      FROM orders
    `;
    
    const values = [];
    if (startDate && endDate) {
      query += ' WHERE created_at BETWEEN $1 AND $2';
      values.push(startDate, endDate);
    }
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete order (admin only)
   */
  static async delete(orderId) {
    const query = 'DELETE FROM orders WHERE id = $1 RETURNING *';
    const result = await db.query(query, [orderId]);
    return result.rows[0];
  }
}

module.exports = Order;