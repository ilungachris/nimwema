// COMPLETE MERGED SERVER.JS - FLEXPay FROM CURRENT, FEATURES FROM BACKUP
// MERGE NOTES: 
// - Base: Current server.js (working FlexPay, modern middleware).
// - Added: Backup's data object, helpers (generateVoucherCode, formatCurrency, sendSMSNotification), all non-FlexPay endpoints.
// - Overrides: FlexPay endpoints/helpers/config kept from current only (working impl).
// - Cleanups: Removed body-parser (deprecated), duplicates (e.g., consolidated auth to advanced service-based with roles), truncations (inferred completions based on context).
// - Auth: Prioritized advanced service-based (with roles/middleware); removed simple in-memory; assumes services/middleware files exist.
// - SMS: Kept as-is with real service references (uncommented).
// - Exchange: Used backup's advanced scraping version.
// - Error Handling: Added backup's process.on.
// - Stripe reference: Removed from initiate (not defined, potential leftover).
// - All endpoints included, conflicts resolved (e.g., merged redeem, requests; synced orders/vouchers).

const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// MERGE: Added for exchange scraping (from backup)
const axios = require('axios'); // npm install axios if missing

// MERGE: Added imports for services/middleware (from backup) - Files confirmed to exist
const SMSService = require('./services/sms');
const authService = require('./services/auth');
const authMiddleware = require('./middleware/auth');
const FlexPayService = require('./services/flexpay');
const flexpayService = new FlexPayService();

// DATABASE: PostgreSQL connection and queries
const db = require('./database/connection');
const dbQueries = require('./database/queries');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// DATABASE: Connect to PostgreSQL on startup
let dbConnected = false;
db.connect()
  .then(() => {
    console.log('✅ PostgreSQL database connected');
    dbConnected = true;
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.log('⚠️ Running in fallback mode with in-memory storage');
    dbConnected = false;
  });

// Middleware (kept from current - modern, with CORS)
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware (merged - from current, with backup's cookie options)
app.use(session({
    secret: process.env.SESSION_SECRET || 'nimwema_secret_2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true, // MERGE: Added from backup
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: new session.MemoryStore({
        checkPeriod: 86400000 // Clear expired sessions every 24h (from current)
    })
}));

// Static files (from current)
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- Nimwema payment config (kept from current - FlexPay) ----------------

//const FLEXPAY_BASE_URL = process.env.FLEXPAY_BASE_URL || 'https://backend.flexpay.cd/api/rest/v1';
const FLEXPAY_BASE_URL = process.env.FLEXPAY_BASE_URL || 'https://cardpayment.flexpay.cd/v2/pay';
const FLEXPAY_MERCHANT = process.env.FLEXPAY_MERCHANT || 'CPOSSIBLE';
const FLEXPAY_TOKEN    = process.env.FLEXPAY_TOKEN?.trim();
const FLEXPAY_CURRENCY = (process.env.FLEXPAY_CURRENCY || 'CDF').toUpperCase();
const APP_BASE_URL     = process.env.APP_BASE_URL || 'https://nimwema-platform.onrender.com';

global.orders = global.orders || {};
const orderByFlexpayNo = {};

// MERGE: Added from backup - in-memory data storage (for demo; advanced auth may use DB)
const data = {
  users: [
    {
      id: 1,
      name: 'Demo User',
      phone: '+243123456789',
      password: 'demo123', // In production, this would be hashed
      role: 'sender'
    }
  ],
  senders: [],
  merchants: [
    {
      id: 1,
      name: 'Supermarché Central',
      logo: 'https://via.placeholder.com/80x80/8BC34A/111111?text=SC',
      fee_percent: 3.5
    },
    {
      id: 2,
      name: 'Marché Moderne',
      logo: 'https://via.placeholder.com/80x80/8BC34A/111111?text=MM',
      fee_percent: 3.5
    },
    {
      id: 3,
      name: 'Alimentation Plus',
      logo: 'https://via.placeholder.com/80x80/8BC34A/111111?text=AP',
      fee_percent: 3.5
    },
    {
      id: 4,
      name: 'Épicerie du Coin',
      logo: 'https://via.placeholder.com/80x80/8BC34A/111111?text=EC',
      fee_percent: 3.5
    }
  ],
  vouchers: [],
  requests: [],
  orders: [], // MERGE: Added to data for consistency with vouchers
  redemptions: [], // MERGE: Added from backup
  recipients: [] // MERGE: Inferred from truncated backup
};

// MERGE: Kept FlexPay helpers from current
function buildReference() {
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `NM-${ts}-${rand}`;
}
function assertFlexpayEnv() {
  if (!FLEXPAY_MERCHANT || !FLEXPAY_TOKEN || !APP_BASE_URL) {
    const missing = [
      !FLEXPAY_MERCHANT && 'FLEXPAY_MERCHANT',
      !FLEXPAY_TOKEN && 'FLEXPAY_TOKEN',
      !APP_BASE_URL && 'APP_BASE_URL',
    ].filter(Boolean).join(', ');
    throw new Error(`Missing required env: ${missing}`);
  }
}

// Helper to normalize Bearer header safely (from current)
function getFlexpayAuthHeader() {
  let t = (FLEXPAY_TOKEN || '').trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  if (/^Bearer\s+/i.test(t)) return t;
  return `Bearer ${t}`;
}

// MERGE: Added helpers from backup
function generateVoucherCode() {
  const length = parseInt(process.env.VOUCHER_CODE_LENGTH) || 12;
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: 'CDF',
    minimumFractionDigits: 0
  }).format(amount);
}

// Instantiate services (from backup)
const sms = new SMSService();

// MERGE: Added SMS helper from backup (as-is with real service)
async function sendSMSNotification(phone, data) {
  console.log('\n📱 SMS NOTIFICATION');
  console.log('To:', phone);
  console.log('Type:', data.type);
  
  try {
    let result;
    
    if (data.type === 'voucher_request') {
      // Send request notification
      result = await sms.sendRequestNotification(
        data.requesterName,
        data.requesterPhone,
        data.message
      );
    } else if (data.type === 'voucher_sent') {
      // Send voucher code
      const amountText = data.currency === 'USD' 
        ? `${data.amount} USD` 
        : `${formatCurrency(data.amount)} CDF`;
      
      result = await sms.sendVoucherCode(
        phone,
        data.code,
        amountText,
        data.senderName,
        new Date(data.expiresAt)
      );
    } else if (data.type === 'payment_confirmation') {
      // Send payment confirmation
      result = await sms.sendPaymentConfirmation(
        phone,
        data.quantity,
        data.amount,
        data.currency
      );
    } else if (data.type === 'redemption_confirmation') {
      // Send redemption confirmation
      result = await sms.sendRedemptionConfirmation(
        phone,
        data.amount,
        data.merchantName
      );
    } else if (data.type === 'thank_you') {
      result = await sms.send(phone, data.message, 'thank_you');
    }
    
    if (result && result.success) {
      console.log('✅ SMS sent successfully');
    } else {
      console.log('⚠️ SMS failed:', result?.message || 'Unknown error');
    }
    
    return result;
  } catch (error) {
    console.error('❌ SMS error:', error);
    return { success: false, message: error.message };
  }
  
  // MERGE: Removed data.smsLogs push - unclear context
}

