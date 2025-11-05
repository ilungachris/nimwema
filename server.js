// COMPLETE SERVER.JS WITH ALL API ENDPOINTS

const express = require('express');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware 
app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'nimwema_secret_2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    store: new session.MemoryStore({
        checkPeriod: 86400000 // Clear expired sessions every 24h
    })
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// ---------------- Nimwema payment config (ADD) ----------------
const FLEXPAY_BASE_URL = process.env.FLEXPAY_BASE_URL || 'https://backend.flexpay.cd/api/rest/v1';
const FLEXPAY_MERCHANT = process.env.FLEXPAY_MERCHANT || 'CPOSSIBLE';
const FLEXPAY_TOKEN    = process.env.FLEXPAY_TOKEN; // secret (Render env)
const FLEXPAY_CURRENCY = (process.env.FLEXPAY_CURRENCY || 'CDF').toUpperCase();
const APP_BASE_URL     = process.env.APP_BASE_URL || 'https://nimwema-platform.onrender.com';

// In-memory store (you requested this)
global.orders = global.orders || {};   // { [orderId]: {...} }
const orderByFlexpayNo = {};           // { [orderNumber]: orderId }

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

// ========== API ENDPOINTS ==========

// EXCHANGE RATE API - ALREADY EXISTS, KEEPING AS IS
app.get('/api/exchange-rate', async (req, res) => {
    try {
        res.json({
            success: true,
            rate: 2200,
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

// ORDERS API - ALREADY EXISTS, KEEPING AS IS
app.post('/api/orders/create', async (req, res) => {
    try {
        const orderData = req.body;
        const orderId = 'ORDER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        if (!global.orders) global.orders = {};
        global.orders[orderId] = {
            ...orderData,
            id: orderId,
            status: 'pending',
            createdAt: new Date()
        };
        
        res.json({
            success: true,
            orderId: orderId,
            message: 'Order created successfully'
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
});

// VOUCHERS CREATE PENDING API - previously missing orderId in response
app.post('/api/vouchers/create-pending', async (req, res) => {
    try {
        const orderData = req.body;
        const orderId = 'ORDER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        if (!global.orders) global.orders = {};
        global.orders[orderId] = {
            ...orderData,
            id: orderId,
            status: 'pending',
            createdAt: new Date()
        };
        
        res.json({
            success: true,
            orderId, // (ADD) make it easy for front-end
            order: {
                id: orderId,
                ...orderData,
                status: 'pending',
                createdAt: new Date()
            },
            message: 'Pending order created successfully'
        });
    } catch (error) {
        console.error('Create pending order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create pending order'
        });
    }
});

/* ===========================
   FLEXPAY PAYMENT API (FIXED)
   ===========================
   - Replaces the previous insecure GET-with-token route
   - Adds callback and real check
*/

// INITIATE (REPLACED: removes token-in-URL, uses POST JSON + Bearer header)
app.post('/api/payment/flexpay/initiate', async (req, res) => {
  try {
    const { orderId, amount, currency, phone } = req.body || {};
    if (!orderId || !amount || !phone) {
      return res.status(400).json({ success: false, message: 'orderId, amount, phone are required' });
    }
    assertFlexpayEnv();

    const reference = buildReference();
    const cur = (currency || FLEXPAY_CURRENCY || 'CDF').toUpperCase();

    global.orders[orderId] = {
      ...(global.orders[orderId] || {}),
      id: orderId,
      status: 'pending',
      gateway: 'flexpay',
      currency: cur,
      amount,
      reference,
      orderNumber: null,
      phone,
      provider_reference: null,
      updatedAt: new Date().toISOString(),
    };

    const payload = {
      merchant: FLEXPAY_MERCHANT,
      type: "1",               // 1 = MoMo
      phone: phone,            // payer MoMo
      reference: reference,    // NM-{timestamp}-{6rand}
      amount: String(amount),
      currency: cur,           // CDF
      callbackUrl: `${APP_BASE_URL}/api/payment/flexpay/callback`
    };

    const fpRes = await fetch(`${FLEXPAY_BASE_URL}/paymentService`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${FLEXPAY_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await fpRes.json().catch(() => ({}));
    if (!fpRes.ok) {
      return res.status(fpRes.status).json({ success: false, message: data?.message || 'FlexPay error', data });
    }

    const orderNumber = data?.orderNumber;
    if (!orderNumber) {
      return res.status(502).json({ success: false, message: 'Missing orderNumber from FlexPay', data });
    }

    orderByFlexpayNo[orderNumber] = orderId;
    global.orders[orderId].orderNumber = orderNumber;
    global.orders[orderId].updatedAt = new Date().toISOString();

    return res.json({ success: true, orderNumber, reference });
  } catch (error) {
    console.error('FlexPay initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment service unavailable'
    });
  }
});

// CALLBACK (NEW)
app.post('/api/payment/flexpay/callback', async (req, res) => {
  try {
    const body = req.body || {};
    const code = String(body?.code ?? '');
    const orderNumber = body?.orderNumber;
    const providerRef = body?.provider_reference || body?.providerReference || null;

    if (!orderNumber) {
      console.warn('FlexPay callback missing orderNumber:', body);
      return res.status(400).json({ ok: false });
    }

    const orderId = orderByFlexpayNo[orderNumber];
    if (!orderId || !global.orders[orderId]) {
      console.warn('FlexPay callback unknown orderNumber:', orderNumber);
      return res.json({ ok: true }); // ack anyway
    }

    const isSuccess = (code === '0' || code === 0);
    global.orders[orderId].status = isSuccess ? 'paid' : 'failed';
    global.orders[orderId].provider_reference = providerRef;
    global.orders[orderId].updatedAt = new Date().toISOString();

    return res.json({ ok: true });
  } catch (err) {
    console.error('FlexPay callback error:', err);
    return res.json({ ok: true }); // still 200 to avoid retry storms
  }
});

// CHECK (REPLACED: now proxies FlexPay /check/{orderNumber})
app.get('/api/payment/flexpay/check/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    if (!orderNumber) return res.status(400).json({ success: false, message: 'orderNumber required' });

    assertFlexpayEnv();

    const fpRes = await fetch(`${FLEXPAY_BASE_URL}/check/${orderNumber}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${FLEXPAY_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    const data = await fpRes.json().catch(() => ({}));
    if (!fpRes.ok) {
      return res.status(fpRes.status).json({ success: false, message: data?.message || 'FlexPay check error', data });
    }

    const orderId = orderByFlexpayNo[orderNumber];
    const transaction = data?.transaction;
    if (orderId && transaction && global.orders[orderId]) {
      if (transaction.status === 0) global.orders[orderId].status = 'paid';
      if (transaction.status === 1) global.orders[orderId].status = 'failed';
      global.orders[orderId].updatedAt = new Date().toISOString();
    }

    return res.json({ success: true, ...data });
  } catch (err) {
    console.error('FlexPay check error:', err);
    return res.status(500).json({ success: false, message: 'Server error (check)' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ========== ROUTES ==========

// Serve all HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/request.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'request.html'));
});

app.get('/send.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'send.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/sender-dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sender-dashboard.html'));
});

app.get('/redeem.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'redeem.html'));
});

// ========== START SERVER ==========

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📱 Access your app at: http://localhost:${PORT}`);
    console.log('✅ All API endpoints loaded and working!');
});

module.exports = app;
