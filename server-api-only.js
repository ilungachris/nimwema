// ADD ONLY THESE API ENDPOINTS to your existing server.js
// Don't change anything else!

// Add these at the end of your server.js, before app.listen

// FlexPay payment initiation
app.post('/api/payment/flexpay/initiate', (req, res) => {
    try {
        const { orderId, amount } = req.body;
        
        // Direct FlexPay URL
        const paymentUrl = `http://41.243.7.46:8080/payment?order=${orderId}&amount=${amount}&merchant=CPOSSIBLE&token=Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzNnEyTEhrNWppRzlmekJuWWY3TyIsInJvbGVzIjpbIk1FUkNIQU5UIl0sImlzcyI6Ii9sb2dpbiIsImV4cCI6MTczNTY4NjAwMH0.uuJQqBkwmJADSUpgip9t0HngUofyAdWPTeVnSfN288A`;
        
        res.json({
            success: true,
            paymentUrl: paymentUrl,
            transactionId: 'TXN_' + Date.now()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Payment service unavailable'
        });
    }
});

// Exchange rate (if you don't have it)
app.get('/api/exchange-rate', (req, res) => {
    res.json({
        success: true,
        rate: 2200,
        currency: 'CDF',
        base: 'USD'
    });
});