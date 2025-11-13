// REPLACE ONLY THIS FUNCTION in your existing send-voucher.js
// Keep everything else exactly the same!

// Process FlexPay payment - SIMPLE DIRECT REDIRECT
async function processFlexPayPayment(formData) {
    try {
        // Show loading
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'flexpayLoading';
        loadingDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.8); display: flex; justify-content: center; 
                        align-items: center; z-index: 10000;">
                <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
                    <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; 
                               border-top: 4px solid #8BC34A; border-radius: 50%; 
                               animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
                    <p style="margin: 0; color: #666;">Connecting to FlexPay...</p>
                </div>
            </div>
            <style>
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        `;
        document.body.appendChild(loadingDiv);
        
        // Create order
        const orderResponse = await fetch('/api/vouchers/create-pending', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const orderResult = await orderResponse.json();
        
        if (orderResult.success) {
            // Direct redirect to FlexPay with your token
            const flexpayUrl = `http://41.243.7.46:8080/payment?order=${orderResult.order.id}&amount=${formData.amount}&merchant=CPOSSIBLE&token=Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzNnEyTEhrNWppRzlmekJuWWY3TyIsInJvbGVzIjpbIk1FUkNIQU5UIl0sImlzcyI6Ii9sb2dpbiIsImV4cCI6MTczNTY4NjAwMH0.uuJQqBkwmJADSUpgip9t0HngUofyAdWPTeVnSfN288A`;
            
            // SIMPLE DIRECT REDIRECT!
            window.location.href = flexpayUrl;
        } else {
            throw new Error(orderResult.message || 'Failed to create order');
        }
    } catch (error) {
        // Remove loading
        const loading = document.getElementById('flexpayLoading');
        if (loading) loading.remove();
        
        console.error('FlexPay error:', error);
        window.Nimwema.showNotification('Payment failed. Please try again.', 'error');
        document.querySelector('#sendVoucherForm').classList.remove('form-loading');
    }
}