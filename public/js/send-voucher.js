// Nimwema Platform - Send Voucher JavaScript (Production)
// Version: 2.0 - Database-focused, guest-friendly

// Configuration
const PRESET_AMOUNTS_USD = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const DEFAULT_EXCHANGE_RATE = 2200;
const FEE_PERCENTAGE = 3.5;
const MAX_RECIPIENTS_PER_BATCH = 50;
const MAX_TOTAL_QUANTITY = 50;

// Payment result pages
const PAYMENT_SUCCESS_URL = '/payment-success.html';
const PAYMENT_CANCEL_URL = '/payment-cancel.html';
const PAYMENT_INSTRUCTIONS_URL = '/payment-instructions.html';

// State
let currentCurrency = 'USD';
let exchangeRate = DEFAULT_EXCHANGE_RATE;
let selectedAmount = 0;
let recipientCount = 0;
let waitingListRequests = [];

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initializeSendForm();
  loadExchangeRate();
  addRecipientField();
  setupEventListeners();
  checkForPrefilledData();

  // FORCE USD on load AFTER all init (fixes load display)
  currentCurrency = 'USD'.toUpperCase(); // Safeguard case
  selectCurrency('USD'); // Calls generatePresetButtons() with correct state
});

function initializeSendForm() {
  console.log('✅ Send voucher form initialized');
}

// ============================================
// EXCHANGE RATE MANAGEMENT
// ============================================
async function loadExchangeRate() {
  try {
    const response = await fetch('/api/exchange-rate');
    const data = await response.json();
    
    if (data.success && data.rate) {
      exchangeRate = data.rate;
      updateExchangeRateDisplay();
      console.log('✅ Exchange rate loaded:', exchangeRate);
    } else {
      exchangeRate = DEFAULT_EXCHANGE_RATE;
      updateExchangeRateDisplay();
    }
  } catch (error) {
    console.error('⚠️ Exchange rate fetch failed, using default:', error);
    exchangeRate = DEFAULT_EXCHANGE_RATE;
    updateExchangeRateDisplay();
  }
}

function updateExchangeRateDisplay() {
  const displayText = `1 USD = ${formatNumber(exchangeRate)} CDF`;
  const rateElement = document.getElementById('exchangeRateText');
  if (rateElement) {
    rateElement.textContent = displayText;
  }
}

// ============================================
// AMOUNT SELECTION
// ============================================
function generatePresetButtons() {
  const container = document.getElementById('amountPresetGrid');
  if (!container) return;
  
  container.innerHTML = '';

  PRESET_AMOUNTS_USD.forEach(usdAmount => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'amount-preset-btn';
    button.onclick = () => selectPresetAmount(usdAmount); // ← always pass USD base

    // Determine the primary and secondary amounts
    const primaryAmount = currentCurrency === 'USD' ? usdAmount : Math.round(convertToCDF(usdAmount) / 1000) * 1000;
    const secondaryAmount = currentCurrency === 'USD' ? Math.round(convertToCDF(usdAmount) / 1000) * 1000 : usdAmount;

    // Determine the explicit currency *codes* for formatting
    const primaryCurrencyCode = currentCurrency;
    const secondaryCurrencyCode = currentCurrency === 'USD' ? 'CDF' : 'USD'; 

    button.innerHTML = `
      <span class="amount-primary">${formatCurrency(primaryAmount, primaryCurrencyCode)}</span>
      <span class="amount-secondary">${formatCurrency(secondaryAmount, secondaryCurrencyCode)}</span>
    `;
    console.log('VRAI PROLEM secondary code', secondaryCurrencyCode, 'primary code:', primaryCurrencyCode); // ← now you WILL see this

    container.appendChild(button);
  });
}

function selectCurrency(currency) {
  currentCurrency = currency.toUpperCase(); // FIXED: Normalize case to prevent mismatches

  // Update active class on buttons
  document.querySelectorAll('.currency-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.currency.toUpperCase() === currentCurrency);
  });

  // Update $ / FC symbol
  const symbolEl = document.getElementById('amountCurrencySymbol');
  console.log('ZEROOO BEFORE culprit Currency:', currentCurrency, 'Symbol:', symbolEl?.textContent); 

  if (symbolEl) {
    symbolEl.textContent = currentCurrency === 'USD' ? '$' : 'FC';
  }
  console.log('culprit Currency:', currentCurrency, 'Symbol:', symbolEl?.textContent); 

  // Rebuild preset buttons with correct currency (fixes switch back)
  generatePresetButtons();
  updateCustomAmountEquivalent();
  updateTotalAmount();
}

