const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const session = require('express-session');
require('dotenv').config();

// Import Services
const FlexPayService = require('./services/flexpay');
const SMSService = require('./services/sms');

const flexpay = new FlexPayService();
const sms = new SMSService();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'nimwema-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Serve static files
app.use(express.static('public'));

// In-memory data storage (for demo purposes)
// In production, this would be replaced with a proper database
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
  requests: []
};

// Helper function to generate voucher code
function generateVoucherCode() {
  const length = parseInt(process.env.VOUCHER_CODE_LENGTH) || 12;
  let code = '';
  for (let i = 0; i < length; i++) {
    code += Math.floor(Math.random() * 10);
  }
  return code;
}

// API Routes

// Get merchants
app.get('/api/merchants', (req, res) => {
  res.json(data.merchants);
});

// Send voucher
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

// Request voucher
app.post('/api/vouchers/request', async (req, res) => {
  try {
    const { firstName, lastName, phone, message, requestType, senderName, senderPhone } = req.body;
    
    const request = {
      id: data.requests.length + 1,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      phone,
      message,
      requestType, // 'waiting_list' or 'known_sender'
      senderName: senderName || null,
      senderPhone: senderPhone || null,
      status: 'pending',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString() // 48 hours
    };
    
    data.requests.push(request);
    
    // Send SMS notification
    if (requestType === 'known_sender' && senderPhone) {
      await sms.sendRequestNotification(
        senderPhone,
        request.fullName,
        message
      );
    }
    
    res.json({
      success: true,
      message: 'Request submitted successfully',
      request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting request',
      error: error.message
    });
  }
});

// Helper function to send SMS (simulated)
async function sendSMSNotification(phone, data) {
  console.log('\n📱 SMS NOTIFICATION');
  console.log('To:', phone);
  console.log('Type:', data.type);
  
  try {
    let result;
    
    if (data.type === 'voucher_request') {
      // Send request notification
      result = await sms.sendRequestNotification(
        phone,
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
  
  data.smsLogs.push({
    phone,
    type: data.type,
    data,
    sent_at: new Date().toISOString()
  });
}

// Helper function to format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: 'CDF',
    minimumFractionDigits: 0
  }).format(amount);
}

// Get vouchers (for dashboard)
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

// Get requests (for dashboard)
app.get('/api/requests', (req, res) => {
  const { phone } = req.query;
  
  let requests = data.requests;
  
  if (phone) {
    requests = requests.filter(r => r.phone === phone);
  }
  
  res.json(requests);
});

// Delete request
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

// Get senders
app.get('/api/senders', (req, res) => {
  const { userId } = req.query;
  
  let senders = data.senders || [];
  
  if (userId) {
    senders = senders.filter(s => s.userId === parseInt(userId));
  }
  
  res.json(senders);
});

// Create sender
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

// Update sender
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

// Delete sender
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

