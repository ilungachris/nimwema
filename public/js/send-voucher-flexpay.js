/**
 * Send Voucher Form JavaScript - Enhanced with Real FlexPay Integration
 */

// Form elements
const form = document.getElementById('sendVoucherForm');
const currencySelect = document.getElementById('currency');
const amountButtons = document.querySelectorAll('.amount-btn');
const customAmountInput = document.getElementById('customAmount');
const quantityInput = document.getElementById('quantity');
const recipientFields = document.getElementById('recipientFields');
const addRecipientBtn = document.getElementById('addRecipient');
const feeDisplay = document.getElementById('feeDisplay');
const totalDisplay = document.getElementById('totalDisplay');
const serviceFeeDisplay = document.getElementById('serviceFeeDisplay');
const senderCoversFeeCheckbox = document.getElementById('senderCoversFee');

// State
let recipientCount = 1;
let currentCurrency = 'USD';
let currentAmount = 0;
let exchangeRate = 2800; // Default rate

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
    fetchExchangeRate();
});

function initializeForm() {
    // Get form elements (check if they exist)
    const currencySelect = document.getElementById('currency');
    const customAmountInput = document.getElementById('customAmount');
    const quantityInput = document.getElementById('quantity');
    const senderCoversFeeCheckbox = document.getElementById('senderCoversFee');
    
    // Currency change handler
    if (currencySelect) {
        currencySelect.addEventListener('change', (e) => {
            currentCurrency = e.target.value;
            updateAmountDisplay();
            updateFeeDisplay();
        });
    }

    // Amount button handlers
    amountButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const amount = parseFloat(btn.dataset.amount);
            setAmount(amount);
        });
    });

    // Custom amount handler
    if (customAmountInput) {
        customAmountInput.addEventListener('input', (e) => {
            const amount = parseFloat(e.target.value) || 0;
            setAmount(amount);
        });
    }

    // Quantity handler
    if (quantityInput) {
        quantityInput.addEventListener('input', (e) => {
            const quantity = parseInt(e.target.value) || 1;
            updateRecipientFields(quantity);
        });
    }

    // Service fee handler
    if (senderCoversFeeCheckbox) {
        senderCoversFeeCheckbox.addEventListener('change', updateFeeDisplay);
    }

    // Add recipient handler
    if (addRecipientBtn) {
        addRecipientBtn.addEventListener('click', () => {
            addRecipientField();
        });
    }

    // Form submission
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Initialize recipients
    updateRecipientFields(1);
}

function setAmount(amount) {
    currentAmount = amount;
    customAmountInput.value = amount;
    
    // Update button states
    amountButtons.forEach(btn => {
        btn.classList.remove('active');
        if (parseFloat(btn.dataset.amount) === amount) {
            btn.classList.add('active');
        }
    });
    
    updateAmountDisplay();
    updateFeeDisplay();
}

function updateAmountDisplay() {
    const otherCurrency = currentCurrency === 'USD' ? 'CDF' : 'USD';
    const convertedAmount = currentCurrency === 'USD' 
        ? Math.round(currentAmount * exchangeRate)
        : Math.round(currentAmount / exchangeRate);

    // Update displays
    const usdDisplay = currentCurrency === 'USD' ? currentAmount : convertedAmount;
    const cdfDisplay = currentCurrency === 'CDF' ? currentAmount : convertedAmount;

    document.getElementById('usdDisplay').textContent = `$${usdDisplay.toFixed(2)}`;
    document.getElementById('cdfDisplay').textContent = `${cdfDisplay.toLocaleString()} FC`;

    // Update hidden amount field
    document.getElementById('amount').value = currentAmount;
}

function updateFeeDisplay() {
    const amount = currentAmount;
    const quantity = parseInt(quantityInput.value) || 1;
    const baseTotal = amount * quantity;
    const fee = baseTotal * 0.035; // 3.5% fee
    const senderCoversFee = senderCoversFeeCheckbox.checked;
    
    const total = senderCoversFee ? baseTotal + fee : baseTotal;
    
    // Update displays
    if (serviceFeeDisplay) {
        serviceFeeDisplay.textContent = `$${fee.toFixed(2)} USD`;
    }
    if (totalDisplay) {
        totalDisplay.textContent = `$${total.toFixed(2)} USD`;
    }
    
    // Update hidden fields
    const serviceFeeField = document.getElementById('serviceFee');
    const totalAmountField = document.getElementById('totalAmount');
    if (serviceFeeField) serviceFeeField.value = fee.toFixed(2);
    if (totalAmountField) totalAmountField.value = total.toFixed(2);
}

