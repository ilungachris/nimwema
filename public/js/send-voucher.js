// Nimwema Platform - Send Voucher JavaScript

// Configuration
const PRESET_AMOUNTS_USD = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const DEFAULT_EXCHANGE_RATE = 2800; // 1 USD = 2800 CDF
const FEE_PERCENTAGE = 3.5;
const MAX_RECIPIENTS_PER_BATCH = 50;
const MAX_TOTAL_QUANTITY = 50;

// State
let currentCurrency = 'USD';
let exchangeRate = DEFAULT_EXCHANGE_RATE;
let selectedAmount = 0;
let recipientCount = 0;
let waitingListRequests = [];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  initializeSendForm();
  loadExchangeRate();
  generatePresetButtons();
  addRecipientField();
  setupEventListeners();
  checkForPrefilledData();
});

// Initialize form
function initializeSendForm() {
  console.log('Send voucher form initialized');
}

// Load exchange rate
async function loadExchangeRate() {
  try {
    // Try to get BCC.cd parallel rate first
    const bccRate = await fetchBCCRate();
    if (bccRate) {
      exchangeRate = bccRate;
      updateExchangeRateDisplay();
      return;
    }
  } catch (error) {
    console.log('BCC rate fetch failed, trying API...');
  }
  
  try {
    // Fallback to API
    const apiRate = await fetchAPIRate();
    if (apiRate) {
      exchangeRate = apiRate;
      updateExchangeRateDisplay();
      return;
    }
  } catch (error) {
    console.log('API rate fetch failed, using default...');
  }
  
  // Use default rate
  exchangeRate = DEFAULT_EXCHANGE_RATE;
  updateExchangeRateDisplay();
}

// Fetch BCC.cd rate (attempt to scrape)
async function fetchBCCRate() {
  try {
    const response = await fetch('/api/exchange-rate/bcc');
    const data = await response.json();
    if (data.success && data.rate) {
      return data.rate;
    }
  } catch (error) {
    console.error('Error fetching BCC rate:', error);
  }
  return null;
}

// Fetch API rate
async function fetchAPIRate() {
  try {
    const response = await fetch('/api/exchange-rate/api');
    const data = await response.json();
    if (data.success && data.rate) {
      return data.rate;
    }
  } catch (error) {
    console.error('Error fetching API rate:', error);
  }
  return null;
}

// Update exchange rate display
function updateExchangeRateDisplay() {
  const displayText = `1 USD = ${formatNumber(exchangeRate)} CDF`;
  document.getElementById('exchangeRateText').textContent = displayText;
}

// Generate preset amount buttons
function generatePresetButtons() {
  const container = document.getElementById('amountPresetGrid');
  
  PRESET_AMOUNTS_USD.forEach(amount => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'amount-preset-btn';
    button.onclick = () => selectPresetAmount(amount);
    
    const primaryAmount = currentCurrency === 'USD' ? amount : convertToCDF(amount);
    const secondaryAmount = currentCurrency === 'USD' ? convertToCDF(amount) : amount;
    
    button.innerHTML = `
      <span class="amount-primary">${formatCurrency(primaryAmount, currentCurrency)}</span>
      <span class="amount-secondary">${formatCurrency(secondaryAmount, currentCurrency === 'USD' ? 'CDF' : 'USD')}</span>
    `;
    
    container.appendChild(button);
  });
}

// Select currency
function selectCurrency(currency) {
  currentCurrency = currency;
  
  // Update currency buttons
  document.querySelectorAll('.currency-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.currency === currency);
  });
  
  // Update currency symbol
  document.getElementById('amountCurrencySymbol').textContent = currency === 'USD' ? '$' : 'FC';
  
  // Regenerate preset buttons
  document.getElementById('amountPresetGrid').innerHTML = '';
  generatePresetButtons();
  
  // Update custom amount equivalent
  updateCustomAmountEquivalent();
  
  // Update totals
  updateTotalAmount();
}

