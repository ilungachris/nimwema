// ============================================================================
// NIMWEMA SERVER.JS PATCH FILE
// Date: 2024-11-26
// Purpose: Enhance admin and merchant dashboard API endpoints
// 
// CHANGES SUMMARY:
// 1. Enhanced /api/admin/dashboard to return real stats from DB
// 2. Enhanced /api/admin/merchants to query actual merchants
// 3. Enhanced /api/admin/users to query actual users
// 4. Enhanced /api/admin/transactions to query actual data
// 5. Added /api/merchant/cashiers DELETE endpoint
// 6. REMOVED duplicate stub endpoints (lines 4384-4438) - use the working ones (lines 503-765)
//
// HOW TO APPLY:
// 1. Find and REMOVE lines 4384-4438 (duplicate stub merchant endpoints)
// 2. Replace the stub admin endpoints (lines 4467-4597) with the enhanced versions below
// 3. Add the new cashier DELETE endpoint after line 710
// ============================================================================


// ============================================================================
// SECTION 1: ENHANCED ADMIN DASHBOARD ENDPOINT
// Replace the existing /api/admin/dashboard endpoint around line 4467
// ============================================================================

// FIX [2024-11-26]: Enhanced /api/admin/dashboard to return real DB stats
app.get('/api/admin/dashboard', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  let client;
  try {
    client = await db.pool.connect();
    
    // Get pending orders count
    const pendingResult = await client.query(
      `SELECT COUNT(*) as count FROM orders WHERE status IN ('pending', 'pending_payment', 'pending_approval')`
    );
    
    // Get this month's vouchers count
    const monthVouchersResult = await client.query(
      `SELECT COUNT(*) as count FROM vouchers WHERE date_trunc('month', created_at) = date_trunc('month', NOW())`
    );
    
    // Get this month's volume
    const monthVolumeResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM vouchers WHERE date_trunc('month', created_at) = date_trunc('month', NOW())`
    );
    
    // Get active merchants count
    const merchantsResult = await client.query(
      `SELECT COUNT(*) as count FROM merchants WHERE status = 'active'`
    );
    
    // Get total users count
    const usersResult = await client.query(
      `SELECT COUNT(*) as count FROM users WHERE is_active = true`
    );
    
    // Get total vouchers count
    const totalVouchersResult = await client.query(
      `SELECT COUNT(*) as count FROM vouchers`
    );
    
    // Get total volume
    const totalVolumeResult = await client.query(
      `SELECT COALESCE(SUM(amount), 0) as total FROM vouchers WHERE status IN ('active', 'redeemed')`
    );
    
    // Calculate redemption rate
    const redeemedResult = await client.query(
      `SELECT COUNT(*) as count FROM vouchers WHERE status = 'redeemed'`
    );
    
    const totalVouchers = parseInt(totalVouchersResult.rows[0]?.count || 0);
    const redeemedVouchers = parseInt(redeemedResult.rows[0]?.count || 0);
    const redemptionRate = totalVouchers > 0 ? Math.round((redeemedVouchers / totalVouchers) * 100) : 0;

    res.json({
      pendingApprovals: parseInt(pendingResult.rows[0]?.count || 0),
      monthVouchers: parseInt(monthVouchersResult.rows[0]?.count || 0),
      monthVolume: parseFloat(monthVolumeResult.rows[0]?.total || 0),
      activeMerchants: parseInt(merchantsResult.rows[0]?.count || 0),
      totalUsers: parseInt(usersResult.rows[0]?.count || 0),
      totalVouchers: totalVouchers,
      totalVolume: parseFloat(totalVolumeResult.rows[0]?.total || 0),
      redemptionRate: redemptionRate
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    // Fallback to zeros if DB query fails
    res.json({
      pendingApprovals: 0,
      monthVouchers: 0,
      monthVolume: 0,
      activeMerchants: 0,
      totalUsers: 0,
      totalVouchers: 0,
      totalVolume: 0,
      redemptionRate: 0
    });
  } finally {
    if (client) client.release();
  }
});


// ============================================================================
// SECTION 2: ENHANCED ADMIN MERCHANTS ENDPOINT
// Replace the existing /api/admin/merchants endpoint
// ============================================================================

// FIX [2024-11-26]: Enhanced /api/admin/merchants to return real merchant data
app.get('/api/admin/merchants', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  let client;
  try {
    const statusFilter = req.query.status || 'all';
    client = await db.pool.connect();
    
    let query = `
      SELECT 
        m.id,
        m.business_name,
        m.phone,
        m.email,
        m.city,
        m.commune,
        m.status,
        m.created_at,
        COALESCE(r.redemption_count, 0) as redemptions
      FROM merchants m
      LEFT JOIN (
        SELECT merchant_id, COUNT(*) as redemption_count
        FROM redemptions
        GROUP BY merchant_id
      ) r ON r.merchant_id = m.id
    `;
    
    const params = [];
    if (statusFilter !== 'all') {
      query += ' WHERE m.status = $1';
      params.push(statusFilter);
    }
    
    query += ' ORDER BY m.created_at DESC LIMIT 100';
    
    const result = await client.query(query, params);
    
    res.json(result.rows.map(m => ({
      id: m.id,
      business_name: m.business_name,
      name: m.business_name, // alias for compatibility
      phone: m.phone,
      email: m.email,
      city: m.city,
      commune: m.commune,
      status: m.status || 'active',
      redemptions: parseInt(m.redemptions || 0),
      created_at: m.created_at
    })));
  } catch (error) {
    console.error('Admin merchants error:', error);
    res.json([]); // Return empty array on error
  } finally {
    if (client) client.release();
  }
});


// ============================================================================
// SECTION 3: ENHANCED ADMIN USERS ENDPOINT
// Replace the existing /api/admin/users endpoint
// ============================================================================

// FIX [2024-11-26]: Enhanced /api/admin/users to return real user data
app.get('/api/admin/users', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  let client;
  try {
    const roleFilter = req.query.role || 'all';
    const statusFilter = req.query.status || 'all';
    client = await db.pool.connect();
    
    let query = `
      SELECT 
        id,
        COALESCE(name, CONCAT(first_name, ' ', last_name)) as name,
        first_name,
        last_name,
        phone,
        email,
        role,
        is_active,
        created_at
      FROM users
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (roleFilter !== 'all') {
      query += ` AND role = $${paramIndex}`;
      params.push(roleFilter);
      paramIndex++;
    }
    
    if (statusFilter === 'active') {
      query += ' AND is_active = true';
    } else if (statusFilter === 'suspended') {
      query += ' AND is_active = false';
    }
    
    query += ' ORDER BY created_at DESC LIMIT 100';
    
    const result = await client.query(query, params);
    
    res.json(result.rows.map(u => ({
      id: u.id,
      name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || 'N/A',
      first_name: u.first_name,
      last_name: u.last_name,
      phone: u.phone,
      email: u.email,
      role: u.role,
      is_active: u.is_active,
      created_at: u.created_at
    })));
  } catch (error) {
    console.error('Admin users error:', error);
    res.json([]); // Return empty array on error
  } finally {
    if (client) client.release();
  }
});


