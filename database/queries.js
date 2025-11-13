/**
 * Database Query Helper Functions
 * Provides easy-to-use functions for all database operations
 */

const db = require('./connection');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

class DatabaseQueries {
  
  // ============================================
  // USER OPERATIONS
  // ============================================
  
  /**
   * Create a new user
   */
  async createUser(userData) {
    const { phone, firstName, lastName, email, password, role = 'user' } = userData;
    
    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    
    const query = `
      INSERT INTO users (phone, first_name, last_name, email, password, role)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await db.query(query, [phone, firstName, lastName, email, hashedPassword, role]);
    return result.rows[0];
  }
  
  /**
   * Find user by phone
   */
  async findUserByPhone(phone) {
    const query = 'SELECT * FROM users WHERE phone = $1';
    const result = await db.query(query, [phone]);
    return result.rows[0];
  }
  
  /**
   * Find user by email
   */
  async findUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0];
  }
  
  /**
   * Find user by ID
   */
  async findUserById(id) {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
  
  /**
   * Update user's last login
   */
  async updateLastLogin(userId) {
    const query = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1';
    await db.query(query, [userId]);
  }
  
  // ============================================
  // REQUEST OPERATIONS
  // ============================================
  
  /**
   * Create a voucher request
   */
  async createRequest(requestData) {
    const {
      requesterId,
      requesterPhone,
      requesterFirstName,
      requesterLastName,
      type,
      senderName,
      senderPhone,
      message
    } = requestData;
    
    const query = `
      INSERT INTO requests (
        requester_id, requester_phone, requester_first_name, requester_last_name,
        type, sender_name, sender_phone, message, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP + INTERVAL '48 hours')
      RETURNING *
    `;
    
    const result = await db.query(query, [
      requesterId || null, requesterPhone, requesterFirstName, requesterLastName,
      type, senderName, senderPhone, message
    ]);
    
    return result.rows[0];
  }
  
  /**
   * Get all requests (with filters)
   */
  async getRequests(filters = {}) {
    let query = 'SELECT * FROM requests WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (filters.userId) {
      query += ` AND requester_id = $${paramCount}`;
      params.push(filters.userId);
      paramCount++;
    }
    
    if (filters.phone) {
      query += ` AND requester_phone = $${paramCount}`;
      params.push(filters.phone);
      paramCount++;
    }
    
    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }
    
    if (filters.type) {
      query += ` AND type = $${paramCount}`;
      params.push(filters.type);
      paramCount++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query, params);
    return result.rows;
  }
  
  /**
   * Get requests for a specific user
   */
  async getUserRequests(userId) {
    const query = `
      SELECT * FROM requests 
      WHERE requester_id = $1 
      ORDER BY created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  }
  
  /**
   * Delete a request
   */
  async deleteRequest(requestId) {
    const query = 'DELETE FROM requests WHERE id = $1 RETURNING *';
    const result = await db.query(query, [requestId]);
    return result.rows[0];
  }
  
  // ============================================
  // ORDER OPERATIONS
  // ============================================
  
  /**
   * Create an order
   */
  async createOrder(orderData) {
    const {
      id,
      senderPhone,
      senderName,
      amount,
      currency,
      quantity,
      serviceFee,
      totalAmount,
      paymentMethod,
      message,
      hideIdentity,
      coverFees
    } = orderData;
    
    const query = `
      INSERT INTO orders (
        id, sender_phone, sender_name, amount, currency, quantity,
        service_fee, total_amount, payment_method, message,
        hide_identity, cover_fees
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      id, senderPhone, senderName, amount, currency, quantity,
      serviceFee, totalAmount, paymentMethod, message,
      hideIdentity, coverFees
    ]);
    
    return result.rows[0];
  }
  
  /**
   * Get order by ID
   */
  async getOrderById(orderId) {
    const query = 'SELECT * FROM orders WHERE id = $1';
    const result = await db.query(query, [orderId]);
    return result.rows[0];
  }
  
  /**
   * Update order status
   */
  async updateOrderStatus(orderId, status, paymentStatus = null) {
    let query = 'UPDATE orders SET status = $1';
    const params = [status];
    let paramCount = 2;
    
    if (paymentStatus) {
      query += `, payment_status = $${paramCount}`;
      params.push(paymentStatus);
      paramCount++;
    }
    
    if (status === 'paid') {
      query += `, paid_at = CURRENT_TIMESTAMP`;
    }
    
    query += ` WHERE id = $${paramCount} RETURNING *`;
    params.push(orderId);
    
    const result = await db.query(query, params);
    return result.rows[0];
  }
  
  /**
   * Update order with FlexPay details
   */
  async updateOrderFlexPay(orderId, orderNumber, transactionId) {
    const query = `
      UPDATE orders 
      SET flexpay_order_number = $1, transaction_id = $2, payment_initiated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await db.query(query, [orderNumber, transactionId, orderId]);
    return result.rows[0];
  }
  
