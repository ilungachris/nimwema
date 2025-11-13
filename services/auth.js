// ============================================
// AUTHENTICATION SERVICE
// ============================================

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const SALT_ROUNDS = 10;
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

class AuthService {
  constructor() {
    // In-memory storage (replace with database in production)
    this.users = new Map();
    this.sessions = new Map();
    this.merchants = new Map();
    this.cashiers = new Map();
    
    // Initialize with default admin
    this.initializeDefaultUsers();
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  
  async initializeDefaultUsers() {
    try {
      // Default admin user
      const adminHash = await bcrypt.hash('Admin@2024', SALT_ROUNDS);
      this.users.set('admin@nimwema.cd', {
        id: 1,
        email: 'admin@nimwema.cd',
        passwordHash: adminHash,
        fullName: 'System Administrator',
        phone: '+243999999999',
        role: 'admin',
        status: 'active',
        emailVerified: true,
        createdAt: new Date().toISOString()
      });

      // Test merchant owner
      const merchantHash = await bcrypt.hash('Merchant@2024', SALT_ROUNDS);
      this.users.set('merchant@test.cd', {
        id: 2,
        email: 'merchant@test.cd',
        passwordHash: merchantHash,
        fullName: 'Test Merchant Owner',
        phone: '+243811111111',
        role: 'merchant',
        status: 'active',
        emailVerified: true,
        createdAt: new Date().toISOString()
      });

      // Test merchant
      this.merchants.set('MER-000001', {
        id: 1,
        merchantId: 'MER-000001',
        name: 'Supermarché Test',
        address: '123 Avenue de la Paix, Kinshasa',
        logo: null,
        phone: '+243811111111',
        email: 'merchant@test.cd',
        ownerId: 2,
        status: 'active',
        approvedBy: 1,
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      // Test cashier
      const cashierHash = await bcrypt.hash('Cashier@2024', SALT_ROUNDS);
      this.users.set('cashier@test.cd', {
        id: 3,
        email: 'cashier@test.cd',
        passwordHash: cashierHash,
        fullName: 'Test Cashier',
        phone: '+243822222222',
        role: 'cashier',
        status: 'active',
        emailVerified: true,
        createdAt: new Date().toISOString()
      });

      // Link cashier to merchant
      this.cashiers.set('CASH-000001', {
        id: 1,
        merchantId: 1,
        userId: 3,
        cashierCode: 'CASH-000001',
        fullName: 'Test Cashier',
        phone: '+243822222222',
        status: 'active',
        createdAt: new Date().toISOString()
      });

      console.log('✅ Default users initialized');
      console.log('📧 Admin: admin@nimwema.cd / Admin@2024');
      console.log('📧 Merchant: merchant@test.cd / Merchant@2024');
      console.log('📧 Cashier: cashier@test.cd / Cashier@2024');
    } catch (error) {
      console.error('Error initializing default users:', error);
    }
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

  async signup(email, password, fullName, phone, role = 'user') {
    try {
      // Check if user exists
      if (this.users.has(email)) {
        return { success: false, message: 'Email already registered' };
      }

      // Validate password strength
      if (password.length < 8) {
        return { success: false, message: 'Password must be at least 8 characters' };
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const userId = this.users.size + 1;
      const user = {
        id: userId,
        email,
        passwordHash,
        fullName,
        phone,
        role,
        status: 'active',
        emailVerified: false,
        createdAt: new Date().toISOString()
      };

      this.users.set(email, user);

      return {
        success: true,
        message: 'User registered successfully',
        user: this.sanitizeUser(user)
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, message: 'Error creating account' };
    }
  }

  async login(email, password) {
    try {
      // Get user
      const user = this.users.get(email);
      if (!user) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Check status
      if (user.status !== 'active') {
        return { success: false, message: 'Account is suspended' };
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return { success: false, message: 'Invalid email or password' };
      }

      // Create session
      const sessionToken = uuidv4();
      const expiresAt = new Date(Date.now() + SESSION_DURATION);

      this.sessions.set(sessionToken, {
        userId: user.id,
        email: user.email,
        role: user.role,
        expiresAt,
        createdAt: new Date()
      });

      return {
        success: true,
        message: 'Login successful',
        sessionToken,
        user: this.sanitizeUser(user)
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Error logging in' };
    }
  }

  logout(sessionToken) {
    this.sessions.delete(sessionToken);
    return { success: true, message: 'Logged out successfully' };
  }

  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Find user
      const user = Array.from(this.users.values()).find(u => u.id === userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // Verify old password
      const isValid = await bcrypt.compare(oldPassword, user.passwordHash);
      if (!isValid) {
        return { success: false, message: 'Current password is incorrect' };
      }

      // Validate new password
      if (newPassword.length < 8) {
        return { success: false, message: 'New password must be at least 8 characters' };
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      user.passwordHash = passwordHash;

      return { success: true, message: 'Password changed successfully' };
    } catch (error) {
      console.error('Change password error:', error);
      return { success: false, message: 'Error changing password' };
    }
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  validateSession(sessionToken) {
    const session = this.sessions.get(sessionToken);
    if (!session) {
      return null;
    }

    // Check expiry
    if (new Date() > session.expiresAt) {
      this.sessions.delete(sessionToken);
      return null;
    }

    // Get user
    const user = Array.from(this.users.values()).find(u => u.id === session.userId);
    if (!user || user.status !== 'active') {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status
    };
  }

  cleanExpiredSessions() {
    const now = new Date();
    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(token);
      }
    }
  }

  // ============================================
  // MERCHANT MANAGEMENT
  // ============================================

  generateMerchantId() {
    let merchantId;
    do {
      const num = Math.floor(Math.random() * 999999);
      merchantId = `MER-${String(num).padStart(6, '0')}`;
    } while (this.merchants.has(merchantId));
    return merchantId;
  }

  createMerchant(ownerId, name, address, logo, phone, email) {
    try {
      const merchantId = this.generateMerchantId();
      const id = this.merchants.size + 1;

      const merchant = {
        id,
        merchantId,
        name,
        address,
        logo,
        phone,
        email,
        ownerId,
        status: 'pending', // Requires admin approval
        approvedBy: null,
        approvedAt: null,
        createdAt: new Date().toISOString()
      };

      this.merchants.set(merchantId, merchant);

      return {
        success: true,
        message: 'Merchant registered successfully. Awaiting admin approval.',
        merchant
      };
    } catch (error) {
      console.error('Create merchant error:', error);
      return { success: false, message: 'Error creating merchant' };
    }
  }

  getMerchant(merchantId) {
    return this.merchants.get(merchantId);
  }

  getMerchantByOwnerId(ownerId) {
    return Array.from(this.merchants.values()).find(m => m.ownerId === ownerId);
  }

  getAllMerchants() {
    return Array.from(this.merchants.values());
  }

  updateMerchantStatus(merchantId, status, approvedBy = null) {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) {
      return { success: false, message: 'Merchant not found' };
    }

    merchant.status = status;
    if (status === 'active' && approvedBy) {
      merchant.approvedBy = approvedBy;
      merchant.approvedAt = new Date().toISOString();
    }

    return { success: true, message: 'Merchant status updated', merchant };
  }

  updateMerchant(merchantId, updates) {
    const merchant = this.merchants.get(merchantId);
    if (!merchant) {
      return { success: false, message: 'Merchant not found' };
    }

    Object.assign(merchant, updates);
    return { success: true, message: 'Merchant updated', merchant };
  }

  // ============================================
  // CASHIER MANAGEMENT
  // ============================================

  generateCashierCode() {
    let cashierCode;
    do {
      const num = Math.floor(Math.random() * 999999);
      cashierCode = `CASH-${String(num).padStart(6, '0')}`;
    } while (this.cashiers.has(cashierCode));
    return cashierCode;
  }

  async addCashier(merchantId, email, password, fullName, phone) {
    try {
      // Check if user exists
      let user = this.users.get(email);
      let userId;

      if (user) {
        // User exists, check if already a cashier
        if (user.role === 'cashier') {
          userId = user.id;
        } else {
          return { success: false, message: 'Email already registered with different role' };
        }
      } else {
        // Create new cashier user
        const signupResult = await this.signup(email, password, fullName, phone, 'cashier');
        if (!signupResult.success) {
          return signupResult;
        }
        userId = signupResult.user.id;
      }

      // Check if cashier already linked to this merchant
      const existing = Array.from(this.cashiers.values()).find(
        c => c.merchantId === merchantId && c.userId === userId
      );
      if (existing) {
        return { success: false, message: 'Cashier already linked to this merchant' };
      }

      // Create cashier
      const cashierCode = this.generateCashierCode();
      const id = this.cashiers.size + 1;

      const cashier = {
        id,
        merchantId,
        userId,
        cashierCode,
        fullName,
        phone,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      this.cashiers.set(cashierCode, cashier);

      return {
        success: true,
        message: 'Cashier added successfully',
        cashier
      };
    } catch (error) {
      console.error('Add cashier error:', error);
      return { success: false, message: 'Error adding cashier' };
    }
  }

  getCashiersByMerchant(merchantId) {
    return Array.from(this.cashiers.values()).filter(c => c.merchantId === merchantId);
  }

  getCashierByUserId(userId) {
    return Array.from(this.cashiers.values()).find(c => c.userId === userId);
  }

  updateCashierStatus(cashierCode, status) {
    const cashier = this.cashiers.get(cashierCode);
    if (!cashier) {
      return { success: false, message: 'Cashier not found' };
    }

    cashier.status = status;
    return { success: true, message: 'Cashier status updated', cashier };
  }

  removeCashier(cashierCode) {
    const cashier = this.cashiers.get(cashierCode);
    if (!cashier) {
      return { success: false, message: 'Cashier not found' };
    }

    this.cashiers.delete(cashierCode);
    return { success: true, message: 'Cashier removed successfully' };
  }

  // ============================================
  // ADMIN FUNCTIONS
  // ============================================

  getAllUsers() {
    return Array.from(this.users.values()).map(u => this.sanitizeUser(u));
  }

  getUserById(userId) {
    const user = Array.from(this.users.values()).find(u => u.id === userId);
    return user ? this.sanitizeUser(user) : null;
  }

  updateUserStatus(userId, status) {
    const user = Array.from(this.users.values()).find(u => u.id === userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    user.status = status;
    return { success: true, message: 'User status updated', user: this.sanitizeUser(user) };
  }

  getStats() {
    const users = Array.from(this.users.values());
    const merchants = Array.from(this.merchants.values());
    const cashiers = Array.from(this.cashiers.values());
    const sessions = Array.from(this.sessions.values());

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.status === 'active').length,
      totalMerchants: merchants.length,
      activeMerchants: merchants.filter(m => m.status === 'active').length,
      pendingMerchants: merchants.filter(m => m.status === 'pending').length,
      totalCashiers: cashiers.length,
      activeCashiers: cashiers.filter(c => c.status === 'active').length,
      activeSessions: sessions.length
    };
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  sanitizeUser(user) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }
}

// Export singleton instance
module.exports = new AuthService();