function selectPresetAmount(usdAmount) {
  // Convert to the currently selected currency before storing
  selectedAmount = currentCurrency === 'USD' 
    ? usdAmount 
    : convertToCDF(usdAmount);

  // Rest of your existing code (highlight selected button, clear custom input, etc.)
  document.querySelectorAll('.amount-preset-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  event.target.closest('.amount-preset-btn').classList.add('selected');

  const customAmountInput = document.getElementById('customAmount');
  if (customAmountInput) customAmountInput.value = '';

  updateTotalAmount();
}

function convertToCDF(usdAmount) {
  const cdfAmount = usdAmount * exchangeRate;
  return Math.ceil(cdfAmount / 1000) * 1000;
}

function convertToUSD(cdfAmount) {
  return cdfAmount / exchangeRate;
}

function formatCurrency(amount, currency) {
  const curr = (currency || currentCurrency).toUpperCase(); // FIXED: Normalize case + fallback
  console.log('Formatting IN:', amount, 'Currency:', curr); // ← now you WILL see this

  if (curr === 'USD') {
    return `${formatNumber(amount)} $`;
  } else {
    return `${formatNumber(amount)} FC`;
  }
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function updateCustomAmountEquivalent() {
  const customAmountInput = document.getElementById('customAmount');
  const customAmount = parseFloat(customAmountInput?.value) || 0;
  const equivalentElement = document.getElementById('amountEquivalent');
  
  if (!equivalentElement) return;
  
  if (customAmount > 0) {
    document.querySelectorAll('.amount-preset-btn').forEach(btn => btn.classList.remove('selected'));
    selectedAmount = customAmount;
    
    const equivalent = currentCurrency === 'USD' 
      ? convertToCDF(customAmount) 
      : convertToUSD(customAmount);
    const equivalentCurrency = currentCurrency === 'USD' ? 'CDF' : 'USD';
    
    equivalentElement.textContent = formatCurrency(equivalent, equivalentCurrency);
  } else {
    equivalentElement.textContent = '';
  }
  
  updateTotalAmount(); // FIXED: Ensures total refreshes with correct currency after custom change
}

function updateTotalAmount() {
  const quantityInput = document.getElementById('quantity');
  const quantity = parseInt(quantityInput?.value) || 1;
  const amount = selectedAmount || 0;
  const subtotal = amount * quantity;
  
  console.log('TOTAL AMOUNT culprit Currency:', currentCurrency); 

  const totalDisplay = document.getElementById('totalAmountDisplay');
  if (totalDisplay) {
    totalDisplay.textContent = formatCurrency(subtotal, currentCurrency);
  }
  
  updateFees();
  updateBatchInfo(quantity);

  // Auto-add recipient fields based on quantity (for specific type)
  const recipientType = document.querySelector('input[name="recipientType"]:checked')?.value;
  if (recipientType === 'specific') {
    const currentFields = document.querySelectorAll('.recipient-field').length;
    const quantity = parseInt(document.getElementById('quantity')?.value) || 1;
    if (quantity > currentFields) {
      for (let i = currentFields; i < quantity; i++) {
        addRecipientField();
      }
      console.log('✅ Auto-added fields to match quantity:', quantity);
    }
  }
}

// ... (Rest of the file remains unchanged – payments, helpers, etc.)

function updateFees() {
  const quantityInput = document.getElementById('quantity');
  const quantity = parseInt(quantityInput?.value) || 1;
  const amount = selectedAmount || 0;
  const coverFeesCheckbox = document.getElementById('coverFees');
  const coverFees = coverFeesCheckbox?.checked || false;
  
  const subtotal = amount * quantity;
  const feeAmount = subtotal * (FEE_PERCENTAGE / 100);
  const total = coverFees ? subtotal + feeAmount : subtotal;
  
  const feeSubtotalEl = document.getElementById('feeSubtotal');
  const feeAmountEl = document.getElementById('feeAmount');
  const feeTotalEl = document.getElementById('feeTotalAmount');
  
  if (feeSubtotalEl) feeSubtotalEl.textContent = formatCurrency(subtotal, currentCurrency);
  if (feeAmountEl) feeAmountEl.textContent = formatCurrencyWithDecimals(feeAmount, currentCurrency);
  if (feeTotalEl) feeTotalEl.textContent = formatCurrencyWithDecimals(total, currentCurrency);
}

function formatCurrencyWithDecimals(amount, currentCurrency) {
  const formatted = amount.toFixed(2);
                console.log('STOP HERE Formatting ', formatted, 'Currency:', currentCurrency, 'num is:', amount); // ← now you WILL see this

  return currentCurrency === 'USD' ? `${formatted} $` : `${formatted} FC`;
}

function updateBatchInfo(quantity) {
  const batchCount = Math.ceil(quantity / MAX_RECIPIENTS_PER_BATCH);
  const batchCountEl = document.getElementById('batchCount');
  const batchInfoEl = document.getElementById('batchInfo');
  
  if (batchCountEl) batchCountEl.textContent = batchCount;
  if (batchInfoEl) {
    batchInfoEl.classList.toggle('hidden', batchCount <= 1);
  }
}

// ============================================
// RECIPIENT MANAGEMENT
// ============================================
function toggleRecipientFields() {
  const recipientType = document.querySelector('input[name="recipientType"]:checked')?.value;
  const waitingListSection = document.getElementById('waitingListSection');
  const specificRecipientsSection = document.getElementById('specificRecipientsSection');
  
  if (recipientType === 'waiting_list') {
    waitingListSection?.classList.remove('hidden');
    specificRecipientsSection?.classList.add('hidden');
    loadWaitingList();
  } else {
    waitingListSection?.classList.add('hidden');
    specificRecipientsSection?.classList.remove('hidden');
  }
}

async function loadWaitingList() {
  const container = document.getElementById('waitingListContainer');
  if (!container) return;
  
  try {
    container.innerHTML = '<div class="loading-state"><p>Chargement...</p></div>';
    
    const response = await fetch('/api/requests?status=pending&requestType=waiting_list');
    const data = await response.json();
    
    if (data.success && data.requests && data.requests.length > 0) {
      waitingListRequests = data.requests;
      renderWaitingList(data.requests);
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📋</div>
          <h3>Aucune demande en attente</h3>
          <p>Il n'y a actuellement aucune demande dans la liste d'attente.</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('❌ Error loading waiting list:', error);
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Erreur de chargement</h3>
        <p>Impossible de charger la liste d'attente.</p>
      </div>
    `;
  }
}

function renderWaitingList(requests) {
  const container = document.getElementById('waitingListContainer');
  if (!container) return;
  
  container.innerHTML = requests.map(request => `
    <div class="waiting-list-item" data-request-id="${request.id}">
      <label class="checkbox-label">
        <input type="checkbox" 
               class="waiting-list-checkbox" 
               value="${request.id}"
               onchange="toggleWaitingListItem(${request.id})">
        <span class="checkbox-custom"></span>
        <div class="waiting-list-info">
          <strong>${request.requester_name || 'Anonyme'}</strong>
          <span>${request.requester_phone}</span>
          <small>${request.message || 'Pas de message'}</small>
        </div>
      </label>
    </div>
  `).join('');
}

function toggleWaitingListItem(requestId) {
  console.log('Waiting list item toggled:', requestId);
}

function addRecipientField() {
  const container = document.getElementById('recipientsContainer');
  if (!container) return;
  
  recipientCount++;
  
  const fieldHTML = `
    <div class="recipient-field" id="recipient-${recipientCount}">
      <div class="form-group">
        <label class="form-label">
          <span>Nom du destinataire</span>
          <span class="required">*</span>
        </label>
        <input type="text" 
               name="recipientName[]" 
               class="form-input" 
               required
               placeholder="Nom complet">
      </div>
      <div class="form-group">
        <label class="form-label">
          <span>Numéro de téléphone</span>
          <span class="required">*</span>
        </label>
        <input type="tel" 
               name="recipientPhone[]" 
               class="form-input" 
               required
               placeholder="+243 XXX XXX XXX">
      </div>
      ${recipientCount > 1 ? `
        <button type="button" 
                class="btn btn-secondary" 
                onclick="removeRecipientField(${recipientCount})">
          Retirer
        </button>
      ` : ''}
    </div>
  `;
  
  container.insertAdjacentHTML('beforeend', fieldHTML);
}

function removeRecipientField(fieldId) {
  const field = document.getElementById(`recipient-${fieldId}`);
  if (field) {
    field.remove();
  }
}

// ============================================
// FORM SUBMISSION
// ============================================
function setupEventListeners() {
  const form = document.getElementById('sendVoucherForm');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  const customAmountInput = document.getElementById('customAmount');
  if (customAmountInput) {
    customAmountInput.addEventListener('input', updateCustomAmountEquivalent);
  }
  
  const messageInput = document.getElementById('message');
  if (messageInput) {
    messageInput.addEventListener('input', updateMessageCount);
  }
}

function updateMessageCount() {
  const messageInput = document.getElementById('message');
  const countDisplay = document.getElementById('messageCount');
  
  if (messageInput && countDisplay) {
    countDisplay.textContent = messageInput.value.length;
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  
  // Validate form
  if (!validateForm()) {
    return;
  }
  
  // Collect form data
  const formData = collectFormData();
  
  // Get selected payment method
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
  
  if (!paymentMethod) {
    showNotification('Veuillez sélectionner une méthode de paiement', 'error');
    return;
  }
  
  try {
    // Route to appropriate payment processor
    switch (paymentMethod) {
      case 'flexpay':
        await processFlexPayMobilePayment(formData);
        break;
      case 'flexpaycard':
        await processFlexPayCardPayment(formData);
        break;
      case 'cash':
      case 'bank':
        await processManualPayment(formData);
        break;
      default:
        throw new Error('Méthode de paiement non supportée');
    }
  } catch (error) {
    console.error('❌ Form submission error:', error);
    showNotification(error.message || 'Une erreur est survenue', 'error');
  }
}

function validateForm() {
  // Validate amount
  if (!selectedAmount || selectedAmount <= 0) {
    showNotification('Veuillez sélectionner un montant', 'error');
    return false;
  }
  
  // Validate quantity
  const quantity = parseInt(document.getElementById('quantity')?.value) || 0;
  if (quantity < 1 || quantity > MAX_TOTAL_QUANTITY) {
    showNotification(`La quantité doit être entre 1 et ${MAX_TOTAL_QUANTITY}`, 'error');
    return false;
  }
  
  // Validate recipient selection
  const recipientType = document.querySelector('input[name="recipientType"]:checked')?.value;
  if (!recipientType) {
    showNotification('Veuillez sélectionner un type de destinataire', 'error');
    return false;
  }
  
  if (recipientType === 'specific') {
    const names = document.querySelectorAll('input[name="recipientName[]"]');
    const phones = document.querySelectorAll('input[name="recipientPhone[]"]');
    
    if (names.length === 0) {
      showNotification('Veuillez ajouter au moins un destinataire', 'error');
      return false;
    }
    
    for (let i = 0; i < names.length; i++) {
      if (!names[i].value.trim() || !phones[i].value.trim()) {
        showNotification('Veuillez remplir tous les champs des destinataires', 'error');
        return false;
      }
    }
  } else if (recipientType === 'waiting_list') {
    const selectedRequests = document.querySelectorAll('.waiting-list-checkbox:checked');
    if (selectedRequests.length === 0) {
      showNotification('Veuillez sélectionner au moins une demande', 'error');
      return false;
    }
  }

  // In validateForm(), after recipient checks:
const tempFormData = collectFormData(); // Temp collect to validate
if (tempFormData.recipients.length === 0) {
  showNotification('Aucun destinataire valide collecté. Ajoutez-en au moins un.', 'error');
  return false;
}
if (tempFormData.recipients.length !== quantity) {
  showNotification(`Nombre de destinataires (${tempFormData.recipients.length}) ne correspond pas à la quantité (${quantity})`, 'error');
  return false;
}
  
  return true;
}

function collectFormData() {
  const recipientType = document.querySelector('input[name="recipientType"]:checked')?.value;
  const quantity = parseInt(document.getElementById('quantity')?.value) || 1;
  const coverFees = document.getElementById('coverFees')?.checked || false;
  const message = document.getElementById('message')?.value || '';
  const senderName = document.getElementById('senderName')?.value || '';
  const senderPhone = document.getElementById('senderPhone')?.value || '';
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
  
  const formData = {
    currency: currentCurrency,
    amount: selectedAmount,
    quantity: quantity,
    recipientType: recipientType,
    senderName: senderName,
    senderPhone: senderPhone,
    message: message,
    coverFees: coverFees,
    paymentMethod: paymentMethod,
    recipients: []
  };
  
  // Collect recipients based on type
  if (recipientType === 'specific') {
    const names = document.querySelectorAll('input[name="recipientName[]"]');
    const phones = document.querySelectorAll('input[name="recipientPhone[]"]');
    
    for (let i = 0; i < names.length; i++) {
      formData.recipients.push({
        name: names[i].value.trim(),
        phone: phones[i].value.trim()
      });
    }
  } else if (recipientType === 'waiting_list') {
    const selectedRequests = document.querySelectorAll('.waiting-list-checkbox:checked');
    selectedRequests.forEach(checkbox => {
      const requestId = parseInt(checkbox.value);
      const request = waitingListRequests.find(r => r.id === requestId);
      if (request) {
        formData.recipients.push({
          requestId: request.id,
          name: request.requester_name,
          phone: request.requester_phone
        });
      }
    });
  }
  
  return formData;
}

// ============================================
// PAYMENT PROCESSORS
// ============================================

// FlexPay Mobile Money Payment
async function processFlexPayMobilePayment(formData) {
  const overlay = showLoadingOverlay('Connexion à FlexPay…<br>Vérifiez votre téléphone');
  
  try {
    // Step 1: Create pending order
    const pendingOrder = await createPendingOrder(formData);
    const orderId = pendingOrder.orderId || pendingOrder.order?.id;
    
    if (!orderId) {
      throw new Error('ID de commande manquant');
    }
    
    // Step 2: Calculate total amount in CDF
    const totalCDF = calculateTotalCDF(formData);
    
    // Step 3: Initiate FlexPay payment
    const initResponse = await fetch('/api/payment/flexpay/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderId,
        amount: totalCDF,
        currency: 'CDF',
        phone: formData.senderPhone
      })
    });
    
    const initData = await initResponse.json();
    
    if (!initResponse.ok || !initData.success || !initData.orderNumber) {
      throw new Error(initData.message || 'Échec d\'initialisation FlexPay');
    }
    
    // Step 4: Poll for payment status
    const orderNumber = initData.orderNumber;
    const paymentCompleted = await pollPaymentStatus(orderNumber, orderId);
    
    if (paymentCompleted) {
      // Finalize order
      await finalizeOrder(orderId);
      window.location.href = `${PAYMENT_SUCCESS_URL}?order=${encodeURIComponent(orderId)}`;
    }
  } catch (error) {
    console.error('❌ FlexPay payment error:', error);
    hideLoadingOverlay(overlay);
    showNotification(error.message || 'Erreur de paiement', 'error');
    setTimeout(() => {
      window.location.href = PAYMENT_CANCEL_URL;
    }, 2000);
  }
}

// FlexPay Card Payment
async function processFlexPayCardPayment(formData) {
  const overlay = showLoadingOverlay('Connexion à FlexPay…<br>Redirection vers la page de paiement sécurisée');
  
  try {
    // Step 1: Create pending order
    const pendingOrder = await createPendingOrder(formData);
    const orderId = pendingOrder.orderId || pendingOrder.order?.id;
    
    if (!orderId) {
      throw new Error('ID de commande manquant');
    }
    
    // Step 2: Calculate total amount
    const totalAmount = calculateTotalAmount(formData);
    
    // Step 3: Initiate hosted payment
    const hostedResponse = await fetch('/api/payment/flexpay/initiate-card', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: orderId,
        amount: totalAmount,
        currency: formData.currency
      })
    });
    
    const hostedData = await hostedResponse.json();
    
    if (!hostedResponse.ok || !hostedData.success || !hostedData.redirectUrl) {
      throw new Error(hostedData.message || 'Échec d\'initialisation FlexPay');
    }
    
    // Step 4: Redirect to FlexPay hosted page
    window.location.href = hostedData.redirectUrl;
  } catch (error) {
    console.error('❌ FlexPay card error:', error);
    hideLoadingOverlay(overlay);
    showNotification(error.message || 'Erreur de paiement', 'error');
    setTimeout(() => {
      window.location.href = PAYMENT_CANCEL_URL;
    }, 2000);
  }
}

// Manual Payment (Cash/Bank)
async function processManualPayment(formData) {
  try {

    // In processManualPayment(), before fetch:
console.log('🔍 Sending formData to create-pending:', formData); // Debug payload

    // Create pending order
    const response = await fetch('/api/vouchers/create-pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    
    const result = await response.json();
    
    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Impossible de créer la commande');
    }
    
    // Store order data for payment instructions page
    sessionStorage.setItem('pendingOrder', JSON.stringify(result.order));
    
    // Redirect to payment instructions
    window.location.href = PAYMENT_INSTRUCTIONS_URL;
  } catch (error) {
    console.error('❌ Manual payment error:', error);
    throw error;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
async function createPendingOrder(formData) {
  const response = await fetch('/api/vouchers/create-pending', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  
  const result = await response.json();
  
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Impossible de créer la commande');
  }
  
  return result;
}

function calculateTotalCDF(formData) {
  const quantity = formData.quantity || 1;
  let base = (formData.amount || 0) * quantity;
  let amountCDF = formData.currency === 'USD' ? convertToCDF(base) : base;
  
  if (formData.coverFees) {
    amountCDF += Math.ceil(amountCDF * (FEE_PERCENTAGE / 100));
  }
  
  return Math.ceil(amountCDF);
}

function calculateTotalAmount(formData) {
  const quantity = formData.quantity || 1;
  let total = (formData.amount || 0) * quantity;
  
  if (formData.coverFees) {
    total += total * (FEE_PERCENTAGE / 100);
  }
  
  return total;
}

async function pollPaymentStatus(orderNumber, orderId) {
  const startTime = Date.now();
  const timeoutMs = 2 * 60 * 1000; // 2 minutes
  const pollInterval = 4500; // 4.5 seconds
  
  while (Date.now() - startTime < timeoutMs) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));
    
    try {
      const response = await fetch(`/api/payment/flexpay/check/${encodeURIComponent(orderNumber)}`);
 
      const data = await response.json();
      
      const status = data?.transaction?.status;
      
      if (status === 0) {
        return true; // Payment successful
      }
      
      if (status === 1) {
        throw new Error('Paiement échoué');
      }
    } catch (error) {
      console.error('⚠️ Payment status check error:', error);
    }
  }
  
  throw new Error('Délai dépassé, statut de paiement inconnu');
}

async function finalizeOrder(orderId) {
  try {
    await fetch('/api/vouchers/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    });
  } catch (error) {
    console.error('⚠️ Finalize order error:', error);
  }
}

function showLoadingOverlay(message) {
  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  `;
  
  overlay.innerHTML = `
    <div style="background: #fff; padding: 32px; border-radius: 16px; text-align: center; min-width: 300px; box-shadow: 0 10px 40px rgba(0,0,0,0.2);">
      <div style="width: 50px; height: 50px; border: 4px solid #E6E6E6; border-top: 4px solid #8BC34A; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px;"></div>
      <div style="font-size: 16px; color: #111; line-height: 1.5;">${message}</div>
      <style>@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }</style>
    </div>
  `;
  
  document.body.appendChild(overlay);
  return overlay;
}

function hideLoadingOverlay(overlay) {
  if (overlay && overlay.parentNode) {
    overlay.parentNode.removeChild(overlay);
  }
}

function showNotification(message, type = 'info') {
  // Simple notification implementation
  alert(message);
}

function checkForPrefilledData() {
  // Check if there's prefilled data in session storage
  const prefilledData = sessionStorage.getItem('prefilledVoucherData');
  if (prefilledData) {
    try {
      const data = JSON.parse(prefilledData);
      // Prefill form with data
      console.log('Prefilled data:', data);
      sessionStorage.removeItem('prefilledVoucherData');
    } catch (error) {
      console.error('Error parsing prefilled data:', error);
    }
  }
}
selectCurrency('USD');  // ← Set default on load (active class + symbol)
// ============================================
// GLOBAL EXPORTS
// ============================================
window.selectCurrency = selectCurrency;
window.selectPresetAmount = selectPresetAmount;
window.toggleRecipientFields = toggleRecipientFields;
window.addRecipientField = addRecipientField;
window.removeRecipientField = removeRecipientField;
window.toggleWaitingListItem = toggleWaitingListItem;
window.updateTotalAmount = updateTotalAmount;
window.updateFees = updateFees;