// Redeem voucher
app.post('/api/vouchers/redeem', (req, res) => {
  try {
    const { code, merchant_id } = req.body;
    
    const voucher = data.vouchers.find(v => v.code === code);
    
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: 'Voucher not found'
      });
    }
    
    if (voucher.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Voucher already used or expired'
      });
    }
    
    // Check expiry
    if (new Date(voucher.expires_at) < new Date()) {
      voucher.status = 'expired';
      return res.status(400).json({
        success: false,
        message: 'Voucher has expired'
      });
    }
    
    // Redeem voucher
    voucher.status = 'redeemed';
    voucher.redeemed_at = new Date().toISOString();
    voucher.merchant_id = merchant_id;
    
    res.json({
      success: true,
      message: 'Voucher redeemed successfully',
      voucher
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error redeeming voucher',
      error: error.message
    });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { phone, password } = req.body;
    
    const user = data.users.find(u => u.phone === phone && u.password === password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    req.session.user = user;
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Exchange Rate APIs
// Get BCC.cd parallel rate (scraping attempt)
app.get('/api/exchange-rate/bcc', async (req, res) => {
  try {
    // In production, this would scrape BCC.cd website
    // For now, return null to fallback to API
    res.json({
      success: false,
      message: 'BCC scraping not implemented yet',
      rate: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching BCC rate',
      error: error.message
    });
  }
});

// Get exchange rate from API
app.get('/api/exchange-rate/api', async (req, res) => {
  try {
    // In production, fetch from ExchangeRate-API.com or similar
    // For demo, return a simulated rate
    const rate = 2200; // 1 USD = 2200 CDF
    
    res.json({
      success: true,
      rate: rate,
      source: 'API',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching API rate',
      error: error.message
    });
  }
});

// Get waiting list requests
app.get('/api/requests', (req, res) => {
  const { phone, status, requestType } = req.query;
  
  let requests = data.requests;
  
  // Filter by phone
  if (phone) {
    requests = requests.filter(r => r.phone === phone);
  }
  
  // Filter by status
  if (status) {
    requests = requests.filter(r => r.status === status);
  }
  
  // Filter by request type
  if (requestType) {
    requests = requests.filter(r => r.requestType === requestType);
  }
  
  res.json(requests);
});

// Create pending vouchers (for manual payment)
app.post('/api/vouchers/create-pending', (req, res) => {
  try {
    const {
      amount,
      currency,
      quantity,
      senderName,
      hideIdentity,
      message,
      coverFees,
      paymentMethod,
      recipientType,
      recipients
    } = req.body;
    
    // Generate order ID
    const orderId = 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    // Calculate totals
    const subtotal = amount * quantity;
    const feeAmount = subtotal * 0.035; // 3.5%
    const total = coverFees ? subtotal + feeAmount : subtotal;
    
    // Create order
    const order = {
      id: orderId,
      amount,
      currency,
      quantity,
      senderName: hideIdentity ? 'Anonymous' : senderName,
      message,
      coverFees,
      paymentMethod,
      recipientType,
      recipients,
      subtotal,
      feeAmount,
      total,
      status: 'pending_payment',
      created_at: new Date().toISOString()
    };
    
    // Store order (in production, save to database)
    if (!data.orders) {
      data.orders = [];
    }
    data.orders.push(order);
    
    res.json({
      success: true,
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
});

// Get order by ID
app.get('/api/orders/:id', (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Find order
    const order = data.orders ? data.orders.find(o => o.id === orderId) : null;
    
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

// Create vouchers after payment success
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
    for (const recipient of recipients) {
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

// FlexPay payment initiation
app.post('/api/payment/flexpay/initiate', async (req, res) => {
  try {
    const { orderId, amount, currency, phone } = req.body;
    
    // In production, call FlexPay API
    // For demo, return mock response
    
    const paymentData = {
      merchant: 'CPOSSIBLE',
      orderNumber: orderId,
      amount: amount,
      currency: currency,
      phone: phone,
      callbackUrl: `${process.env.BASE_URL}/api/payment/flexpay/callback`
    };
    
    // Mock FlexPay response
    res.json({
      success: true,
      message: 'Payment initiated',
      paymentUrl: `/payment/flexpay-redirect?order=${orderId}`,
      paymentData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error initiating payment',
      error: error.message
    });
  }
});

  // FlexPay payment callback
  app.post('/api/payment/flexpay/callback', async (req, res) => {
    try {
      console.log('FlexPay Callback Received:', req.body);
      
      // Parse callback data
      const callbackResult = flexpay.handleCallback(req.body);
      
      if (!callbackResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Invalid callback data'
        });
      }
      
      // Find order by reference
      const order = data.orders.find(o => o.id === callbackResult.reference);
      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Order not found'
        });
      }
      
      // Update order status based on callback
      if (callbackResult.status === 'completed') {
        order.status = 'paid';
        order.payment_status = 'completed';
        order.transaction_id = callbackResult.providerReference;
        order.flexpay_order_number = callbackResult.orderNumber;
        order.paid_at = new Date().toISOString();
        
        // Generate vouchers
        const vouchers = [];
        for (let i = 0; i < order.quantity; i++) {
          const voucherCode = generateVoucherCode();
          const voucher = {
            id: data.vouchers.length + 1,
            code: voucherCode,
            amount: order.amount,
            currency: order.currency,
            status: 'pending',
            recipient: order.recipients[i] || order.recipients[0],
            recipientName: order.recipientNames ? order.recipientNames[i] : null,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
            message: order.message,
            senderName: order.senderName,
            hideIdentity: order.hideIdentity,
            orderId: order.id
          };
          data.vouchers.push(voucher);
          vouchers.push(voucher);
        }
        
        order.vouchers = vouchers.map(v => v.code);
        
        // Send SMS notifications
        console.log(`SMS: Sending voucher codes to recipients`);
        for (const voucher of vouchers) {
          await sms.sendVoucherCode(
            voucher.recipient,
            voucher.code,
            voucher.amount,
            voucher.currency,
            voucher.hideIdentity ? null : voucher.senderName
          );
        }
        
        // Send confirmation to sender
        if (order.sender_phone) {
          await sms.sendPaymentConfirmation(
            order.sender_phone,
            order.id,
            order.amount,
            order.currency,
            order.quantity
          );
        }
        
        res.json({
          success: true,
          message: 'Payment processed successfully'
        });
      } else {
        order.status = 'failed';
        order.payment_status = 'failed';
        order.failed_at = new Date().toISOString();
        
        res.json({
          success: true,
          message: 'Payment failed'
        });
      }
    } catch (error) {
      console.error('FlexPay Callback Error:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing callback',
        error: error.message
      });
    }
  });

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Catch-all route - serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
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

// Error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});
// ============================================
// SENDER DASHBOARD API ENDPOINTS
// ============================================

// Get sender statistics
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

// Get all sent vouchers
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

// Get voucher details
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

// Get all recipients
app.get('/api/sender/recipients', (req, res) => {
  try {
    const recipients = data.recipients || [];
    res.json(recipients);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching recipients',
      error: error.message
    });
  }
});