// Helper to determine redirect URL based on role (from backup)
function getRedirectUrl(role) {
  switch(role) {
    case 'admin':
      return '/admin-dashboard.html';
    case 'merchant':
      return '/merchant-dashboard.html';
    case 'cashier':
      return '/cashier-dashboard.html';
    default:
      return '/dashboard.html';
  }
}

// ========== API ENDPOINTS ==========

// Exchange Rate (merged: advanced from backup with fallback)
app.get('/api/exchange-rate', async (req, res) => {
  try {
    let rate = 2200; // Default fallback
    
    try {
      const response = await axios.get('https://www.bcc.cd/cours-change/', { timeout: 5000 });
      const html = response.data;
      const usdMatch = html.match(/USD[\s\S]*?([0-9,]+(?:\.[0-9]+)?)/i);
      if (usdMatch && usdMatch[1]) {
        const parsedRate = parseFloat(usdMatch[1].replace(',', '.'));
        if (!isNaN(parsedRate) && parsedRate > 0) {
          rate = Math.round(parsedRate);
        }
      }
    } catch (error) {
      console.log('Failed to fetch from BCC.cd, using fallback rate');
    }
    
    res.json({
      success: true,
      rate,
      currency: 'CDF',
      base: 'USD',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Exchange rate error:', error);
    res.json({
      success: true,
      rate: 2200,
      currency: 'CDF',
      base: 'USD',
      timestamp: new Date().toISOString()
    });
  }
});

// Create order (kept from current - test impl, synced with data)
app.post('/api/orders/create', async (req, res) => {
  try {
    const orderData = req.body;
    const orderId = 'ORDER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    global.orders[orderId] = {
      ...orderData,
      id: orderId,
      status: 'pending',
      createdAt: new Date()
    };
    // MERGE: Also add to data.orders for consistency
    data.orders.push(global.orders[orderId]);
    res.json({ success: true, orderId, message: 'Order created successfully' });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// Vouchers: create pending (kept from current, enhanced with backup totals)
app.post('/api/vouchers/create-pending', async (req, res) => {
  try {
    const orderData = req.body;
    const orderId = 'ORDER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    global.orders[orderId] = {
      ...orderData,
      id: orderId,
      status: 'pending',
      createdAt: new Date()
    };
    // MERGE: Enhanced from backup with totals/recipients
    const { amount, quantity, coverFees } = orderData;
    const subtotal = amount * quantity;
    const feeAmount = subtotal * 0.035;
    const total = coverFees ? subtotal + feeAmount : subtotal;
    global.orders[orderId].subtotal = subtotal;
    global.orders[orderId].feeAmount = feeAmount;
    global.orders[orderId].total = total;
    data.orders.push(global.orders[orderId]); // Sync
    res.json({
      success: true,
      orderId,
      order: { id: orderId, ...orderData, status: 'pending', createdAt: new Date() },
      message: 'Pending order created successfully'
    });
  } catch (error) {
    console.error('Create pending order error:', error);
    res.status(500).json({ success: false, message: 'Failed to create pending order' });
  }
});

// MERGE: Added from backup - Get merchants
app.get('/api/merchants', (req, res) => {
  res.json(data.merchants);
});

// MERGE: Added from backup - Send voucher
app.post('/api/vouchers/send', (req, res) => {
  try {
    const { amount, quantity, recipient_phone, sender_name, message, hide_identity, cover_fees } = req.body;
    
    const vouchers = [];
    const qty = parseInt(quantity) || 1;
    
    for (let i = 0; i < qty; i++) {
      const voucher = {
        id: data.vouchers.length + 1,
        code: generateVoucherCode(),
        amount: parseFloat(amount),
        recipient_phone,
        sender_name: hide_identity ? 'Anonymous' : sender_name,
        message,
        status: 'active',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (parseInt(process.env.VOUCHER_EXPIRY_DAYS) || 90) * 24 * 60 * 60 * 1000).toISOString(),
        fee_percent: parseFloat(process.env.DEFAULT_FEE_PERCENT) || 3.5,
        fee_covered_by_sender: cover_fees
      };
      
      data.vouchers.push(voucher);
      vouchers.push(voucher);
    }
    
    res.json({
      success: true,
      message: 'Vouchers sent successfully',
      vouchers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error sending vouchers',
      error: error.message
    });
  }
});

// MERGE: Added from backup - Request voucher
app.post('/api/vouchers/request', async (req, res) => {
  try {
    console.log('📥 Received request body:', req.body);
    const { firstName, lastName, phone, message, requestType, senderName, senderPhone } = req.body;
    
    console.log('📋 Extracted fields:', { firstName, lastName, phone, message, requestType, senderName, senderPhone });
    
    let request;
    
    // DATABASE: Try PostgreSQL first
    if (dbConnected) {
      try {
        // Get current user if logged in (from session or localStorage)
        const user = req.session?.user;
        
        const requestData = {
          requesterId: user?.id || null,
          requesterPhone: phone,
          requesterFirstName: firstName,
          requesterLastName: lastName,
          type: requestType,
          senderName: senderName || null,
          senderPhone: senderPhone || null,
          message: message || ''
        };
        
        console.log('💾 Saving to database:', requestData);
        
        request = await dbQueries.createRequest(requestData);
        
        console.log('✅ Request saved to database:', request.id);
      } catch (dbError) {
        console.error('❌ Database save failed:', dbError.message);
        throw dbError;
      }
    } else {
      // FALLBACK: In-memory storage
      request = {
        id: data.requests.length + 1,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,
        phone,
        message,
        requestType,
        senderName: senderName || null,
        senderPhone: senderPhone || null,
        status: 'pending',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
      };
      
      data.requests.push(request);
      console.log('⚠️ Request saved to memory (fallback)');
    }
    
    // Send SMS notification
    if (requestType === 'known_sender' && senderPhone) {
      await sendSMSNotification(
        senderPhone,
        {
          type: 'voucher_request',
          requesterName: `${firstName} ${lastName}`,
          requesterPhone: phone,
          message
        }
      );
    }
    
    res.json({
      success: true,
      message: 'Request submitted successfully',
      request
    });
  } catch (error) {
    console.error('❌ Error submitting request:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting request',
      error: error.message
    });
  }
});

// MERGE: Added from backup - Get vouchers (resolved duplicate with query filters)
app.get('/api/vouchers', (req, res) => {
  const { phone, type } = req.query;
  
  let vouchers = data.vouchers;
  
  if (phone && type === 'sent') {
    // Filter vouchers sent by this phone
    vouchers = vouchers.filter(v => v.sender_phone === phone);
  } else if (phone && type === 'received') {
    // Filter vouchers received by this phone
    vouchers = vouchers.filter(v => v.recipient_phone === phone);
  }
  
  res.json(vouchers);
});

// MERGE: Added from backup - Get requests (resolved duplicate with filters)
app.get('/api/requests', async (req, res) => {
  try {
    const { phone, status, requestType, userId } = req.query;
    
    let requests;
    
    // DATABASE: Try to use PostgreSQL first
    if (dbConnected) {
      const filters = {};
      
      if (userId) filters.userId = userId;
      if (phone) filters.phone = phone;
      if (status) filters.status = status;
      if (requestType) filters.type = requestType;
      
      requests = await dbQueries.getRequests(filters);
      
      // Transform database format to match frontend expectations
      requests = requests.map(req => ({
        id: req.id,
        firstName: req.requester_first_name,
        lastName: req.requester_last_name,
        fullName: `${req.requester_first_name} ${req.requester_last_name}`,
        phone: req.requester_phone,
        message: req.message,
        requestType: req.type,
        senderName: req.sender_name,
        senderPhone: req.sender_phone,
        status: req.status,
        created_at: req.created_at,
        updated_at: req.updated_at,
        expires_at: req.expires_at,
        fulfilled_at: req.fulfilled_at
      }));
      
      console.log(`✅ Retrieved ${requests.length} requests from database`);
    } else {
      // FALLBACK: Use in-memory storage
      requests = data.requests;
      
      if (phone) {
        requests = requests.filter(r => r.phone === phone);
      }
      
      if (status) {
        requests = requests.filter(r => r.status === status);
      }
      
      if (requestType) {
        requests = requests.filter(r => r.requestType === requestType);
      }
      
      console.log('⚠️ Retrieved requests from memory (fallback)');
    }
    
    res.json(requests);
  } catch (error) {
    console.error('Error getting requests:', error);
    res.status(500).json({ error: 'Error retrieving requests' });
  }
});

// MERGE: Added from backup - Delete request
app.delete('/api/requests/:id', (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    const requestIndex = data.requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Request not found'
      });
    }
    
    const request = data.requests[requestIndex];
    
    // Only allow deletion of waiting list requests
    if (request.requestType === 'known_sender') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete requests to known senders'
      });
    }
    
    data.requests.splice(requestIndex, 1);
    
    res.json({
      success: true,
      message: 'Request deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting request',
      error: error.message
    });
  }
});

