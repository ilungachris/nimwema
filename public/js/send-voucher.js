// Nimwema Platform - Send Voucher JavaScript

// Configuration
const PRESET_AMOUNTS_USD = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const DEFAULT_EXCHANGE_RATE = 2800; // 1 USD = 2800 CDF
const FEE_PERCENTAGE = 3.5;
const MAX_RECIPIENTS_PER_BATCH = 50;
const MAX_TOTAL_QUANTITY = 50;


// Payment result pages
const PAYMENT_SUCCESS_URL = '/payment-success.html';
const PAYMENT_CANCEL_URL  = '/payment-cancel.html';


// State
let currentCurrency = 'USD';
let exchangeRate = DEFAULT_EXCHANGE_RATE;
let selectedAmount = 0;
let recipientCount = 0;
let waitingListRequests = [];

// Initialize
document.addEventListener('DOMContentLoaded', function () {
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
    const apiRate = await fetchAPIRate();
    if (apiRate) {
      exchangeRate = apiRate;
      updateExchangeRateDisplay();
      return;
    }
  } catch (error) {
    console.log('API rate fetch failed, using default...');
  }

  exchangeRate = DEFAULT_EXCHANGE_RATE;
  updateExchangeRateDisplay();
}

// Fetch BCC.cd rate
async function fetchBCCRate() {
  try {
    const response = await fetch('/api/exchange-rate/bcc');
    const data = await response.json();
    if (data.success && data.rate) return data.rate;
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
    if (data.success && data.rate) return data.rate;
  } catch (error) {
    console.error('Error fetching API rate:', error);
  }
  return null;
}

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

function selectCurrency(currency) {
  currentCurrency = currency;
  document.querySelectorAll('.currency-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.currency === currency);
  });
  document.getElementById('amountCurrencySymbol').textContent = currency === 'USD' ? '$' : 'FC';
  document.getElementById('amountPresetGrid').innerHTML = '';
  generatePresetButtons();
  updateCustomAmountEquivalent();
  updateTotalAmount();
}