// Add new recipient
app.post('/api/sender/recipients', (req, res) => {
  try {
    const { name, phone, notes } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name and phone are required'
      });
    }
    
    if (!data.recipients) {
      data.recipients = [];
    }
    
    const newRecipient = {
      id: data.recipients.length + 1,
      name,
      phone,
      notes: notes || '',
      vouchersReceived: 0,
      totalAmount: 0,
      createdAt: new Date()
    };
    
    data.recipients.push(newRecipient);
    
    res.json({
      success: true,
      message: 'Recipient added successfully',
      recipient: newRecipient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error adding recipient',
      error: error.message
    });
  }
});

// Update recipient
app.put('/api/sender/recipients/:id', (req, res) => {
  try {
    const recipientId = parseInt(req.params.id);
    const { name, phone, notes } = req.body;
    
    const recipient = data.recipients.find(r => r.id === recipientId);
    
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }
    
    recipient.name = name || recipient.name;
    recipient.phone = phone || recipient.phone;
    recipient.notes = notes !== undefined ? notes : recipient.notes;
    
    res.json({
      success: true,
      message: 'Recipient updated successfully',
      recipient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating recipient',
      error: error.message
    });
  }
});

// Delete recipient
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

// Get transaction history
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

// ============================================
// FLEXPAY TRANSACTION CHECK
// ============================================

// Check FlexPay transaction status
app.get('/api/payment/flexpay/check/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const result = await flexpay.checkTransaction(orderNumber);
    
    if (result.success) {
      res.json({
        success: true,
        transaction: result.transaction
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message || 'Transaction not found'
      });
    }
  } catch (error) {
    console.error('FlexPay Check Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking transaction',
      error: error.message
    });
  }
});

// ============================================
// VOUCHER REDEMPTION API ENDPOINTS
// ============================================