// Select preset amount
function selectPresetAmount(amount) {
  selectedAmount = amount;
  
  // Update button states
  document.querySelectorAll('.amount-preset-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  event.target.closest('.amount-preset-btn').classList.add('selected');
  
  // Clear custom amount
  document.getElementById('customAmount').value = '';
  
  // Update totals
  updateTotalAmount();
}

// Convert USD to CDF
function convertToCDF(usdAmount) {
  const cdfAmount = usdAmount * exchangeRate;
  // Round up to nearest 1000
  return Math.ceil(cdfAmount / 1000) * 1000;
}

// Convert CDF to USD
function convertToUSD(cdfAmount) {
  return cdfAmount / exchangeRate;
}

// Format currency
function formatCurrency(amount, currency) {
  if (currency === 'USD') {
    return `$${formatNumber(amount)}`;
  } else {
    return `${formatNumber(amount)} FC`;
  }
}

// Format number with commas
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Update custom amount equivalent
function updateCustomAmountEquivalent() {
  const customAmount = parseFloat(document.getElementById('customAmount').value) || 0;
  const equivalentElement = document.getElementById('amountEquivalent');
  
  if (customAmount > 0) {
    // Clear preset selection
    document.querySelectorAll('.amount-preset-btn').forEach(btn => {
      btn.classList.remove('selected');
    });
    
    selectedAmount = customAmount;
    
    const equivalent = currentCurrency === 'USD' ? convertToCDF(customAmount) : convertToUSD(customAmount);
    const equivalentCurrency = currentCurrency === 'USD' ? 'CDF' : 'USD';
    equivalentElement.textContent = formatCurrency(equivalent, equivalentCurrency);
  } else {
    equivalentElement.textContent = '';
  }
  
  updateTotalAmount();
}

// Update total amount
function updateTotalAmount() {
  const quantity = parseInt(document.getElementById('quantity').value) || 1;
  const amount = selectedAmount || 0;
  
  const subtotal = amount * quantity;
  const currency = currentCurrency;
  
  // Update display
  document.getElementById('totalAmountDisplay').textContent = formatCurrency(subtotal, currency);
  
  // Update fees
  updateFees();
  
  // Update batch info
  updateBatchInfo(quantity);
}

// Update fees
function updateFees() {
  const quantity = parseInt(document.getElementById('quantity').value) || 1;
  const amount = selectedAmount || 0;
  const coverFees = document.getElementById('coverFees').checked;
  
  const subtotal = amount * quantity;
  const feeAmount = subtotal * (FEE_PERCENTAGE / 100);
  const total = coverFees ? subtotal + feeAmount : subtotal;
  
  const currency = currentCurrency;
  
  document.getElementById('feeSubtotal').textContent = formatCurrency(subtotal, currency);
  document.getElementById('feeAmount').textContent = formatCurrencyWithDecimals(feeAmount, currency);
  document.getElementById('feeTotalAmount').textContent = formatCurrencyWithDecimals(total, currency);
}

// Format currency with 2 decimals
function formatCurrencyWithDecimals(amount, currency) {
  const formatted = amount.toFixed(2);
  if (currency === 'USD') {
    return `$${formatted}`;
  } else {
    return `${formatted} FC`;
  }
}

// Update batch info
  function updateBatchInfo(quantity) {
    const batchCount = Math.ceil(quantity / MAX_RECIPIENTS_PER_BATCH);
    const maxRecipients = Math.min(quantity, MAX_RECIPIENTS_PER_BATCH);
    
    // Update batch count if element exists
    const batchCountEl = document.getElementById('batchCount');
    if (batchCountEl) {
      batchCountEl.textContent = batchCount;
    }
    
    // Show/hide batch info
    const batchInfoEl = document.getElementById('batchInfo');
    if (batchInfoEl) {
      if (batchCount > 1) {
        batchInfoEl.classList.remove('hidden');
      } else {
        batchInfoEl.classList.add('hidden');
      }
    }
  }

// Toggle recipient fields
function toggleRecipientFields() {
  const recipientType = document.querySelector('input[name="recipientType"]:checked').value;
  
  if (recipientType === 'waiting_list') {
    document.getElementById('waitingListSection').classList.remove('hidden');
    document.getElementById('specificRecipientsSection').classList.add('hidden');
    loadWaitingList();
  } else {
    document.getElementById('waitingListSection').classList.add('hidden');
    document.getElementById('specificRecipientsSection').classList.remove('hidden');
  }
}

// Load waiting list
async function loadWaitingList() {
  try {
    const response = await fetch('/api/requests?status=pending&requestType=waiting_list');
    const requests = await response.json();
    
    waitingListRequests = requests;
    renderWaitingList(requests);
  } catch (error) {
    console.error('Error loading waiting list:', error);
    document.getElementById('waitingListContainer').innerHTML = `
      <div class="empty-state">
        <p>Erreur lors du chargement de la liste d'attente</p>
      </div>
    `;
  }
}

// Render waiting list
function renderWaitingList(requests) {
  const container = document.getElementById('waitingListContainer');
  
  if (requests.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Aucune demande en attente pour le moment</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = requests.map(request => `
    <label class="waiting-list-item">
      <input 
        type="checkbox" 
        class="waiting-list-checkbox" 
        value="${request.id}"
        onchange="toggleWaitingListItem(this)">
      <div class="waiting-list-info">
        <div class="waiting-list-name">${request.fullName}</div>
        <div class="waiting-list-details">${request.phone}</div>
        ${request.message ? `<div class="waiting-list-details">${request.message}</div>` : ''}
        <div class="waiting-list-time">
          Demandé ${getTimeAgo(request.created_at)} • 
          Expire ${getTimeAgo(request.expires_at)}
        </div>
      </div>
    </label>
  `).join('');
}

// Toggle waiting list item
function toggleWaitingListItem(checkbox) {
  const item = checkbox.closest('.waiting-list-item');
  if (checkbox.checked) {
    item.classList.add('selected');
  } else {
    item.classList.remove('selected');
  }
}

// Get time ago
function getTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `il y a ${days} jour${days > 1 ? 's' : ''}`;
  } else if (hours > 0) {
    return `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  } else {
    return 'il y a moins d\'une heure';
  }
}

// Add recipient field
function addRecipientField() {
  const container = document.getElementById('recipientsInputContainer');
  const quantity = parseInt(document.getElementById('quantity').value) || 1;
  const maxRecipients = Math.min(quantity, MAX_RECIPIENTS_PER_BATCH);
  
  if (recipientCount >= maxRecipients) {
    window.Nimwema.showNotification(`Maximum ${maxRecipients} destinataires par lot`, 'warning');
    return;
  }
  
  recipientCount++;
  
  const row = document.createElement('div');
  row.className = 'recipient-input-row';
  row.innerHTML = `
    <input 
      type="tel" 
      class="form-input recipient-phone" 
      placeholder="+243 XXX XXX XXX"
      required>
    <button type="button" class="btn-remove-recipient" onclick="removeRecipientField(this)">
      ✕
    </button>
  `;
  
  container.appendChild(row);
  
  // Setup phone formatting for new input
  const phoneInput = row.querySelector('.recipient-phone');
  phoneInput.addEventListener('input', function(e) {
    let value = e.target.value;
    value = value.replace(/[^\d+]/g, '');
    if (value && !value.startsWith('+')) {
      value = '+' + value;
    }
    e.target.value = value;
  });
  
  // Update button state
  updateAddRecipientButton();
}

// Remove recipient field
function removeRecipientField(button) {
  if (recipientCount <= 1) {
    window.Nimwema.showNotification('Au moins un destinataire requis', 'error');
    return;
  }
  
  button.closest('.recipient-input-row').remove();
  recipientCount--;
  updateAddRecipientButton();
}

// Update add recipient button
   function updateAddRecipientButton() {
     const quantity = parseInt(document.getElementById('quantity').value) || 1;
     const maxRecipients = Math.min(quantity, MAX_RECIPIENTS_PER_BATCH);
     const button = document.getElementById('addRecipientBtn');
     
     console.log('🔘 Button Update:', {
       recipientCount: recipientCount,
       quantity: quantity,
       maxRecipients: maxRecipients,
       shouldDisable: recipientCount >= maxRecipients
     });
     
     if (recipientCount >= maxRecipients) {
       button.disabled = true;
       button.style.opacity = '0.5';
       console.log('❌ Button DISABLED');
     } else {
       button.disabled = false;
       button.style.opacity = '1';
       console.log('✅ Button ENABLED');
     }
}

// Setup event listeners
function setupEventListeners() {
  // Custom amount input
  document.getElementById('customAmount').addEventListener('input', updateCustomAmountEquivalent);
  
  // Quantity input
  document.getElementById('quantity').addEventListener('input', function() {
    const quantityInput = this;
    let value = parseInt(quantityInput.value) || 1;
    
    // Enforce maximum quantity of 50
    if (value > MAX_TOTAL_QUANTITY) {
      value = MAX_TOTAL_QUANTITY;
      quantityInput.value = MAX_TOTAL_QUANTITY;
    }
    
    if (value < 1) {
      value = 1;
      quantityInput.value = 1;
    }
    
    updateTotalAmount();
    updateAddRecipientButton();
  });
  
  // Cover fees checkbox
  document.getElementById('coverFees').addEventListener('change', updateFees);
  
  // Message counter
  const messageField = document.getElementById('message');
  const messageCount = document.getElementById('messageCount');
  messageField.addEventListener('input', function() {
    messageCount.textContent = this.value.length;
  });
  
  // Form submission
  document.getElementById('sendVoucherForm').addEventListener('submit', handleFormSubmit);
}

// Check for prefilled data (from SMS link or request)
function checkForPrefilledData() {
  const urlParams = new URLSearchParams(window.location.search);
  const requestId = urlParams.get('request');
  const phone = urlParams.get('phone');
  
  if (requestId && phone) {
    // Prefill from request
    document.getElementById('recipientsInputContainer').innerHTML = `
      <div class="recipient-input-row">
        <input 
          type="tel" 
          class="form-input recipient-phone" 
          value="${phone}"
          readonly>
      </div>
    `;
    recipientCount = 1;
    
    // Disable recipient type selection
    document.querySelectorAll('input[name="recipientType"]').forEach(radio => {
      radio.disabled = true;
    });
  }
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  // Validate amount
  if (!selectedAmount || selectedAmount <= 0) {
    window.Nimwema.showNotification('Veuillez sélectionner un montant', 'error');
    return;
  }
  
  // Get form data
  const formData = {
    amount: selectedAmount,
    currency: currentCurrency,
    quantity: parseInt(document.getElementById('quantity').value),
    senderName: document.getElementById('senderName').value,
    hideIdentity: document.getElementById('hideIdentity').checked,
    message: document.getElementById('message').value,
    coverFees: document.getElementById('coverFees').checked,
    paymentMethod: document.querySelector('input[name="paymentMethod"]:checked').value,
    recipientType: document.querySelector('input[name="recipientType"]:checked').value,
    recipients: []
  };
  
  // Get recipients
  if (formData.recipientType === 'waiting_list') {
    const selectedCheckboxes = document.querySelectorAll('.waiting-list-checkbox:checked');
    formData.recipients = Array.from(selectedCheckboxes).map(cb => {
      const request = waitingListRequests.find(r => r.id === parseInt(cb.value));
      return {
        phone: request.phone,
        name: request.fullName,
        requestId: request.id
      };
    });
    
    if (formData.recipients.length === 0) {
      window.Nimwema.showNotification('Veuillez sélectionner au moins un destinataire', 'error');
      return;
    }
  } else {
    const phoneInputs = document.querySelectorAll('.recipient-phone');
    formData.recipients = Array.from(phoneInputs).map(input => ({
      phone: input.value.trim()
    }));
    
    // Validate phones
    for (const recipient of formData.recipients) {
      if (!recipient.phone || recipient.phone.length < 10) {
        window.Nimwema.showNotification('Veuillez entrer des numéros valides', 'error');
        return;
      }
    }
  }
  
  // Show loading
  const form = e.target;
  form.classList.add('form-loading');
  
  try {
    // Process payment based on method
    if (formData.paymentMethod === 'flexpay') {
      await processFlexPayPayment(formData);
    } else if (formData.paymentMethod === 'flutterwave') {
      await processFlutterwavePayment(formData);
    } else if (formData.paymentMethod === 'cash' || formData.paymentMethod === 'bank') {
      await processManualPayment(formData);
    }
  } catch (error) {
    console.error('Payment error:', error);
    window.Nimwema.showNotification('Erreur lors du paiement', 'error');
    form.classList.remove('form-loading');
  }
}

// Process FlexPay payment
/** async function processFlexPayPayment(formData) {
    try {
      // Create order first
      const response = await fetch('/api/vouchers/create-pending', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Store order data and redirect to FlexPay payment page
        sessionStorage.setItem('pendingOrder', JSON.stringify(result.order));
        window.location.href = `payment-flexpay.html?orderId=${result.order.id}`;
      } else {
        throw new Error(result.message || 'Failed to create order');
      }
    } catch (error) {
      console.error('FlexPay payment error:', error);
      throw error;
    }
  }
**/

// Process FlexPay payment - SIMPLE DIRECT REDIRECT
// COPY PASTE THIS FUNCTION to replace processFlexPayPayment in your send-voucher.js

// Process FlexPay payment - FIXED VERSION
// COPY PASTE THIS FUNCTION to replace processFlexPayPayment in your send-voucher.js

// Process FlexPay payment - FIXED VERSION
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
            // FIXED: Get orderId from orderResult.order.id
            const orderId = orderResult.order.id;
            
            // Redirect to our POST form page (FlexPay needs POST, not GET)
            const flexpayFormUrl = `flexpay-post-form.html?order=${orderId}&amount=${formData.amount}`;
            
            // REDIRECT TO POST FORM PAGE!
            window.location.href = flexpayFormUrl;
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


// Process Flutterwave payment
async function processFlutterwavePayment(formData) {
  // Redirect to Flutterwave payment page
  window.location.href = `/payment/flutterwave?data=${encodeURIComponent(JSON.stringify(formData))}`;
}

// Process manual payment
async function processManualPayment(formData) {
  try {
    const response = await fetch('/api/vouchers/create-pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Store order data
      sessionStorage.setItem('pendingOrder', JSON.stringify(result.order));
      
      // Redirect to payment instructions
      window.location.href = '/payment-instructions.html';
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    throw error;
  }
}

// Export functions
window.selectCurrency = selectCurrency;
window.selectPresetAmount = selectPresetAmount;
window.toggleRecipientFields = toggleRecipientFields;
window.addRecipientField = addRecipientField;
window.removeRecipientField = removeRecipientField;
window.toggleWaitingListItem = toggleWaitingListItem;
window.updateTotalAmount = updateTotalAmount;
window.updateFees = updateFees;