// ============================================================================
// SECTION 4: ENHANCED ADMIN TRANSACTIONS ENDPOINT
// Replace the existing /api/admin/transactions endpoint
// ============================================================================

// FIX [2024-11-26]: Enhanced /api/admin/transactions to return real transaction data
app.get('/api/admin/transactions', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  let client;
  try {
    const period = req.query.period || 'month';
    const type = req.query.type || 'all';
    client = await db.pool.connect();
    
    let dateFilter = '';
    if (period === 'today') {
      dateFilter = 'AND v.created_at::date = NOW()::date';
    } else if (period === 'week') {
      dateFilter = 'AND v.created_at >= NOW() - INTERVAL \'7 days\'';
    } else if (period === 'month') {
      dateFilter = 'AND date_trunc(\'month\', v.created_at) = date_trunc(\'month\', NOW())';
    }
    
    // Query vouchers as transactions
    const query = `
      SELECT 
        v.id,
        v.code,
        v.amount,
        v.currency,
        v.sender_name,
        v.recipient_name,
        v.recipient_phone,
        v.status,
        v.created_at,
        'voucher' as type
      FROM vouchers v
      WHERE 1=1 ${dateFilter}
      ORDER BY v.created_at DESC
      LIMIT 100
    `;
    
    const result = await client.query(query);
    
    res.json(result.rows.map(t => ({
      id: t.code || t.id,
      code: t.code,
      type: t.type,
      amount: parseFloat(t.amount || 0),
      currency: t.currency || 'USD',
      sender_name: t.sender_name,
      from: t.sender_name,
      recipient_name: t.recipient_name,
      to: t.recipient_name || t.recipient_phone,
      status: t.status,
      created_at: t.created_at
    })));
  } catch (error) {
    console.error('Admin transactions error:', error);
    res.json([]); // Return empty array on error
  } finally {
    if (client) client.release();
  }
});


// ============================================================================
// SECTION 5: NEW CASHIER DELETE ENDPOINT
// Add this after the existing /api/merchant/cashiers GET and POST endpoints (around line 710)
// ============================================================================