function updateRecipientFields(quantity) {
    recipientCount = quantity;
    
    // Clear existing fields except first one
    while (recipientFields.children.length > 1) {
        recipientFields.removeChild(recipientFields.lastChild);
    }
    
    // Add fields for additional recipients
    for (let i = 1; i < quantity; i++) {
        addRecipientField();
    }
    
    // Update batch info
    updateBatchInfo();
}

function addRecipientField() {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'recipient-field';
    fieldDiv.innerHTML = `
        <div class="form-group">
            <label>Recipient ${recipientCount + 1} Phone Number</label>
            <input type="tel" name="recipient_${recipientCount + 1}" placeholder="+243 XXX XXX XXX" class="form-control" required>
            <button type="button" class="btn-remove" onclick="removeRecipient(this)">×</button>
        </div>
    `;
    
    recipientFields.appendChild(fieldDiv);
    recipientCount++;
    
    updateBatchInfo();
}

function removeRecipient(button) {
    const fieldDiv = button.closest('.recipient-field');
    fieldDiv.remove();
    recipientCount--;
    
    // Update quantity input
    quantityInput.value = recipientCount;
    updateBatchInfo();
}

function updateBatchInfo() {
    const batchInfo = document.getElementById('batchInfo');
    if (batchInfo) {
        batchInfo.textContent = `Adding ${recipientCount} recipient(s). Enter phone numbers below.`;
    }
    
    // Update max recipients display
    const maxRecipientsDisplay = document.getElementById('maxRecipientsDisplay');
    if (maxRecipientsDisplay) {
        maxRecipientsDisplay.textContent = `Max 50 recipients per batch`;
    }
}

async function fetchExchangeRate() {
    try {
        const response = await fetch('/api/exchange-rate');
        const data = await response.json();
        if (data.success) {
            exchangeRate = data.rate;
            updateAmountDisplay();
        }
    } catch (error) {
        console.error('Failed to fetch exchange rate:', error);
    }
}

async function handleFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(form);
    const orderData = {
        senderName: formData.get('senderName'),
        hideIdentity: formData.get('hideIdentity') === 'on',
        message: formData.get('message'),
        currency: formData.get('currency'),
        amount: parseFloat(formData.get('amount')),
        quantity: parseInt(formData.get('quantity')),
        serviceFee: parseFloat(formData.get('serviceFee')),
        totalAmount: parseFloat(formData.get('totalAmount')),
        senderCoversFee: formData.get('senderCoversFee') === 'on',
        paymentMethod: formData.get('paymentMethod'),
        recipients: []
    };
    
    // Collect recipients
    for (let i = 1; i <= orderData.quantity; i++) {
        const phone = formData.get(`recipient_${i}`);
        if (phone) {
            orderData.recipients.push(phone);
        }
    }
    
    // Validate recipients
    if (orderData.recipients.length !== orderData.quantity) {
        showToast('Please enter phone numbers for all recipients', 'error');
        return;
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
            // Handle payment based on method
            if (orderData.paymentMethod === 'flexpay') {
                await showFlexPayPopupAndPay(result.orderId, orderData.totalAmount);
            } else {
                // Redirect to payment instructions
                window.location.href = `/payment-instructions.html?orderId=${result.orderId}`;
            }
        } else {
            showToast(result.message || 'Failed to create order', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('An error occurred. Please try again.', 'error');
    }
}