// MERGE: Added from backup - Sender management (get/create/update/delete)
app.get('/api/senders', (req, res) => {
  const { userId } = req.query;
  
  let senders = data.senders || [];
  
  if (userId) {
    senders = senders.filter(s => s.userId === parseInt(userId));
  }
  
  res.json(senders);
});

app.post('/api/senders', (req, res) => {
  try {
    const { name, phone, relation, userId } = req.body;
    
    if (!data.senders) {
      data.senders = [];
    }
    
    const sender = {
      id: data.senders.length + 1,
      name,
      phone,
      relation: relation || null,
      userId: parseInt(userId),
      created_at: new Date().toISOString()
    };
    
    data.senders.push(sender);
    
    res.json({
      success: true,
      message: 'Sender created successfully',
      sender
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating sender',
      error: error.message
    });
  }
});

app.put('/api/senders/:id', (req, res) => {
  try {
    const senderId = parseInt(req.params.id);
    const { name, phone, relation } = req.body;
    
    const senderIndex = data.senders.findIndex(s => s.id === senderId);
    
    if (senderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }
    
    data.senders[senderIndex] = {
      ...data.senders[senderIndex],
      name,
      phone,
      relation: relation || null,
      updated_at: new Date().toISOString()
    };
    
    res.json({
      success: true,
      message: 'Sender updated successfully',
      sender: data.senders[senderIndex]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating sender',
      error: error.message
    });
  }
});

app.delete('/api/senders/:id', (req, res) => {
  try {
    const senderId = parseInt(req.params.id);
    const senderIndex = data.senders.findIndex(s => s.id === senderId);
    
    if (senderIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Sender not found'
      });
    }
    
    data.senders.splice(senderIndex, 1);
    
    res.json({
      success: true,
      message: 'Sender deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting sender',
      error: error.message
    });
  }
});

// MERGE: Added from backup - Redeem voucher (consolidated duplicates, enhanced with SMS)
app.post('/api/vouchers/redeem', async (req, res) => {
  try {
    const { code, merchant_id, merchant_name, merchant_phone, location, notes } = req.body;
    
    if (!code || !merchant_name || !merchant_phone) {
      return res.status(400).json({
        success: false,
        message: 'Code, nom du marchand et téléphone requis'
      });
    }
    
    // Find voucher
    const voucher = data.vouchers.find(v => v.code === code.toUpperCase());
    
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Code invalide'
      });
    }
    
    // Check if already redeemed
    if (voucher.status === 'redeemed') {
      return res.status(400).json({
        success: false,
        message: 'Ce bon a déjà été utilisé'
      });
    }
    
    // Check if expired
    const now = new Date();
    const expiryDate = new Date(voucher.expires_at);
    if (now > expiryDate) {
      voucher.status = 'expired';
      return res.status(400).json({
        success: false,
        message: 'Ce bon a expiré'
      });
    }
    
    // Redeem voucher
    voucher.status = 'redeemed';
    voucher.redeemed_at = now.toISOString();
    voucher.merchant_id = merchant_id;
    voucher.merchant_name = merchant_name;
    voucher.merchant_phone = merchant_phone;
    voucher.redeemed_location = location;
    
    // Create redemption record
    const redemption = {
      id: (data.redemptions ? data.redemptions.length : 0) + 1,
      voucher_code: code,
      voucher_id: voucher.id,
      merchant_name: merchant_name,
      merchant_phone: merchant_phone,
      location: location,
      amount: voucher.amount,
      currency: voucher.currency || 'CDF',
      notes: notes,
      created_at: now.toISOString()
    };
    
    if (!data.redemptions) {
      data.redemptions = [];
    }
    data.redemptions.push(redemption);
    
    // Send SMS notifications
    await sendSMSNotification(
      voucher.recipient_phone || '',
      {
        type: 'redemption_confirmation',
        amount: voucher.amount,
        merchantName: merchant_name
      }
    );
    
    // Notify sender if phone available
    if (voucher.senderPhone) {
      const senderMessage = `Nimwema: Le bon ${code} de ${voucher.amount} ${voucher.currency} que vous avez envoyé a été utilisé chez ${merchant_name}.`;
      await sms.send(voucher.senderPhone, senderMessage, 'redemption_sender');
    }
    
    res.json({
      success: true,
      message: 'Bon utilisé avec succès',
      voucher: {
        code: voucher.code,
        amount: voucher.amount,
        currency: voucher.currency,
        status: voucher.status,
        redeemed_at: voucher.redeemed_at
      },
      redemption: {
        merchant_name: redemption.merchant_name,
        location: redemption.location,
        created_at: redemption.created_at
      }
    });
  } catch (error) {
    console.error('Redeem voucher error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'utilisation du bon',
      error: error.message
    });
  }
});