  // ============================================
  // VOUCHER OPERATIONS
  // ============================================
  
  /**
   * Create a voucher
   */
  async createVoucher(voucherData) {
    const {
      code,
      orderId,
      amount,
      currency,
      recipientPhone,
      recipientName,
      senderName,
      message,
      hideIdentity,
      expiresAt
    } = voucherData;
    
    const query = `
      INSERT INTO vouchers (
        code, order_id, amount, currency, recipient_phone, recipient_name,
        sender_name, message, hide_identity, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      code, orderId, amount, currency, recipientPhone, recipientName,
      senderName, message, hideIdentity, expiresAt
    ]);
    
    return result.rows[0];
  }
  
  /**
   * Get voucher by code
   */
  async getVoucherByCode(code) {
    const query = 'SELECT * FROM vouchers WHERE code = $1';
    const result = await db.query(query, [code.toUpperCase()]);
    return result.rows[0];
  }
  
  /**
   * Get all vouchers (with filters)
   */
  async getVouchers(filters = {}) {
    let query = 'SELECT * FROM vouchers WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (filters.status) {
      query += ` AND status = $${paramCount}`;
      params.push(filters.status);
      paramCount++;
    }
    
    if (filters.recipientPhone) {
      query += ` AND recipient_phone = $${paramCount}`;
      params.push(filters.recipientPhone);
      paramCount++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await db.query(query, params);
    return result.rows;
  }
  
  /**
   * Redeem a voucher
   */
  async redeemVoucher(code, merchantId, location) {
    const query = `
      UPDATE vouchers 
      SET status = 'redeemed', 
          redeemed_at = CURRENT_TIMESTAMP,
          merchant_id = $1,
          redeemed_location = $2
      WHERE code = $3 AND status = 'pending'
      RETURNING *
    `;
    
    const result = await db.query(query, [merchantId, location, code.toUpperCase()]);
    return result.rows[0];
  }
  
  // ============================================
  // SENDER OPERATIONS
  // ============================================
  
  /**
   * Add a sender contact
   */
  async addSender(requesterId, name, phone) {
    const query = `
      INSERT INTO senders (requester_id, name, phone)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await db.query(query, [requesterId, name, phone]);
    return result.rows[0];
  }
  
  /**
   * Get senders for a requester
   */
  async getSenders(requesterId) {
    const query = 'SELECT * FROM senders WHERE requester_id = $1 ORDER BY created_at DESC';
    const result = await db.query(query, [requesterId]);
    return result.rows;
  }
  
  /**
   * Delete a sender
   */
  async deleteSender(senderId) {
    const query = 'DELETE FROM senders WHERE id = $1 RETURNING *';
    const result = await db.query(query, [senderId]);
    return result.rows[0];
  }
  
  // ============================================
  // TRANSACTION OPERATIONS
  // ============================================
  
  /**
   * Create a transaction record
   */
  async createTransaction(transactionData) {
    const {
      orderId,
      transactionId,
      amount,
      currency,
      paymentMethod,
      status,
      providerReference
    } = transactionData;
    
    const query = `
      INSERT INTO transactions (
        order_id, transaction_id, amount, currency, payment_method, status, provider_reference
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await db.query(query, [
      orderId, transactionId, amount, currency, paymentMethod, status, providerReference
    ]);
    
    return result.rows[0];
  }
  
  /**
   * Update transaction status
   */
  async updateTransactionStatus(transactionId, status) {
    const query = `
      UPDATE transactions 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE transaction_id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [status, transactionId]);
    return result.rows[0];
  }
  
  // ============================================
  // SMS LOG OPERATIONS
  // ============================================
  
  /**
   * Log SMS sent
   */
  async logSMS(phone, message, status, provider = 'africas_talking') {
    const query = `
      INSERT INTO sms_logs (phone, message, status, provider)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await db.query(query, [phone, message, status, provider]);
    return result.rows[0];
  }
  
  // ============================================
  // SETTINGS OPERATIONS
  // ============================================
  
  /**
   * Get a setting value
   */
  async getSetting(key) {
    const query = 'SELECT value FROM settings WHERE key = $1';
    const result = await db.query(query, [key]);
    return result.rows[0]?.value;
  }
  
  /**
   * Update a setting
   */
  async updateSetting(key, value) {
    const query = `
      UPDATE settings 
      SET value = $1, updated_at = CURRENT_TIMESTAMP
      WHERE key = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [value, key]);
    return result.rows[0];
  }
}

module.exports = new DatabaseQueries();