// ✅ NEW FUNCTION: Real FlexPay Integration
async function showFlexPayPopupAndPay(orderId, amount) {
    try {
        // Show loading state
        showLoadingSpinner();
        
        // Initiate FlexPay payment
        const response = await fetch(`${API_BASE}/api/payment/flexpay/initiate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                orderId: orderId,
                amount: amount,
                currency: 'USD',
                returnUrl: `${window.location.origin}/payment-success.html`,
                cancelUrl: `${window.location.origin}/payment-cancel.html`
            })
        });
        
        const result = await response.json();
        
        if (result.success && result.paymentUrl) {
            // Hide loading
            hideLoadingSpinner();
            
            // Show interactive popup
            showInteractiveFlexPayPopup(result.paymentUrl, orderId);
        } else {
            hideLoadingSpinner();
            showToast('Failed to initiate payment. Please try again.', 'error');
        }
    } catch (error) {
        hideLoadingSpinner();
        console.error('FlexPay error:', error);
        showToast('Payment service unavailable. Please try again.', 'error');
    }
}

// ✅ NEW FUNCTION: Interactive FlexPay Popup
function showInteractiveFlexPayPopup(paymentUrl, orderId) {
    // Create popup overlay
    const popupOverlay = document.createElement('div');
    popupOverlay.id = 'flexpayPopup';
    popupOverlay.innerHTML = `
        <div class="popup-overlay">
            <div class="popup-content">
                <div class="popup-header">
                    <h3>💳 Paiement FlexPay</h3>
                    <button class="close-btn" onclick="closeFlexPayPopup()">&times;</button>
                </div>
                <div class="popup-body">
                    <div class="payment-amount">
                        <span>Montant à payer:</span>
                        <strong id="popupAmount">$${currentAmount.toFixed(2)} USD</strong>
                    </div>
                    <div class="payment-methods">
                        <h4>Choisissez le mode de paiement:</h4>
                        <div class="payment-options">
                            <button class="payment-btn" onclick="selectPaymentMethod('mobile_money')">
                                <div class="payment-icon">📱</div>
                                <div class="payment-info">
                                    <strong>Mobile Money</strong>
                                    <span>Orange, Airtel, M-Pesa, Vodacom, Africell</span>
                                </div>
                            </button>
                            <button class="payment-btn" onclick="selectPaymentMethod('bank_card')">
                                <div class="payment-icon">💳</div>
                                <div class="payment-info">
                                    <strong>Carte Bancaire</strong>
                                    <span>VISA, Mastercard</span>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div class="payment-actions">
                        <button class="btn btn-primary btn-large" onclick="proceedToPayment()">
                            Payer Maintenant
                        </button>
                        <button class="btn btn-secondary" onclick="closeFlexPayPopup()">
                            Annuler
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(popupOverlay);
    
    // Store payment URL and order ID for later use
    window.currentPaymentUrl = paymentUrl;
    window.currentOrderId = orderId;
    window.selectedPaymentMethod = null;
}

// ✅ NEW FUNCTION: Select Payment Method
function selectPaymentMethod(method) {
    window.selectedPaymentMethod = method;
    
    // Update UI to show selection
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    
    event.target.closest('.payment-btn').classList.add('selected');
}

// ✅ NEW FUNCTION: Proceed to Payment
function proceedToPayment() {
    if (!window.selectedPaymentMethod) {
        showToast('Veuillez sélectionner un mode de paiement', 'error');
        return;
    }
    
    // Redirect to FlexPay payment page
    const paymentUrl = window.currentPaymentUrl;
    
    // Add payment method parameter if needed
    const urlWithParams = `${paymentUrl}?payment_method=${window.selectedPaymentMethod}&order_id=${window.currentOrderId}`;
    
    // Open FlexPay payment in new window
    const popup = window.open(urlWithParams, 'flexpay_payment', 'width=800,height=600,scrollbars=yes,resizable=yes');
    
    if (!popup) {
        // Fallback: redirect in same window
        window.location.href = urlWithParams;
    } else {
        // Monitor popup for completion
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                // Check payment status
                checkPaymentStatus(window.currentOrderId);
            }
        }, 1000);
    }
    
    // Close popup overlay
    closeFlexPayPopup();
}

// ✅ NEW FUNCTION: Check Payment Status
async function checkPaymentStatus(orderId) {
    try {
        showLoadingSpinner();
        
        const response = await fetch(`/api/payment/flexpay/check/${orderId}`);
        const result = await response.json();
        
        hideLoadingSpinner();
        
        if (result.success && result.paid) {
            // Payment successful
            showToast('Paiement réussi! Vouchers en cours de génération...', 'success');
            setTimeout(() => {
                window.location.href = `/payment-success.html?orderId=${orderId}`;
            }, 2000);
        } else {
            // Payment pending or failed
            showToast('Paiement en cours ou échoué. Veuillez réessayer.', 'warning');
        }
    } catch (error) {
        hideLoadingSpinner();
        console.error('Error checking payment status:', error);
        showToast('Erreur lors de la vérification du paiement', 'error');
    }
}

// ✅ NEW FUNCTION: Close FlexPay Popup
function closeFlexPayPopup() {
    const popup = document.getElementById('flexpayPopup');
    if (popup) {
        popup.remove();
    }
}

// ✅ NEW FUNCTION: Show Loading Spinner
function showLoadingSpinner() {
    const spinner = document.createElement('div');
    spinner.id = 'loadingSpinner';
    spinner.innerHTML = `
        <div class="spinner-overlay">
            <div class="spinner-content">
                <div class="spinner"></div>
                <p>Traitement en cours...</p>
            </div>
        </div>
    `;
    document.body.appendChild(spinner);
}

// ✅ NEW FUNCTION: Hide Loading Spinner
function hideLoadingSpinner() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) {
        spinner.remove();
    }
}

// Utility functions
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading 0 if present
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    
    // Add +243 if not present
    if (!cleaned.startsWith('243')) {
        cleaned = '243' + cleaned;
    }
    
    return '+' + cleaned;
}