// Check voucher validity
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
    const expiryDate = new Date(voucher.expiresAt);
    if (now > expiryDate) {
      voucher.status = 'expired';
      return res.status(400).json({
        success: false,
        message: 'Ce bon a expiré',
        voucher: {
          code: voucher.code,
          status: voucher.status,
          expires_at: voucher.expiresAt
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
        currency: voucher.currency,
        status: voucher.status,
        recipient_phone: voucher.recipient,
        recipient_name: voucher.recipientName,
        sender_name: voucher.senderName,
        message: voucher.message,
        hide_identity: voucher.hideIdentity,
        created_at: voucher.createdAt,
        expires_at: voucher.expiresAt
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

// Redeem voucher
app.post('/api/vouchers/redeem', async (req, res) => {
  try {
    const { code, merchant_name, merchant_phone, location, notes } = req.body;
    
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
    const expiryDate = new Date(voucher.expiresAt);
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
      currency: voucher.currency,
      notes: notes,
      created_at: now.toISOString()
    };
    
    if (!data.redemptions) {
      data.redemptions = [];
    }
    data.redemptions.push(redemption);
    
    // Send SMS notifications
    await sms.sendRedemptionConfirmation(
      voucher.recipient,
      code,
      voucher.amount,
      voucher.currency,
      merchant_name
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

// Get voucher by code (detailed info)
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

// Get redemption history
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

// ============================================
// AUTHENTICATION ENDPOINTS
// ============================================

const authService = require('./services/auth');
const authMiddleware = require('./middleware/auth');

// Signup endpoint
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

// Login endpoint
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

// Logout endpoint
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

// Get current user profile
app.get('/api/auth/profile', authMiddleware.requireAuth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
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

// Helper function to determine redirect URL based on role
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

// ============================================
// MERCHANT ENDPOINTS
// ============================================

// Get merchant stats
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

// Get merchant redemptions
app.get('/api/merchant/redemptions', authMiddleware.requireAuth, authMiddleware.requireRole('merchant'), async (req, res) => {
  try {
    const redemptions = [];
    res.json(redemptions);
  } catch (error) {
    console.error('Merchant redemptions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get merchant cashiers
app.get('/api/merchant/cashiers', authMiddleware.requireAuth, authMiddleware.requireRole('merchant'), async (req, res) => {
  try {
    const cashiers = [];
    res.json(cashiers);
  } catch (error) {
    console.error('Merchant cashiers error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add cashier
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

// ============================================
// CASHIER ENDPOINTS
// ============================================

// Get cashier stats
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

// Get cashier redemptions
app.get('/api/cashier/redemptions', authMiddleware.requireAuth, authMiddleware.requireRole('cashier'), async (req, res) => {
  try {
    const redemptions = [];
    res.json(redemptions);
  } catch (error) {
    console.error('Cashier redemptions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// Get admin dashboard data
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

// Get all merchants
app.get('/api/admin/merchants', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const merchants = [];
    res.json(merchants);
  } catch (error) {
    console.error('Admin merchants error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve merchant
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

// Reject merchant
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

// Suspend merchant
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

// Get all users
app.get('/api/admin/users', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const users = [];
    res.json(users);
  } catch (error) {
    console.error('Admin users error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Suspend user
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

// Activate user
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

// Get all transactions
app.get('/api/admin/transactions', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const transactions = [];
    res.json(transactions);
  } catch (error) {
    console.error('Admin transactions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get analytics
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

// Get recent activity
app.get('/api/admin/activity', authMiddleware.requireAuth, authMiddleware.requireRole('admin'), async (req, res) => {
  try {
    const activities = [];
    res.json(activities);
  } catch (error) {
    console.error('Admin activity error:', error);
    res.status(500).json({ error: error.message });
  }
});

console.log('✅ Authentication endpoints loaded');


// ============================================
// THANK YOU MESSAGE ENDPOINT
// ============================================

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
    const smsResult = await sms.send(senderPhone, thankYouSMS, 'thank_you');

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

console.log('✅ Thank you endpoint loaded');


// ============================================
// PUBLIC MERCHANT ENDPOINT
// ============================================

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
});

console.log('✅ Public merchant endpoint loaded');

