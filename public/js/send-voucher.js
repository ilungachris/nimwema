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
});

function initializeSendForm() {
  console.log('✅ Send voucher form initialized');
  currentCurrency = 'USD';
  

      // Set correct symbol
  const symbolEl = document.getElementById('amountCurrencySymbol');
  if (symbolEl) symbolEl.textContent = '$';

  // Activate USD button
  document.querySelectorAll('.currency-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.currency === 'USD');
  });

  // NOW generate buttons with correct currency
  //console.log('line 49 ZEROOO BEFORE culprit Currency:', currentCurrency   ); 

 // generatePresetButtons();
//console.log('line 52 ZEROOO BEFORE culprit Currency:', currency   ); 

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
  //console.log('✅ value of currentCurrency 1:', currentCurrency);
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

    //console.log('✅ value of currentCurrency just before class amount-primary:', currentCurrency);

    button.innerHTML = `
      <!-- Use the correct variable names here -->
      <span class="amount-primary">${formatCurrency(primaryAmount, primaryCurrencyCode)}</span>
      <span class="amount-secondary">${formatCurrency(secondaryAmount, secondaryCurrencyCode)}</span>
    `;
        console.log('VRAI PROLEM secondary code', secondaryCurrencyCode, 'primary code:', primaryCurrencyCode); // ← now you WILL see this

    container.appendChild(button);
  });
}


function selectCurrency(currency) {
  currentCurrency = currency.toUpperCase(); // FIXED: Update the global! (was backwards)

  // Update active button
  document.querySelectorAll('.currency-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.currency === currency);
    
  });

  // Update symbol
  console.log('✅ value of currentCurrency 3:', currentCurrency);
  document.getElementById('amountCurrencySymbol').textContent = currentCurrency === 'USD' ? '$' : 'FC';

  // REBUILD BUTTONS WITH CORRECT CURRENCY
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
  const curr = currency || currentCurrency; // fallback safety
  //console.log('Formatting before:', amount, 'Currency:', curr); // ← now you WILL see this

  if (curr === 'USD') {
    console.log('Formatting IN  USD:', amount, 'Currency:', curr); // ← now you WILL see this

    return `${formatNumber(amount)} $`;
  } else {
        console.log('Formatting IN : FC', amount, 'Currency:', curr); // ← now you WILL see this

    return `${formatNumber(amount)} FC`;
  }

  //const curr = currency || currentCurrency; 
         console.log('Formatting IN : FC', amount, 'Currency à la sortie:', curr); // ← now you WILL see this

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
  
  updateTotalAmount();
}

function updateTotalAmount() {
  const quantityInput = document.getElementById('quantity');
  const quantity = parseInt(quantityInput?.value) || 1;
  const amount = selectedAmount || 0;
  const subtotal = amount * quantity;
  
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
  
  container.innerHTML = requests.map(req...
(truncated as per original)
}

// ... (Rest of original file unchanged – form data, payments, helpers)

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