// FIX [2024-11-26]: Added DELETE endpoint for cashiers
app.delete('/api/merchant/cashiers/:id', requireMerchant, async (req, res) => {
  const cashierId = req.params.id;
  let client;
  
  try {
    client = await db.pool.connect();
    
    // First verify this cashier belongs to the merchant
    const merchant = await loadMerchantForUser(client, req.session.userId);
    if (!merchant) {
      return res.status(404).json({ error: 'MERCHANT_NOT_FOUND' });
    }
    
    // Check if cashier exists and belongs to this merchant
    const checkResult = await client.query(
      'SELECT id FROM cashiers WHERE id = $1 AND merchant_id = $2',
      [cashierId, merchant.id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Caissier non trouvé' });
    }
    
    // Delete the cashier (soft delete by setting status, or hard delete)
    await client.query(
      'UPDATE cashiers SET status = $1, updated_at = NOW() WHERE id = $2',
      ['deleted', cashierId]
    );
    
    // Optionally also deactivate the associated user
    // await client.query('UPDATE users SET is_active = false WHERE id = (SELECT user_id FROM cashiers WHERE id = $1)', [cashierId]);
    
    console.log('🗑️ Cashier deleted:', { cashierId, merchantId: merchant.id });
    
    res.json({ success: true, message: 'Caissier supprimé' });
  } catch (error) {
    console.error('Delete cashier error:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression' });
  } finally {
    if (client) client.release();
  }
});


// ============================================================================
// SECTION 6: REMOVE DUPLICATE STUB ENDPOINTS
// DELETE the following lines from your server.js (approximately lines 4384-4438):
// 
// These are STUB endpoints that return empty data. The REAL endpoints are
// already defined earlier in the file (lines 503-765) with actual DB queries.
//
// LINES TO DELETE:
// ============================================================================
/*
app.get('/api/merchant/stats', authMiddleware.requireAuth, authMiddleware.requireRole('merchant'), async (req, res) => {
  try {
    const stats = {
      todayRedemptions: 0,
      totalAmount: 0,
      activeCashiers: 0,
      totalCashiers: 0,
      redemptionRate: 0
    };
    res.json(stats);
  } catch (error) {
    console.error('Merchant stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/merchant/redemptions', authMiddleware.requireAuth, authMiddleware.requireRole('merchant'), async (req, res) => {
  try {
    const redemptions = [];
    res.json(redemptions);
  } catch (error) {
    console.error('Merchant redemptions error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/merchant/cashiers', authMiddleware.requireAuth, authMiddleware.requireRole('merchant'), async (req, res) => {
  try {
    const cashiers = [];
    res.json(cashiers);
  } catch (error) {
    console.error('Merchant cashiers error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/merchant/cashiers', authMiddleware.requireAuth, authMiddleware.requireRole('merchant'), async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    
    // Create cashier account
    const result = await authService.createCashier({
      name,
      email,
      phone,
      password,
      merchantId: req.user.id
    });
    
    res.json(result);
  } catch (error) {
    console.error('Add cashier error:', error);
    res.status(400).json({ error: error.message });
  }
});
*/
// ============================================================================
// END OF LINES TO DELETE
// ============================================================================


// ============================================================================
// SECTION 7: FIX MERCHANT STATS ENDPOINT
// The /api/merchant/stats endpoint should use the overview data
// Add this mapping after the existing /api/merchant/overview endpoint (around line 600)
// This ensures /api/merchant/stats returns the same data as /api/merchant/overview
// ============================================================================

// FIX [2024-11-26]: Map /api/merchant/stats to use overview data structure
app.get('/api/merchant/stats', requireMerchant, async (req, res) => {
  let client;
  try {
    client = await db.pool.connect();
    const merchant = await loadMerchantForUser(client, req.session.userId);
    if (!merchant) {
      return res.status(404).json({ error: 'MERCHANT_NOT_FOUND' });
    }

    const merchantId = merchant.id;

    // Today's redemptions
    const today = await client.query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(v.amount), 0) AS total
         FROM redemptions r
         JOIN vouchers v ON v.id = r.voucher_id
        WHERE r.merchant_id = $1
          AND r.redeemed_at::date = NOW()::date`,
      [merchantId]
    );

    // This month's total
    const month = await client.query(
      `SELECT COALESCE(SUM(v.amount), 0) AS total
         FROM redemptions r
         JOIN vouchers v ON v.id = r.voucher_id
        WHERE r.merchant_id = $1
          AND date_trunc('month', r.redeemed_at) = date_trunc('month', NOW())`,
      [merchantId]
    );

    // Cashiers count
    const cashiers = await client.query(
      `SELECT 
         COUNT(*) FILTER (WHERE status = 'active') as active,
         COUNT(*) as total
       FROM cashiers WHERE merchant_id = $1`,
      [merchantId]
    );

    return res.json({
      todayRedemptions: Number(today.rows[0]?.count || 0),
      todayAmount: Number(today.rows[0]?.total || 0),
      monthAmount: Number(month.rows[0]?.total || 0),
      totalAmount: Number(month.rows[0]?.total || 0), // alias
      activeCashiers: Number(cashiers.rows[0]?.active || 0),
      totalCashiers: Number(cashiers.rows[0]?.total || 0),
      redemptionRate: 0 // Can be calculated if needed
    });
  } catch (err) {
    console.error('❌ [MerchantStats] Error', err);
    return res.status(500).json({ error: 'SERVER_ERROR' });
  } finally {
    if (client) client.release();
  }
});