function selectPresetAmount(amount) {
  selectedAmount = amount;
  document.querySelectorAll('.amount-preset-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  event.target.closest('.amount-preset-btn').classList.add('selected');
  document.getElementById('customAmount').value = '';
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
  return currency === 'USD'
    ? `$${formatNumber(amount)}`
    : `${formatNumber(amount)} FC`;
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function updateCustomAmountEquivalent() {
  const customAmount = parseFloat(document.getElementById('customAmount').value) || 0;
  const equivalentElement = document.getElementById('amountEquivalent');
  if (customAmount > 0) {
    document.querySelectorAll('.amount-preset-btn').forEach(btn => btn.classList.remove('selected'));
    selectedAmount = customAmount;
    const equivalent =
      currentCurrency === 'USD'
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
  const quantity = parseInt(document.getElementById('quantity').value) || 1;
  const amount = selectedAmount || 0;
  const subtotal = amount * quantity;
  document.getElementById('totalAmountDisplay').textContent = formatCurrency(subtotal, currentCurrency);
  updateFees();
  updateBatchInfo(quantity);
}

function updateFees() {
  const quantity = parseInt(document.getElementById('quantity').value) || 1;
  const amount = selectedAmount || 0;
  const coverFees = document.getElementById('coverFees').checked;
  const subtotal = amount * quantity;
  const feeAmount = subtotal * (FEE_PERCENTAGE / 100);
  const total = coverFees ? subtotal + feeAmount : subtotal;
  document.getElementById('feeSubtotal').textContent = formatCurrency(subtotal, currentCurrency);
  document.getElementById('feeAmount').textContent = formatCurrencyWithDecimals(feeAmount, currentCurrency);
  document.getElementById('feeTotalAmount').textContent = formatCurrencyWithDecimals(total, currentCurrency);
}

function formatCurrencyWithDecimals(amount, currency) {
  const formatted = amount.toFixed(2);
  return currency === 'USD' ? `$${formatted}` : `${formatted} FC`;
}

function updateBatchInfo(quantity) {
  const batchCount = Math.ceil(quantity / MAX_RECIPIENTS_PER_BATCH);
  const batchCountEl = document.getElementById('batchCount');
  if (batchCountEl) batchCountEl.textContent = batchCount;
  const batchInfoEl = document.getElementById('batchInfo');
  if (batchInfoEl) {
    if (batchCount > 1) batchInfoEl.classList.remove('hidden');
    else batchInfoEl.classList.add('hidden');
  }
}

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

function renderWaitingList(requests) {
  const container = document.getElementById('waitingListContainer');
  if (!requests.length) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Aucune demande en attente pour le moment</p>
      </div>`;
    return;
  }
  container.innerHTML = requests.map(r => `
    <label class="waiting-list-item">
      <input type="checkbox" class="waiting-list-checkbox" value="${r.id}" onchange="toggleWaitingListItem(this)">
      <div class="waiting-list-info">
        <div class="waiting-list-name">${r.fullName}</div>
        <div class="waiting-list-details">${r.phone}</div>
        ${r.message ? `<div class="waiting-list-details">${r.message}</div>` : ''}
      </div>
    </label>`).join('');
}

function toggleWaitingListItem(cb) {
  const item = cb.closest('.waiting-list-item');
  cb.checked ? item.classList.add('selected') : item.classList.remove('selected');
}

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
    <input type="tel" class="form-input recipient-phone" placeholder="+243 XXX XXX XXX" required>
    <button type="button" class="btn-remove-recipient" onclick="removeRecipientField(this)">✕</button>`;
  container.appendChild(row);
  const phoneInput = row.querySelector('.recipient-phone');
  phoneInput.addEventListener('input', function (e) {
    let value = e.target.value.replace(/[^\d+]/g, '');
    if (value && !value.startsWith('+')) value = '+' + value;
    e.target.value = value;
  });
  updateAddRecipientButton();
}

function removeRecipientField(btn) {
  if (recipientCount <= 1) {
    window.Nimwema.showNotification('Au moins un destinataire requis', 'error');
    return;
  }
  btn.closest('.recipient-input-row').remove();
  recipientCount--;
  updateAddRecipientButton();
}

function updateAddRecipientButton() {
  const quantity = parseInt(document.getElementById('quantity').value) || 1;
  const maxRecipients = Math.min(quantity, MAX_RECIPIENTS_PER_BATCH);
  const button = document.getElementById('addRecipientBtn');
  if (recipientCount >= maxRecipients) {
    button.disabled = true;
    button.style.opacity = '0.5';
  } else {
    button.disabled = false;
    button.style.opacity = '1';
  }
}

function setupEventListeners() {
  document.getElementById('customAmount').addEventListener('input', updateCustomAmountEquivalent);
  document.getElementById('quantity').addEventListener('input', function () {
    let value = parseInt(this.value) || 1;
    if (value > MAX_TOTAL_QUANTITY) value = MAX_TOTAL_QUANTITY;
    if (value < 1) value = 1;
    this.value = value;
    updateTotalAmount();
    updateAddRecipientButton();
  });
  document.getElementById('coverFees').addEventListener('change', updateFees);
  const msg = document.getElementById('message');
  const counter = document.getElementById('messageCount');
  msg.addEventListener('input', () => (counter.textContent = msg.value.length));
  document.getElementById('sendVoucherForm').addEventListener('submit', handleFormSubmit);
}

function checkForPrefilledData() {
  const params = new URLSearchParams(window.location.search);
  const requestId = params.get('request');
  const phone = params.get('phone');
  if (requestId && phone) {
    document.getElementById('recipientsInputContainer').innerHTML = `
      <div class="recipient-input-row"><input type="tel" class="form-input recipient-phone" value="${phone}" readonly></div>`;
    recipientCount = 1;
    document.querySelectorAll('input[name="recipientType"]').forEach(r => (r.disabled = true));
  }
}

// ---------------- Handle Form & Payments ----------------

async function handleFormSubmit(e) {
  e.preventDefault();
  if (!selectedAmount || selectedAmount <= 0) {
    window.Nimwema.showNotification('Veuillez sélectionner un montant', 'error');
    return;
  }
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
  const senderPhoneEl = document.getElementById('senderPhone');
  if (senderPhoneEl) formData.senderPhone = (senderPhoneEl.value || '').trim();

  if (formData.recipientType === 'waiting_list') {
    const selected = document.querySelectorAll('.waiting-list-checkbox:checked');
    formData.recipients = Array.from(selected).map(cb => {
      const req = waitingListRequests.find(r => r.id === parseInt(cb.value));
      return { phone: req.phone, name: req.fullName, requestId: req.id };
    });
    if (!formData.recipients.length) {
      window.Nimwema.showNotification('Veuillez sélectionner au moins un destinataire', 'error');
      return;
    }
  } else {
    const inputs = document.querySelectorAll('.recipient-phone');
    formData.recipients = Array.from(inputs).map(i => ({ phone: i.value.trim() }));
    for (const r of formData.recipients) {
      if (!r.phone || r.phone.length < 10) {
        window.Nimwema.showNotification('Veuillez entrer des numéros valides', 'error');
        return;
      }
    }
  }

  const form = e.target;
  form.classList.add('form-loading');

  try {
    if (formData.paymentMethod === 'flexpay') await processFlexPayPayment(formData);
    else if (formData.paymentMethod === 'flutterwave') await processFlutterwavePayment(formData);
    else if (['cash', 'bank'].includes(formData.paymentMethod)) await processManualPayment(formData);
  } catch (error) {
    console.error('Payment error:', error);
    window.Nimwema.showNotification('Erreur lors du paiement', 'error');
    form.classList.remove('form-loading');
  }
}

// Process FlexPay payment (final clean)
async function processFlexPayPayment(formData) {
  const nm_maskDRC = raw => {
    let v = String(raw || '').replace(/[^\d+]/g, '');
    if (!v.startsWith('+243')) v = '+243' + v.replace(/\D/g, '').replace(/^243?/, '');
    return '+243' + v.replace('+243', '').replace(/\D/g, '').slice(0, 9);
  };
  const nm_isDRC = v => /^\+243\d{9}$/.test(String(v || '').trim());

  if (!formData.senderPhone) {
    window.Nimwema?.showNotification?.('Entrez votre numéro MoMo (+243…)', 'error');
    return;
  }
  formData.senderPhone = nm_maskDRC(formData.senderPhone);
  if (!nm_isDRC(formData.senderPhone)) {
    window.Nimwema?.showNotification?.('Pour FlexPay MoMo, utilisez un numéro DRC au format +243#########', 'error');
    return;
  }

  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:9999';
  overlay.innerHTML = `
    <div style="background:#fff;padding:24px 28px;border-radius:10px;text-align:center;min-width:280px">
      <div style="width:40px;height:40px;border:4px solid #eee;border-top:4px solid #4caf50;border-radius:50%;
      animation:spin 1s linear infinite;margin:0 auto 12px"></div>
      <div>Connexion à FlexPay…</div>
      <style>@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}</style>
    </div>`;
  document.body.appendChild(overlay);

  try {
    const pendingRes = await fetch('/api/vouchers/create-pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const pending = await pendingRes.json();
    if (!pendingRes.ok || !pending?.success) throw new Error(pending?.message || 'Impossible de créer la commande');
    const orderId = pending?.orderId || pending?.order?.id;
    if (!orderId) throw new Error('ID de commande manquant');

    const qty = formData.quantity || 1;
    let base = (selectedAmount || 0) * qty;
    let amountCDF =
      (formData.currency || currentCurrency) === 'USD' ? convertToCDF(base) : base;
    if (formData.coverFees) amountCDF += Math.ceil(amountCDF * (FEE_PERCENTAGE / 100));
    amountCDF = Math.ceil(amountCDF);

    const initRes = await fetch('/api/payment/flexpay/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId,
        amount: amountCDF,
        currency: 'CDF',
        phone: formData.senderPhone
      })
    });
    const initData = await initRes.json();
    if (!initRes.ok || !initData?.success || !initData?.orderNumber) {
      console.error('FlexPay initData:', initData);
      throw new Error(initData?.message || initData?.data?.message || 'Échec d’initialisation FlexPay');
    }
    const orderNumber = initData.orderNumber;

    const started = Date.now();
    const timeoutMs = 2 * 60 * 1000;
    const delay = ms => new Promise(r => setTimeout(r, ms));

    async function finalizeAndRedirect() {
      await fetch('/api/vouchers/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      }).catch(() => {});
      /** window.location.href = `/thank-you.html?order=${encodeURIComponent(orderId)}`;**/
	  window.location.href = `${PAYMENT_SUCCESS_URL}?order=${encodeURIComponent(orderId)}`;

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
     /** if (status === 1) throw new Error('Paiement échoué (FlexPay)'); **/
	  
	  
	  
	   if (status === 1) {
    window.location.href = `${PAYMENT_CANCEL_URL}?order=${encodeURIComponent(orderId)}`;
    return;
  }
    }

    throw new Error("Délai dépassé, statut de paiement inconnu. Réessayez s.v.p.");
  } catch (err) {
    console.error('FlexPay front-end error:', err);
    window.Nimwema?.showNotification?.(err.message || 'Erreur de paiement', 'error');
	
	
	
	  // Optional: route unknown/error to cancel page
  try { window.location.href = `${PAYMENT_CANCEL_URL}`; } catch {}
	
	
	
	
  } finally {
    overlay.remove();
  }
}

async function processFlutterwavePayment(formData) {
  window.location.href = `/payment/flutterwave?data=${encodeURIComponent(JSON.stringify(formData))}`;
}

async function processManualPayment(formData) {
  try {
    const response = await fetch('/api/vouchers/create-pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    const result = await response.json();
    if (result.success) {
      sessionStorage.setItem('pendingOrder', JSON.stringify(result.order));
      window.location.href = '/payment-instructions.html';
    } else throw new Error(result.message);
  } catch (error) {
    throw error;
  }
}

window.selectCurrency = selectCurrency;
window.selectPresetAmount = selectPresetAmount;
window.toggleRecipientFields = toggleRecipientFields;
window.addRecipientField = addRecipientField;
window.removeRecipientField = removeRecipientField;
window.toggleWaitingListItem = toggleWaitingListItem;
window.updateTotalAmount = updateTotalAmount;
window.updateFees = updateFees;
