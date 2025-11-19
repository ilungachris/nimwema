// Add this to your server.js file

// EXCHANGE RATE API
app.get(`${API_BASE}/api/exchange-rate`, async (req, res) => {
    try {
        // Try to get real exchange rate from BCC.cd
        let rate = 2200; // Default fallback rate
        
        try {
            const axios = require('axios');
            const response = await axios.get('https://www.bcc.cd/cours-change/', {
                timeout: 5000
            });
            
            // Parse the HTML to extract USD to CDF rate
            // This is a simplified approach - in production, you'd want more robust parsing
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
            rate: rate,
            currency: 'CDF',
            base: 'USD',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Exchange rate error:', error);
        res.json({
            success: true,
            rate: 2200, // Fallback rate
            currency: 'CDF',
            base: 'USD',
            timestamp: new Date().toISOString()
        });
    }
});

// Also add the orders/create endpoint if it doesn't exist
app.post('/api/orders/create', async (req, res) => {
    try {
        const orderData = req.body;
        
        // Generate unique order ID
        const orderId = 'ORDER_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // Store order in memory (in production, use database)
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

// Add FlexPay payment initiation endpoint
app.post('/api/payment/flexpay/initiate', async (req, res) => {
    try {
        const { orderId, amount, currency, returnUrl, cancelUrl } = req.body;
        
        // Import FlexPay service
        const flexpayService = require('./services/flexpay');
        
        // Initiate payment
        const result = await flexpayService.initiatePayment({
            orderId: orderId,
            amount: amount,
            currency: currency || 'USD',
            returnUrl: returnUrl,
            cancelUrl: cancelUrl
        });
        
        if (result.success) {
            res.json({
                success: true,
                paymentUrl: result.paymentUrl,
                transactionId: result.transactionId
            });
        } else {
            res.json({
                success: false,
                message: result.message || 'Failed to initiate payment'
            });
        }
        
    } catch (error) {
        console.error('FlexPay initiation error:', error);
        res.status(500).json({
            success: false,
            message: 'Payment service unavailable'
        });
    }
});

// Add FlexPay payment check endpoint
app.get('/api/payment/flexpay/check/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Import FlexPay service
        const flexpayService = require('./services/flexpay');
        
        // Check payment status
        const result = await flexpayService.checkPaymentStatus(orderId);
        
        res.json(result);
        
    } catch (error) {
        console.error('FlexPay status check error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check payment status'
        });
    }
});