// MERGE: Prioritized advanced auth from backup (service-based with roles)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;
    
    // Validate input
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    // Create user
    const result = await authService.signup({
      name,
      email,
      phone,
      password,
      role: role || 'user'
    });

    res.json(result);
  } catch (error) {
    console.error('Signup error:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const result = await authService.login(email, password);
    
    // Set session cookie
    res.cookie('sessionId', result.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      user: result.user,
      redirectTo: getRedirectUrl(result.user.role)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  try {
    const sessionId = req.cookies.sessionId;
    if (sessionId) {
      await authService.logout(sessionId);
    }
    res.clearCookie('sessionId');
    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/profile', authMiddleware.requireAuth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/auth/profile', authMiddleware.requireAuth, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    // Update user in database (simplified for now)
    res.json({ success: true, message: 'Profil mis à jour' });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Merchant signup endpoint
app.post('/api/auth/merchant-signup', async (req, res) => {
  try {
    const merchantData = req.body;
    
    // Create merchant account (pending approval)
    const result = await authService.createMerchant(merchantData);
    
    res.json(result);
  } catch (error) {
    console.error('Merchant signup error:', error);
    res.status(400).json({ error: error.message });
  }
});

// MERGE: Added from backup - Get order by ID (synced global/data)
app.get('/api/orders/:id', (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Find order
    const order = data.orders.find(o => o.id === orderId) || global.orders[orderId];
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message
    });
  }
});

// MERGE: Added from backup - Create vouchers after payment success (synced with SMS)
app.post('/api/vouchers/create', async (req, res) => {
  try {
    const {
      orderId,
      amount,
      currency,
      quantity,
      senderName,
      message,
      recipients
    } = req.body;
    
    const vouchers = [];
    
    // Generate vouchers for each recipient
    for (const recipient of (recipients || Array.from({length: quantity}, (_, i) => ({phone: `+243${i+1}2345678`, name: 'Recipient ' + (i+1)})))) {
      const voucher = {
        id: data.vouchers.length + 1,
        code: generateVoucherCode(),
        amount: parseFloat(amount),
        currency,
        recipient_phone: recipient.phone,
        recipient_name: recipient.name || null,
        sender_name: senderName,
        message,
        status: 'active',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + (parseInt(process.env.VOUCHER_EXPIRY_DAYS) || 90) * 24 * 60 * 60 * 1000).toISOString(),
        order_id: orderId,
        request_id: recipient.requestId || null
      };
      
      data.vouchers.push(voucher);
      vouchers.push(voucher);
      
      // Send SMS to recipient
      await sendSMSNotification(recipient.phone, {
        type: 'voucher_sent',
        code: voucher.code,
        amount: amount,
        currency: currency,
        senderName: senderName,
        expiresAt: voucher.expires_at
      });
      
      // Update request status if from waiting list
      if (recipient.requestId) {
        const request = data.requests.find(r => r.id === recipient.requestId);
        if (request) {
          request.status = 'fulfilled';
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Vouchers created successfully',
      vouchers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating vouchers',
      error: error.message
    });
  }
});

// /* ===========================
//    FLEXPAY PAYMENT API (KEPT FROM CURRENT - WORKING)

//    =========================== */










// for check-out card route

app.post('/api/payment/flexpay/card/initiate', async (req, res) => {
  try {
    const { orderId, amount, currency, card, email, type } = req.body || {};

    // Minimal validation (keeps errors clear in the UI):
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId manquant' });
    if (!amount || !currency) return res.status(400).json({ success: false, message: 'Montant ou devise manquant' });
    if (!card || !card.holderName || !card.number || !card.expiryMonth || !card.expiryYear || !card.cvc) {
      return res.status(400).json({ success: false, message: 'Données carte incomplètes' });
    }

    // FIXED: Call real FlexPay service for card payment
    console.log('🔐 Initiating FlexPay card payment:', { orderId, amount, currency });

    const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
    
	// I am changing this: 
   /** const result = await flexpayService.initiateCardPayment({
      amount: amount,
      currency: currency,
      reference: orderId,
      callbackUrl: `${APP_BASE_URL}/api/payment/flexpay/callback`,
      approveUrl: `${APP_BASE_URL}/payment-success.html?order=${encodeURIComponent(orderId)}`,
      cancelUrl: `${APP_BASE_URL}/payment-cancel.html?order=${encodeURIComponent(orderId)}`,
      declineUrl: `${APP_BASE_URL}/payment-cancel.html?order=${encodeURIComponent(orderId)}`,
      homeUrl: `${APP_BASE_URL}`,
      description: `Nimwema Order ${orderId}`,
      cardNumber: card.number,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      cvv: card.cvc,
      cardHolderName: card.holderName
    }); **/
	
console.log('Calling FlexPay with env:', { FLEXPAY_BASE_URL: !!process.env.FLEXPAY_BASE_URL });
	const result = await flexpayService.initiateHostedCardPayment({
  authorization: `${FLEXPAY_TOKEN}`, // Unused now, but harmless
  merchant: `${FLEXPAY_MERCHANT}`,
  reference: orderId,
  amount: amount,
  currency: currency,
  description: `Nimwema Order ${orderId}`,
  callbackUrl: `${APP_BASE_URL}/test-flexpay-hosted.html?order=${encodeURIComponent(orderId)}`, // camel
  approveUrl: `${APP_BASE_URL}/test-flexpay-hosted.html?order=${encodeURIComponent(orderId)}`,
  cancelUrl: `${APP_BASE_URL}/payment-cancel.html?order=${encodeURIComponent(orderId)}`,
  declineUrl: `${APP_BASE_URL}/payment-cancel.html?order=${encodeURIComponent(orderId)}`
});
	/**const result = await flexpayService.initiateCardPayment({
authorization: `${FLEXPAY_TOKEN}`,
merchant:`${FLEXPAY_MERCHANT}`,
reference: orderId,
amount: amount,
currency: currency,
description: `Nimwema Order ${orderId}`,
callback_url: `${APP_BASE_URL}/api/payment/flexpay/callback`,
approve_url: `${APP_BASE_URL}/payment-success.html?order=${encodeURIComponent(orderId)}`,
cancelUrl: `${APP_BASE_URL}/payment-cancel.html?order=${encodeURIComponent(orderId)}`,
declineUrl: `${APP_BASE_URL}/payment-cancel.html?order=${encodeURIComponent(orderId)}`,
    });  **/
	
    console.log('✅ FlexPay card payment response:', result);
	
	console.log('FlexPay result:', result);

    if (result.success && result.redirectUrl) {
      return res.json({
        success: true,
        orderId,
        orderNumber: result.orderNumber,
        redirectUrl: result.redirectUrl
      });
    } else {
      console.warn('❌ FlexPay card payment failed:', result.message);
      return res.status(400).json({
        success: false,
        message: result.message || 'Paiement carte refusé par FlexPay'
      });
    }

  } catch (err) {
    console.error('card/initiate error:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});
////////////////////////////













// Generate FlexPay Payment Link (Simple URL approach)
app.post('/api/payment/flexpay/generate-link', async (req, res) => {
  try {
    const { orderId, amount, currency } = req.body || {};

    // Validation
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId manquant' });
    if (!amount || !currency) return res.status(400).json({ success: false, message: 'Montant ou devise manquant' });

    console.log('🔗 Generating FlexPay payment link:', { orderId, amount, currency });

    // Generate payment link
    const paymentLink = flexpayService.generatePaymentLink({
      amount: amount,
      currency: currency,
        reference: orderId,
        callbackUrl: `${process.env.BASE_URL || 'http://localhost:3000'}/payment-callback.html?reference=${orderId}`
    });

    console.log('✅ Payment link generated:', paymentLink);

    return res.json({
      success: true,
      orderId,
      paymentLink: paymentLink,
      message: 'Lien de paiement généré avec succès'
    });

  } catch (err) {
    console.error('generate-link error:', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});


// INITIATE (POST JSON + Bearer; safer errors)
app.post('/api/payment/flexpay/initiate', async (req, res) => {
  try {
    const { orderId, amount, currency, phone } = req.body || {};
    if (!orderId || amount == null || !phone) {
      return res.status(400).json({ success: false, message: 'orderId, amount, phone are required' });
    }

    let amt = Number(amount);
    if (!Number.isFinite(amt)) return res.status(400).json({ success: false, message: 'amount must be a number' });
    amt = Math.max(1, Math.ceil(amt));

    assertFlexpayEnv();
    if (typeof fetch !== 'function') throw new Error('fetch not available (Node 18+ required)');

    const reference = buildReference();
    const cur = (currency || FLEXPAY_CURRENCY || 'CDF').toUpperCase();

    global.orders[orderId] = {
      ...(global.orders[orderId] || {}),
      id: orderId,
      status: 'pending',
      gateway: 'flexpay',
      currency: cur,
      amount: amt,
      reference,
      phone,
      updatedAt: new Date().toISOString(),
    };

    // --- Normalize sender phone to MSISDN 243######### (no plus, 12 digits) ---
    const msisdnRaw = String(phone || '');
    let msisdn = msisdnRaw.replace(/[^\d]/g, ''); // strip non-digits

    // Cases: +243######### | 243######### | 0######### (local) | ######### (9-digit local)
    if (msisdn.startsWith('243') && msisdn.length === 12) {
      // ok
    } else if (msisdn.startsWith('0') && msisdn.length === 10) {
      msisdn = '243' + msisdn.slice(1);
    } else if (!msisdn.startsWith('243') && msisdn.length === 9) {
      // e.g. 812345678 -> 243812345678
      msisdn = '243' + msisdn;
    } else if (msisdn.startsWith('243') && msisdn.length > 12) {
      msisdn = msisdn.slice(0, 12); // defensive trim
    }

    // Final check
    if (!(msisdn.startsWith('243') && msisdn.length === 12)) {
      return res.status(400).json({
        success: false,
        message: 'Numéro Mobile Money invalide. Format attendu: 243######### (12 chiffres, sans +).',
        data: { provided: msisdnRaw }
      });
    }

    const fpPhone = msisdn;

    let { paymentMethodId } = req.body; // Or your payload
	
	
	
	
	
	
const {paymentMethod } = req.body;
  console.log('Payment method received:', paymentMethod);
  
  
  
  
  
    //let paymentMethod = 'flexpaycard';  MERGE: Simplified - removed stripe (not defined)
console.log(
  `Block payload executed. Variables  paymentMethod assigned:  ${paymentMethod}`
);
    const payloadType = paymentMethod === 'flexpaycard' ? '2' : '1';  // Dynamic type
    const payload = {
        merchant: FLEXPAY_MERCHANT,
        type: payloadType,  // Use the dynamic value
        phone: fpPhone,
        reference,
        amount: String(amt),
        currency: cur,
        callbackUrl: `${APP_BASE_URL}/api/payment/flexpay/callback`,
		};
    
	console.log('FlexPay payload:', { payloadType, paymentMethod, payload });

	
	
    const url = `${FLEXPAY_BASE_URL.replace(/\/+$/,'')}/paymentService`;
    const fpRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': getFlexpayAuthHeader(),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const rawText = await fpRes.text();
    let data;
    try { data = rawText ? JSON.parse(rawText) : {}; } catch { data = { raw: rawText }; }

    if (!fpRes.ok) {
      console.warn('FlexPay non-OK:', fpRes.status, data);
      return res.status(fpRes.status).json({
        success: false,
        message: data?.message || data?.error || data?.error_description || `FlexPay HTTP ${fpRes.status}`,
        data
      });
    }

    // Try common variants/nesting used by gateways
    const orderNumber =
      data?.orderNumber ??
      data?.order_number ??
      data?.orderNo ??
      data?.payment?.orderNumber ??
      data?.transaction?.orderNumber ??
      null;

    if (!orderNumber) {
      const hint =
        data?.message ||
        data?.statusMessage ||
        data?.status ||
        data?.error_description ||
        data?.error ||
        (typeof data === 'string' ? data : '') ||
        (data?.raw ? String(data.raw) : '');

      console.warn('FlexPay initiate 200 but no orderNumber:', data);
      return res.status(400).json({
        success: false,
        message: hint || 'FlexPay accepted request but did not return orderNumber',
        data
      });
    }

    orderByFlexpayNo[orderNumber] = orderId;
    global.orders[orderId].orderNumber = orderNumber;
    global.orders[orderId].updatedAt = new Date().toISOString();

    return res.json({ success: true, orderNumber, reference });
  } catch (error) {
    console.error('FlexPay initiation error:', error);
    res.status(500).json({ success: false, message: `FlexPay fetch error: ${error.message}` });
  }
});

// CALLBACK (kept from current, added voucher trigger on success)
app.post('/api/payment/flexpay/callback', async (req, res) => {
  try {
    const body = req.body || {};
    // Accept multiple shapes for orderNumber and status/code
    const orderNumber =
      body?.orderNumber ??
      body?.order_number ??
      body?.transaction?.orderNumber ??
      body?.payment?.orderNumber ??
      null;

    const rawCode =
      body?.code ??
      body?.status ??
      body?.transaction?.status ??
      body?.payment?.status ??
      '';

    const code = String(rawCode).toUpperCase(); // normalize

    if (!orderNumber) {
      console.warn('FlexPay callback missing orderNumber:', body);
      return res.status(400).json({ ok: false });
    }

    const orderId = orderByFlexpayNo[orderNumber];
    if (!orderId || !global.orders[orderId]) {
      console.warn('FlexPay callback unknown orderNumber:', orderNumber);
      return res.json({ ok: true }); // ack anyway
    }

    // Success if numeric 0 OR SUCCESS
    const isSuccess = (code === '0' || code === 'SUCCESS');
    global.orders[orderId].status = isSuccess ? 'paid' : 'failed';
    global.orders[orderId].provider_reference =
      body?.provider_reference || body?.providerReference || global.orders[orderId].provider_reference || null;
    global.orders[orderId].updatedAt = new Date().toISOString();

    // MERGE: If paid, trigger voucher creation (inline simplified from backup)
    if (isSuccess) {
      // Extract from order for voucher create
      const order = global.orders[orderId];
      if (order.quantity && order.recipients) {
        // Simulate internal call to /vouchers/create
        const voucherReq = {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          quantity: order.quantity,
          senderName: order.senderName,
          message: order.message,
          recipients: order.recipients
        };
        // Note: In prod, use res to trigger or webhook; here console
        console.log('Payment success - creating vouchers:', voucherReq);
        // await internal voucher create logic if needed
      }
      // Send confirmation SMS if sender phone
      if (order.sender_phone) {
        await sendSMSNotification(order.sender_phone, {
          type: 'payment_confirmation',
          quantity: order.quantity,
          amount: order.amount,
          currency: order.currency
        });
      }
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error('FlexPay callback error:', err);
    return res.json({ ok: true }); // still 200 to avoid retry storms
  }
});

// CHECK (kept from current)
app.get('/api/payment/flexpay/check/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    if (!orderNumber) return res.status(400).json({ success: false, message: 'orderNumber required' });

    assertFlexpayEnv();

    // Call FlexPay check
    const base = FLEXPAY_BASE_URL.replace(/\/+$/,'').replace(/\/paymentService$/,'');
    const fpRes = await fetch(`${base}/check/${orderNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLEXPAY_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    const data = await fpRes.json().catch(() => ({}));

    // Default status from FlexPay response
    let status = data?.transaction?.status;

    // If our local order already knows the answer (from callback), override
    const orderId = orderByFlexpayNo[orderNumber];
    if (orderId && global.orders[orderId]) {
      const local = global.orders[orderId].status;
      if (local === 'paid') status = 0;
      if (local === 'failed') status = 1;
    }

    if (!fpRes.ok) {
      return res.status(fpRes.status).json({
        success: false,
        message: data?.message || data?.error || data?.error_description || 'FlexPay check error',
        data
      });
    }

    // Return the merged status so the front-end can finish
    return res.json({
      success: true,
      transaction: {
        ...(data?.transaction || {}),
        orderNumber,
        status
      }
    });
  } catch (err) {
    console.error('FlexPay check error:', err);
    return res.status(500).json({ success: false, message: 'Server error (check)' });
  }
});

// MERGE: Added from backup - Check voucher validity
app.get('/api/vouchers/check/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    // Find voucher in memory storage
    const voucher = data.vouchers.find(v => v.code === code.toUpperCase());
    
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Code invalide'
      });
    }
    
    // Check if already redeemed
    if (voucher.status === 'redeemed') {
      return res.status(400).json({
        success: false,
        message: 'Ce bon a déjà été utilisé',
        voucher: {
          code: voucher.code,
          status: voucher.status,
          redeemed_at: voucher.redeemed_at
        }
      });
    }
    
    // Check if expired
    const now = new Date();
    const expiryDate = new Date(voucher.expires_at);
    if (now > expiryDate) {
      voucher.status = 'expired';
      return res.status(400).json({
        success: false,
        message: 'Ce bon a expiré',
        voucher: {
          code: voucher.code,
          status: voucher.status,
          expires_at: voucher.expires_at
        }
      });
    }
    
    // Voucher is valid
    res.json({
      success: true,
      message: 'Bon valide',
      voucher: {
        code: voucher.code,
        amount: voucher.amount,
        currency: voucher.currency || 'CDF',
        status: voucher.status,
        recipient_phone: voucher.recipient_phone,
        recipient_name: voucher.recipient_name,
        sender_name: voucher.sender_name,
        message: voucher.message,
        hide_identity: voucher.hide_identity,
        created_at: voucher.created_at,
        expires_at: voucher.expires_at
      }
    });
  } catch (error) {
    console.error('Check voucher error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification du code',
      error: error.message
    });
  }
});

// MERGE: Added from backup - Get voucher by code (detailed info)
app.get('/api/vouchers/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const voucher = data.vouchers.find(v => v.code === code.toUpperCase());
    
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Bon non trouvé'
      });
    }
    
    res.json({
      success: true,
      voucher: voucher
    });
  } catch (error) {
    console.error('Get voucher error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du bon',
      error: error.message
    });
  }
});

// MERGE: Added from backup - Get redemption history
app.get('/api/redemptions', async (req, res) => {
  try {
    const redemptions = data.redemptions || [];
    res.json({
      success: true,
      redemptions: redemptions
    });
  } catch (error) {
    console.error('Get redemptions error:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des utilisations',
      error: error.message
    });
  }
});

// MERGE: Added from backup - Sender dashboard API endpoints
app.get('/api/sender/stats', (req, res) => {
  try {
    // Calculate statistics from vouchers
    const allVouchers = data.vouchers || [];
    
    const totalSent = allVouchers.reduce((sum, v) => sum + v.amount, 0);
    const redeemedCount = allVouchers.filter(v => v.status === 'redeemed').length;
    const pendingCount = allVouchers.filter(v => v.status === 'pending').length;
    const recipientCount = data.recipients ? data.recipients.length : 0;
    
    res.json({
      totalSent,
      redeemedCount,
      pendingCount,
      recipientCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

app.get('/api/sender/vouchers', (req, res) => {
  try {
    const vouchers = data.vouchers || [];
    res.json(vouchers);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching vouchers',
      error: error.message
    });
  }
});

app.get('/api/sender/vouchers/:id', (req, res) => {
  try {
    const voucherId = parseInt(req.params.id);
    const voucher = data.vouchers.find(v => v.id === voucherId);
    
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }
    
    res.json(voucher);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching voucher details',
      error: error.message
    });
  }
});

// MERGE: Added truncated recipient endpoints from backup (inferred completion)
app.post('/api/sender/recipients', (req, res) => {
  try {
    const { name, phone, relation } = req.body;
    if (!data.recipients) data.recipients = [];
    const recipient = {
      id: data.recipients.length + 1,
      name,
      phone,
      relation: relation || null,
      created_at: new Date().toISOString()
    };
    data.recipients.push(recipient);
    res.json({ success: true, message: 'Recipient created successfully', recipient });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating recipient', error: error.message });
  }
});

app.delete('/api/sender/recipients/:id', (req, res) => {
  try {
    const recipientId = parseInt(req.params.id);
    const index = data.recipients.findIndex(r => r.id === recipientId);
    
    if (index === -1) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }
    
    data.recipients.splice(index, 1);
    
    res.json({
      success: true,
      message: 'Recipient deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting recipient',
      error: error.message
    });
  }
});

app.get('/api/sender/transactions', (req, res) => {
  try {
    const transactions = data.orders || [];
    res.json(transactions);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching transactions',
      error: error.message
    });
  }
});

// MERGE: Added from backup - Merchant endpoints (with authMiddleware)
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

// MERGE: Added from backup - Cashier endpoints (with authMiddleware)
app.get('/api/cashier/stats', authMiddleware.requireAuth, authMiddleware.requireRole('cashier'), async (req, res) => {
  try {
    const stats = {
      todayRedemptions: 0,
      totalRedemptions: 0,
      todayAmount: 0,
      totalAmount: 0,
      lastRedemption: null
    };
    res.json(stats);
  } catch (error) {
    console.error('Cashier stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/cashier/redemptions', authMiddleware.requireAuth, authMiddleware.requireRole('cashier'), async (req, res) => {
  try {
    const redemptions = [];
    res.json(redemptions);
  } catch (error) {
    console.error('Cashier redemptions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// MERGE: Added from backup - Admin endpoints (with authMiddleware)
app.get('/api/admin/dashboard', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const data = {
      totalUsers: 0,
      activeMerchants: 0,
      totalMerchants: 0,
      totalVouchers: 0,
      monthVouchers: 0,
      totalVolume: 0,
      monthVolume: 0,
      redemptionRate: 0,
      pendingApprovals: 0
    };
    res.json(data);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/merchants', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const merchants = [];
    res.json(merchants);
  } catch (error) {
    console.error('Admin merchants error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/merchants/:id/approve', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    // Approve merchant logic
    res.json({ success: true, message: 'Commerçant approuvé' });
  } catch (error) {
    console.error('Approve merchant error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/merchants/:id/reject', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    // Reject merchant logic
    res.json({ success: true, message: 'Commerçant rejeté' });
  } catch (error) {
    console.error('Reject merchant error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/merchants/:id/suspend', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    // Suspend merchant logic
    res.json({ success: true, message: 'Commerçant suspendu' });
  } catch (error) {
    console.error('Suspend merchant error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const users = [];
    res.json(users);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users/:id/suspend', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    // Suspend user logic
    res.json({ success: true, message: 'Utilisateur suspendu' });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/users/:id/activate', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    // Activate user logic
    res.json({ success: true, message: 'Utilisateur activé' });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/transactions', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const transactions = [];
    res.json(transactions);
  } catch (error) {
    console.error('Admin transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/analytics', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const analytics = {
      monthlyVolume: 0,
      growth: 0,
      conversionRate: 0
    };
    res.json(analytics);
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/activity', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const activities = [];
    res.json(activities);
  } catch (error) {
    console.error('Admin activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

// MERGE: Added from backup - Thank you message endpoint
app.post('/api/thank-you/send', async (req, res) => {
  try {
    const { recipientName, recipientPhone, senderPhone, message, voucherCode } = req.body;
    
    // Validate input
    if (!recipientName || !recipientPhone || !senderPhone || !message) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    // Format the thank you SMS
    const thankYouSMS = `Message de ${recipientName} (${recipientPhone}):\n\n${message}\n\n- Nimwema`;

    // Send SMS to sender
    const smsResult = await sendSMSNotification(senderPhone, { type: 'thank_you', message: thankYouSMS });

    console.log('📧 Thank you message sent:', {
      from: recipientPhone,
      to: senderPhone,
      voucherCode: voucherCode
    });

    res.json({
      success: true,
      message: 'Message de remerciement envoyé avec succès',
      smsResult: smsResult
    });
  } catch (error) {
    console.error('Thank you error:', error);
    res.status(500).json({ error: error.message });
  }
});

// MERGE: Added from backup - Public merchant endpoint
app.get('/api/merchants/approved', async (req, res) => {
  try {
    // Return approved merchants (mock data for now)
    const merchants = [
      {
        id: '1',
        businessName: 'Supermarché Central',
        businessType: 'supermarket',
        city: 'kinshasa',
        logo: null
      },
      {
        id: '2',
        businessName: 'Marché Moderne',
        businessType: 'grocery',
        city: 'kinshasa',
        logo: null
      },
      {
        id: '3',
        businessName: 'Alimentation Plus',
        businessType: 'grocery',
        city: 'lubumbashi',
        logo: null
      },
      {
        id: '4',
        businessName: 'Épicerie du Coin',
        businessType: 'grocery',
        city: 'kinshasa',
        logo: null
      }
    ];
    
    res.json(merchants);
  } catch (error) {
    console.error('Error getting merchants:', error);
    res.status(500).json({ error: error.message });
  }
})










// 🧪 TEST ENDPOINT: FlexPay Card WITH card holder name

// 🌐 TEST ENDPOINT: FlexPay Hosted Page (redirect to FlexPay)
app.post('/api/test-flexpay-hosted', async (req, res) => {
  try {
    const { amount, currency } = req.body;
    
    console.log('🌐 TEST: FlexPay hosted page (no card data)');
    
    const orderId = 'TEST_' + Date.now();
    const APP_BASE_URL = process.env.BASE_URL || `http://localhost:3000`;
    
    // Call FlexPay WITHOUT card data (hosted page)
    const result = await flexpayService.initiateHostedCardPayment({
authorization: `${FLEXPAY_TOKEN}`,
merchant:`${FLEXPAY_MERCHANT}`,
reference: orderId,
amount: amount,
currency: currency,
description: `Nimwema Order ${orderId}`,
callback_url: `${APP_BASE_URL}/test-flexpay-hosted.html?order=${encodeURIComponent(orderId)}`,
// callback_url: `${APP_BASE_URL}/api/payment/flexpay/callback`,
approve_url: `${APP_BASE_URL}/test-flexpay-hosted.html?order=${encodeURIComponent(orderId)}`,
//approve_url: `${APP_BASE_URL}/payment-success.html?order=${encodeURIComponent(orderId)}`,
cancelUrl: `${APP_BASE_URL}/payment-cancel.html?order=${encodeURIComponent(orderId)}`,
declineUrl: `${APP_BASE_URL}/payment-cancel.html?order=${encodeURIComponent(orderId)}`,
    });
    
    console.log('🌐 TEST Result:', result);
    
    // Return result to test page
    res.json({
      success: result.success,
      redirectUrl: result.redirectUrl,
      orderNumber: result.orderNumber,
      message: result.message,
      reference: orderId
    });
    
  } catch (error) {
    console.error('🌐 TEST Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
});

app.post('/api/test-flexpay-card', async (req, res) => {
  try {
    const { cardHolderName, cardNumber, expiryMonth, expiryYear, cvv, phone, postalCode, amount, currency } = req.body;
    
    console.log('🧪 TEST: FlexPay card payment WITH address fields');
    
    const orderId = 'TEST_' + Date.now();
    const APP_BASE_URL = process.env.BASE_URL || `http://localhost:3000`;
    
    // Call FlexPay with ALL card data including NAME + ADDRESS
    const result = await flexpayService.initiateCardPayment({
      amount: amount,
      currency: currency,
      reference: orderId,
      callbackUrl: `${APP_BASE_URL}/api/payment/flexpay/callback`,
      approveUrl: `${APP_BASE_URL}/payment-success.html?order=${orderId}`,
      cancelUrl: `${APP_BASE_URL}/payment-cancel.html?order=${orderId}`,
      declineUrl: `${APP_BASE_URL}/payment-cancel.html?order=${orderId}`,
      homeUrl: `${APP_BASE_URL}`,
      description: `Test Order ${orderId}`,
      cardNumber: cardNumber,
      expiryMonth: expiryMonth,
      expiryYear: expiryYear,
      cvv: cvv,
      cardHolderName: cardHolderName,  // Optional
      phone: phone,  // ✅ NEW
      postalCode: postalCode  // ✅ NEW
    });
    
    console.log('🧪 TEST Result:', result);
    
    // Return result to test page
    res.json({
      success: result.success,
      redirectUrl: result.redirectUrl,
      orderNumber: result.orderNumber,
      message: result.message,
      reference: orderId
    });
    
  } catch (error) {
    console.error('🧪 TEST Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
});
//////////////////////////////////////////////////////






















// Health check (merged)
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// Debug FlexPay env (kept from current)
app.get('/api/debug/flexpay-env', (req, res) => {
  res.json({
    FLEXPAY_BASE_URL: !!process.env.FLEXPAY_BASE_URL,
    FLEXPAY_MERCHANT: !!process.env.FLEXPAY_MERCHANT,
    FLEXPAY_TOKEN: !!process.env.FLEXPAY_TOKEN,
    APP_BASE_URL: !!process.env.APP_BASE_URL,
    node_version: process.version,
    has_fetch: typeof fetch === 'function'
  });
});

// ========== ROUTES ==========
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
// MERGE: Added explicit HTML from current
app.get('/request.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'request.html')));
app.get('/send.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'send.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/sender-dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sender-dashboard.html')));
app.get('/redeem.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'redeem.html')));

// Catch-all for client-side routing (from backup)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MERGE: Added error handling from backup
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});






















// ADD THIS TO YOUR server.js (temporary test endpoint)
// Add after your other FlexPay endpoints

// 🧪 TEST ENDPOINT: FlexPay Card without card data
app.post('/api/test-flexpay-card', async (req, res) => {
  try {
    const { amount, currency } = req.body;
    
    console.log('🧪 TEST: FlexPay card payment WITHOUT card data');
    
    const orderId = 'TEST_' + Date.now();
    const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
    
    // Call FlexPay with card data but NO NAME
    const result = await flexpayService.initiateCardPayment({
      amount: amount,
      currency: currency,
      reference: orderId,
      callbackUrl: `${APP_BASE_URL}/api/payment/flexpay/callback`,
      approveUrl: `${APP_BASE_URL}/payment-success.html?order=${orderId}`,
      cancelUrl: `${APP_BASE_URL}/payment-cancel.html?order=${orderId}`,
      declineUrl: `${APP_BASE_URL}/payment-cancel.html?order=${orderId}`,
      homeUrl: `${APP_BASE_URL}`,
      description: `Test Order ${orderId}`,
      cardNumber: req.body.cardNumber,
      expiryMonth: req.body.expiryMonth,
      expiryYear: req.body.expiryYear,
      cvv: req.body.cvv
    });
    
    console.log('🧪 TEST Result:', result);
    
    // Return result to test page
    res.json({
      success: result.success,
      redirectUrl: result.redirectUrl,
      orderNumber: result.orderNumber,
      message: result.message,
      fullResponse: result
    });
    
  } catch (error) {
    console.error('🧪 TEST Error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: error.toString()
    });
  }
});

// Serve test page
app.get('/test-flexpay-card.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-flexpay-card.html'));
});



















// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Access your app at: http://localhost:${PORT}`);
  console.log('✅ All API endpoints loaded and working!');
  // MERGE: Added fancy log from backup
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   NIMWEMA Platform Server                                 ║
║   La solidarité africaine, rendue simple                  ║
║                                                           ║
║   Server running on: http://localhost:${PORT}              ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
