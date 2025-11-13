/**
 * Send Voucher Form - Simple Version with Direct FlexPay Redirect
 */

document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
});

function initializeForm() {
    const form = document.getElementById('sendVoucherForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const paymentMethod = formData.get('paymentMethod');
    
    // Create order data
    const orderData = {
        senderName: formData.get('senderName'),
        currency: formData.get('currency'),
        amount: parseFloat(formData.get('amount')),
        quantity: parseInt(formData.get('quantity')),
        paymentMethod: paymentMethod,
        recipients: []
    };
    
    // Collect recipients
    for (let i = 1; i <= orderData.quantity; i++) {
        const phone = formData.get(`recipient_${i}`);
        if (phone) {
            orderData.recipients.push(phone);
        }
    }
    
    try {
        // Create order
        const response = await fetch('/api/orders/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (paymentMethod === 'flexpay') {
                // Simple redirect to FlexPay
                await redirectToFlexPay(result.orderId, orderData.amount);
            } else {
                window.location.href = `/payment-instructions.html?orderId=${result.orderId}`;
            }
        } else {
            alert('Failed to create order. Please try again.');
        }
    } catch (error) {
        alert('Error occurred. Please try again.');
    }
}

async function redirectToFlexPay(orderId, amount) {
    try {
        // Show loading
        showLoadingSpinner('Connecting to FlexPay...');
        
        // Initiate FlexPay payment
        const response = await fetch('/api/payment/flexpay/initiate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId: orderId,
                amount: amount,
                currency: 'USD'
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.paymentUrl) {
            // Direct redirect to FlexPay - simple!
            window.location.href = result.paymentUrl;
        } else {
            hideLoadingSpinner();
            alert('Payment initiation failed. Please try again.');
        }
    } catch (error) {
        hideLoadingSpinner();
        alert('Payment service unavailable. Please try again.');
    }
}

function showLoadingSpinner(message = 'Processing...') {
    const spinner = document.createElement('div');
    spinner.id = 'loadingSpinner';
    spinner.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                    background: rgba(0,0,0,0.8); display: flex; justify-content: center; 
                    align-items: center; z-index: 10000;">
            <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
                <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; 
                           border-top: 4px solid #8BC34A; border-radius: 50%; 
                           animation: spin 1s linear infinite; margin: 0 auto 15px;"></div>
                <p style="margin: 0; color: #666; font-family: Arial, sans-serif;">${message}</p>
            </div>
        </div>
        <style>
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
    `;
    document.body.appendChild(spinner);
}

function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.remove();
}