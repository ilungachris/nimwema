/**
 * Voucher Model
 * Handles all voucher-related database operations
 */

const db = require('../connection');

class Voucher {
  /**
   * Create a new voucher
   */
  static async create(voucherData) {
    const query = `
      INSERT INTO vouchers (
        code, order_id, amount, currency, recipient_phone,
        recipient_name, sender_name, message, hide_identity,
        expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      voucherData.code,
      voucherData.order_id,
      voucherData.amount,
      voucherData.currency,
      voucherData.recipient_phone,
      voucherData.recipient_name || null,
      voucherData.sender_name || null,
      voucherData.message || null,
      voucherData.hide_identity || false,
      voucherData.expires_at
    ];
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Create multiple vouchers
   */
  static async createBatch(vouchers) {
    const results = [];
    
    for (const voucher of vouchers) {
      const result = await this.create(voucher);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Find voucher by code
   */
  static async findByCode(code) {
    const query = `
      SELECT v.*, o.sender_phone, o.sender_name as order_sender_name
      FROM vouchers v
      LEFT JOIN orders o ON v.order_id = o.id
      WHERE v.code = $1
    `;
    
    const result = await db.query(query, [code]);
    return result.rows[0] || null;
  }

  /**
   * Find voucher by ID
   */
  static async findById(id) {
    const query = 'SELECT * FROM vouchers WHERE id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get all vouchers for an order
   */
  static async findByOrderId(orderId) {
    const query = `
      SELECT * FROM vouchers
      WHERE order_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await db.query(query, [orderId]);
    return result.rows;
  }

  /**
   * Get all vouchers for a recipient
   */
  static async findByRecipientPhone(phone, limit = 100, offset = 0) {
    const query = `
      SELECT * FROM vouchers
      WHERE recipient_phone = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await db.query(query, [phone, limit, offset]);
    return result.rows;
  }

  /**
   * Redeem a voucher
   */
  static async redeem(code, redemptionData) {
    return await db.transaction(async (client) => {
      // Update voucher status
      const updateQuery = `
        UPDATE vouchers
        SET status = 'redeemed',
            redeemed_at = CURRENT_TIMESTAMP,
            redeemed_by = $2,
            redeemed_location = $3,
            merchant_id = $4
        WHERE code = $1 AND status = 'pending'
        RETURNING *
      `;
      
      const updateResult = await client.query(updateQuery, [
        code,
        redemptionData.redeemed_by || null,
        redemptionData.location || null,
        redemptionData.merchant_id || null
      ]);
      
      if (updateResult.rows.length === 0) {
        throw new Error('Voucher not found or already redeemed');
      }
      
      const voucher = updateResult.rows[0];
      
      // Create redemption record
      const redemptionQuery = `
        INSERT INTO redemptions (
          voucher_id, voucher_code, merchant_id, merchant_name,
          merchant_phone, location, amount, currency, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;
      
      const redemptionResult = await client.query(redemptionQuery, [
        voucher.id,
        code,
        redemptionData.merchant_id || null,
        redemptionData.merchant_name || null,
        redemptionData.merchant_phone || null,
        redemptionData.location || null,
        voucher.amount,
        voucher.currency,
        redemptionData.notes || null
      ]);
      
      return {
        voucher: voucher,
        redemption: redemptionResult.rows[0]
      };
    });
  }

  /**
   * Check if voucher is valid
   */
  static async isValid(code) {
    const query = `
      SELECT * FROM vouchers
      WHERE code = $1
        AND status = 'pending'
        AND expires_at > CURRENT_TIMESTAMP
    `;
    
    const result = await db.query(query, [code]);
    return result.rows.length > 0;
  }

  /**
   * Expire old vouchers
   */
  static async expireOld() {
    const query = `
      UPDATE vouchers
      SET status = 'expired'
      WHERE status = 'pending'
        AND expires_at <= CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Get voucher statistics
   */
  static async getStatistics(filters = {}) {
    let query = `
      SELECT 
        COUNT(*) as total_vouchers,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_vouchers,
        SUM(CASE WHEN status = 'redeemed' THEN 1 ELSE 0 END) as redeemed_vouchers,
        SUM(CASE WHEN status = 'expired' THEN 1 ELSE 0 END) as expired_vouchers,
        SUM(amount) as total_amount,
        AVG(amount) as average_amount
      FROM vouchers
      WHERE 1=1
    `;
    
    const values = [];
    let paramIndex = 1;
    
    if (filters.order_id) {
      query += ` AND order_id = $${paramIndex}`;
      values.push(filters.order_id);
      paramIndex++;
    }
    
    if (filters.recipient_phone) {
      query += ` AND recipient_phone = $${paramIndex}`;
      values.push(filters.recipient_phone);
      paramIndex++;
    }
    
    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      values.push(filters.status);
      paramIndex++;
    }
    
    const result = await db.query(query, values);
    return result.rows[0];
  }

  /**
   * Cancel voucher
   */
  static async cancel(code) {
    const query = `
      UPDATE vouchers
      SET status = 'cancelled'
      WHERE code = $1 AND status = 'pending'
      RETURNING *
    `;
    
    const result = await db.query(query, [code]);
    return result.rows[0];
  }
}

module.exports = Voucher;