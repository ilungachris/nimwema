/**
 * Link Requests to Users by Phone Number
 * This will link all existing and future requests to users when they login
 */

require('dotenv').config();
const db = require('./database/connection');

class RequestUserLinker {
  
  /**
   * Link all requests with a phone number to a user
   */
  async linkRequestsByPhone(userId, phone) {
    try {
      const query = `
        UPDATE requests 
        SET requester_id = $1
        WHERE requester_phone = $2 
          AND requester_id IS NULL
        RETURNING *
      `;
      
      const result = await db.query(query, [userId, phone]);
      
      console.log(`✅ Linked ${result.rows.length} requests to user ${userId}`);
      return result.rows;
      
    } catch (error) {
      console.error('Error linking requests:', error.message);
      throw error;
    }
  }
  
  /**
   * Get all requests for a user
   */
  async getUserRequests(userId) {
    try {
      const query = `
        SELECT * FROM requests 
        WHERE requester_id = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await db.query(query, [userId]);
      return result.rows;
      
    } catch (error) {
      console.error('Error getting user requests:', error.message);
      throw error;
    }
  }
  
  /**
   * Get requests by phone (for users not logged in)
   */
  async getRequestsByPhone(phone) {
    try {
      const query = `
        SELECT * FROM requests 
        WHERE requester_phone = $1 
        ORDER BY created_at DESC
      `;
      
      const result = await db.query(query, [phone]);
      return result.rows;
      
    } catch (error) {
      console.error('Error getting requests by phone:', error.message);
      throw error;
    }
  }
}

module.exports = new RequestUserLinker();