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
/**
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
} **/





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

  // ✅ minimal add: read the visible sender phone so FlexPay uses it (no popup)
  const senderPhoneEl = document.getElementById('senderPhone');
  if (senderPhoneEl) {
    formData.senderPhone = (senderPhoneEl.value || '').trim();
  }

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
    // Route to the selected payment method
    if (formData.paymentMethod === 'flexpay') {
      // We deliberately do NOT open the phone popup here because we use the main form phone.
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




















// Process FlexPay payment - SIMPLE DIRECT REDIRECT
// COPY PASTE THIS FUNCTION to replace processFlexPayPayment in your send-voucher.js

// Process FlexPay payment - FIXED VERSION
// COPY PASTE THIS FUNCTION to replace processFlexPayPayment in your send-voucher.js

// Process FlexPay payment - FIXED VERSION
// COPY PASTE THIS FUNCTION to replace processFlexPayPayment in your send-voucher.js

// Process FlexPay payment - FIXED VERSION
// COPY PASTE THIS FUNCTION to replace processFlexPayPayment in your send-voucher.js

// Process FlexPay payment - FIXED VERSION
// COPY PASTE THIS FUNCTION to replace processFlexPayPayment in your send-voucher.js

// Process FlexPay payment - FIXED VERSION
// Process FlexPay payment - CPT FIXED VERSION
async function processFlexPayPayment(formData) {
  // --- Minimal add: local helpers to normalize & validate DRC MoMo ---
  const nm_maskDRC = (raw) => {
    let v = String(raw || '').replace(/[^\d+]/g, '');
    if (!v.startsWith('+243')) v = '+243' + v.replace(/\D/g,'').replace(/^243?/, '');
    return '+243' + v.replace('+243','').replace(/\D/g,'').slice(0,9);
  };
  const nm_isDRC = (v) => /^\+243\d{9}$/.test(String(v || '').trim());

  // Always required
  if (!formData.senderPhone) {
    window.Nimwema?.showNotification?.('Entrez votre numéro MoMo (+243…)', 'error');
    return;
  }
  // Normalize & validate for FlexPay MoMo (DRC only)
  formData.senderPhone = nm_maskDRC(formData.senderPhone);
  if (!nm_isDRC(formData.senderPhone)) {
    window.Nimwema?.showNotification?.('Pour FlexPay MoMo, utilisez un numéro DRC au format +243#########', 'error');
    return;
  }

  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.35);
    display:flex;align-items:center;justify-content:center;z-index:9999
  `;
  overlay.innerHTML = `
    <div style="background:#fff;padding:24px 28px;border-radius:10px;text-align:center;min-width:280px">
      <div style="width:40px;height:40px;border:4px solid #eee;border-top:4px solid #4caf50;border-radius:50%;
                  animation:spin 1s linear infinite;margin:0 auto 12px"></div>
      <div>Connexion à FlexPay…</div>
      <style>@keyframes spin { from{transform:rotate(0)} to{transform:rotate(360deg)} }</style>
    </div>`;
  document.body.appendChild(overlay);

  try {
    // 1) Create pending order
    const pendingRes = await fetch('/api/vouchers/create-pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const pending = await pendingRes.json();
    if (!pendingRes.ok || !pending?.success) {
      throw new Error(pending?.message || 'Impossible de créer la commande');
    }
    const orderId = pending?.orderId || pending?.order?.id;
    if (!orderId) throw new Error('ID de commande manquant');

    // 2) Initiate FlexPay via server
    const initRes = await fetch('/api/payment/flexpay/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        amount: formData.totalToPay,
        currency: (formData.currency || 'CDF'),
        phone: formData.senderPhone
      })
    });
    const initData = await initRes.json();
    if (!initRes.ok || !initData?.success || !initData?.orderNumber) {
      throw new Error(initData?.message || 'Échec d’initialisation FlexPay');
    }
    const orderNumber = initData.orderNumber;

    // 3) Poll check endpoint up to ~2 minutes
    const started = Date.now();
    const timeoutMs = 2 * 60 * 1000;
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    async function finalizeAndRedirect() {
      // If your server finalizes on callback automatically, you can remove this call.
      await fetch('/api/vouchers/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      }).catch(() => {});
      window.location.href = `/thank-you.html?order=${encodeURIComponent(orderId)}`;
    }

    while (Date.now() - started < timeoutMs) {
      await delay(4500);
      const chkRes = await fetch(`/api/payment/flexpay/check/${encodeURIComponent(orderNumber)}`);
      const chk = await chkRes.json().catch(() => ({}));
      const status = chk?.transaction?.status;

      if (status === 0) {
        await finalizeAndRedirect();
        return;
      }
      if (status === 1) {
        throw new Error('Paiement échoué (FlexPay)');
      }
    }

    throw new Error("Délai dépassé, statut de paiement inconnu. Réessayez s.v.p.");
  } catch (err) {
    console.error('FlexPay front-end error:', err);
    window.Nimwema?.showNotification?.(err.message || 'Erreur de paiement', 'error');
  } finally {
    overlay.remove();
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