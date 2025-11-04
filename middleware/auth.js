// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

const authService = require('../services/auth');

// ============================================
// AUTHENTICATION MIDDLEWARE
// ============================================

function requireAuth(req, res, next) {
  try {
    // Get session token from cookie or header
    const sessionToken = req.cookies?.sessionToken || req.headers['x-session-token'];

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Validate session
    const user = authService.validateSession(sessionToken);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session'
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
}

// ============================================
// ROLE-BASED AUTHORIZATION
// ============================================

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}

// ============================================
// ADMIN ONLY
// ============================================

function requireAdmin(req, res, next) {
  return requireRole('admin')(req, res, next);
}

// ============================================
// MERCHANT OR ADMIN
// ============================================

function requireMerchantOrAdmin(req, res, next) {
  return requireRole('admin', 'merchant')(req, res, next);
}

// ============================================
// CASHIER, MERCHANT OR ADMIN
// ============================================

function requireCashierOrAbove(req, res, next) {
  return requireRole('admin', 'merchant', 'cashier')(req, res, next);
}

// ============================================
// OPTIONAL AUTH (doesn't fail if not authenticated)
// ============================================

function optionalAuth(req, res, next) {
  try {
    const sessionToken = req.cookies?.sessionToken || req.headers['x-session-token'];

    if (sessionToken) {
      const user = authService.validateSession(sessionToken);
      if (user) {
        req.user = user;
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth error:', error);
    next();
  }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
  requireAuth,
  requireRole,
  requireAdmin,
  requireMerchantOrAdmin,
  requireCashierOrAbove,
  optionalAuth
};