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

// ---------------- Nimwema payment config ----------------
const FLEXPAY_BASE_URL = process.env.FLEXPAY_BASE_URL || 'https://backend.flexpay.cd/api/rest/v1';
const FLEXPAY_MERCHANT = process.env.FLEXPAY_MERCHANT || 'CPOSSIBLE';
const FLEXPAY_TOKEN    = process.env.FLEXPAY_TOKEN?.trim();
const FLEXPAY_CURRENCY = (process.env.FLEXPAY_CURRENCY || 'CDF').toUpperCase();
const APP_BASE_URL     = process.env.APP_BASE_URL || 'https://nimwema-platform.onrender.com';

global.orders = global.orders || {};
const orderByFlexpayNo = {};

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

// Helper to normalize Bearer header safely
function getFlexpayAuthHeader() {
  let t = (FLEXPAY_TOKEN || '').trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1).trim();
  }
  if (/^Bearer\s+/i.test(t)) return t;
  return `Bearer ${t}`;
}

// ========== API ENDPOINTS ==========

// Exchange Rate (simple fallback)
app.get('/api/exchange-rate', async (req, res) => {
  res.json({
    success: true,
    rate: 2200,
    currency: 'CDF',
    base: 'USD',
    timestamp: new Date().toISOString()
  });
});

// Create order (test)
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
    res.json({ success: true, orderId, message: 'Order created successfully' });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

// Vouchers: create pending
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

/* ===========================
   FLEXPAY PAYMENT API (FINAL)
   =========================== */

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

let paymentMethod;
if (paymentMethodId) {
    paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId).catch(() => null);
}

if (!paymentMethod?.id) {
    paymentMethod = 'flexpay';
}




    
    const payloadType = paymentMethod === 'flexpaycard' ? '2' : '1';  // Dynamic type
    const payload = {
        merchant: FLEXPAY_MERCHANT,
        type: payloadType,  // Use the dynamic value
        phone: fpPhone,
        reference,
        amount: String(amt),
        currency: cur,
        callbackUrl: `${APP_BASE_URL}/api/payment/flexpay/callback`
    }
    
 












   /** const payload = {
      merchant: FLEXPAY_MERCHANT,
      type: "1",
      phone: fpPhone,  
      reference,
      amount: String(amt),
      currency: cur,
      callbackUrl: `${APP_BASE_URL}/api/payment/flexpay/callback`
    }; **/
	
	

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

// CALLBACK
// CALLBACK (more tolerant fields)
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

    return res.json({ ok: true });
  } catch (err) {
    console.error('FlexPay callback error:', err);
    return res.json({ ok: true }); // still 200 to avoid retry storms
  }
});


// CHECK (proxies FlexPay /check/{orderNumber})
// CHECK (proxies FlexPay /check/{orderNumber} + honors local callback state)
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


// Health check
app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date().toISOString() }));

// ========== ROUTES ==========
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/request.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'request.html')));
app.get('/send.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'send.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/sender-dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sender-dashboard.html')));
app.get('/redeem.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'redeem.html')));

// Debug FlexPay env
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

// ========== START SERVER ==========
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Access your app at: http://localhost:${PORT}`);
  console.log('✅ All API endpoints loaded and working!');
});

module.exports = app;
