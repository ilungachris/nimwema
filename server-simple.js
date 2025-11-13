// SIMPLE SERVER WITH JUST WHAT'S NEEDED

const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// API ENDPOINTS - ONLY WHAT'S NEEDED

// Exchange rate
app.get('/api/exchange-rate', (req, res) => {
    res.json({
        success: true,
        rate: 2200,
        currency: 'CDF',
        base: 'USD'
    });
});

// Create order
app.post('/api/orders/create', (req, res) => {
    const orderId = 'ORDER_' + Date.now();
    
    res.json({
        success: true,
        orderId: orderId,
        message: 'Order created successfully'
    });
});

// FlexPay initiation
app.post('/api/payment/flexpay/initiate', (req, res) => {
    const { orderId, amount } = req.body;
    
    // Simple FlexPay URL
    const paymentUrl = `http://41.243.7.46:8080/payment?order=${orderId}&amount=${amount}&merchant=CPOSSIBLE`;
    
    res.json({
        success: true,
        paymentUrl: paymentUrl,
        transactionId: 'TXN_' + Date.now()
    });
});

// Serve HTML files
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/send.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'send.html')));
app.get('/payment-success.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'payment-success.html')));

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;