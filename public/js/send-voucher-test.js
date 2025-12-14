
// ============================================================
// NIMWEMA TEST VERSION - send-voucher.js
// ============================================================
// This is a TEST version that redirects to payment-preview.html
// instead of processing actual payments.
//
// TO RESTORE ORIGINAL:
// 1. Rename this file to send-voucher-TEST.js
// 2. Rename send-voucher-ORIGINAL.js back to send-voucher.js
// ============================================================

// Configuration
const PRESET_AMOUNTS_USD = [10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
const DEFAULT_EXCHANGE_RATE = 2800;
const FEE_PERCENTAGE = 3.5;
const MAX_RECIPIENTS_PER_BATCH = 50;
const MAX_TOTAL_QUANTITY = 50;

// TEST MODE: Redirect to preview instead of payment pages
const TEST_MODE = true;
const PREVIEW_PAGE = '/payment-preview.html';

// Payment result pages (not used in test mode)
const PAYMENT_SUCCESS_URL = '/payment-success.html';
const PAYMENT_CANCEL_URL = '/payment-cancel.html';
const PAYMENT_INSTRUCTIONS_URL = '/payment-instructions.html';

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
    
    // Show test mode banner
    if (TEST_MODE) {
        showTestModeBanner();
    }
});

function showTestModeBanner() {
    const banner = document.createElement('div');
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: linear-gradient(90deg, #f97316, #ea580c);
        color: white;
        padding: 12px 20px;
        text-align: center;
        font-weight: 600;
        z-index: 10000;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    `;
    banner.innerHTML = `
        🧪 MODE TEST ACTIVÉ - Les paiements seront simulés et redirigés vers la page de prévisualisation
        <button onclick="this.parentElement.remove()" style="
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 4px 12px;
            border-radius: 4px;
            margin-left: 20px;
            cursor: pointer;
        ">×</button>
    `;
    document.body.prepend(banner);
    document.body.style.paddingTop = '50px';
}

// Initialize form
function initializeSendForm() {
    console.log('Send voucher form initialized - TEST MODE');
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
    selectedAmount = currentCurrency === 'USD' ? amount : convertToCDF(amount);
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
        window.Nimwema?.showNotification?.(`Maximum ${maxRecipients} destinataires par lot`, 'warning');
        return;
    }
    recipientCount++;
    const row = document.createElement('div');
    row.className = 'recipient-input-row';
    row.innerHTML = `
        <input type="tel" class="form-input recipient-phone" placeholder="+243 XXX XXX XXX" required>
        <button type="button" class="btn btn-secondary" onclick="removeRecipientField(this)">✕</button>`;
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
        window.Nimwema?.showNotification?.('Au moins un destinataire requis', 'error');
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

// ============================================================
// TEST MODE: Handle Form Submit -> Redirect to Preview
// ============================================================

async function handleFormSubmit(e) {
    e.preventDefault();
    
    if (!selectedAmount || selectedAmount <= 0) {
        window.Nimwema?.showNotification?.('Veuillez sélectionner un montant', 'error');
        return;
    }
    
    // Collect form data
    const formData = collectFormData();
    
    // Validate
    const validation = validateFormData(formData);
    if (!validation.valid) {
        window.Nimwema?.showNotification?.(validation.message, 'error');
        return;
    }
    
    console.log('📋 Form data collected for preview:', formData);
    
    // TEST MODE: Redirect to preview page
    if (TEST_MODE) {
        sessionStorage.setItem('paymentPreviewData', JSON.stringify(formData));
        window.location.href = PREVIEW_PAGE;
        return;
    }
    
    // ORIGINAL: Process payment (not executed in test mode)
    const form = e.target;
    form.classList.add('form-loading');
    
    try {
        if (formData.paymentMethod === 'flexpay') await processFlexPayMobilePayment(formData);
        else if (formData.paymentMethod === 'flexpaycard') await processFlexPayCardPayment(formData);
        else if (['cash', 'bank'].includes(formData.paymentMethod)) await processManualPayment(formData);
    } catch (error) {
        console.error('Payment error:', error);
        window.Nimwema?.showNotification?.('Erreur lors du paiement', 'error');
        form.classList.remove('form-loading');
    }
}

function collectFormData() {
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
        recipients: [],
        exchangeRate: exchangeRate
    };
    
    const senderPhoneEl = document.getElementById('senderPhone');
    if (senderPhoneEl) formData.senderPhone = (senderPhoneEl.value || '').trim();
    
    // Add email and password for Cash/WU orders
    if (["cash", "bank"].includes(formData.paymentMethod)) {
        const emailEl = document.getElementById("senderEmail");
        const passwordEl = document.getElementById("senderPassword");
        if (emailEl) formData.email = emailEl.value.trim();
        if (passwordEl) formData.password = passwordEl.value;
    }
    
    // Get recipients
    if (formData.recipientType === 'waiting_list') {
        const selected = document.querySelectorAll('.waiting-list-checkbox:checked');
        formData.recipients = Array.from(selected).map(cb => {
            const req = waitingListRequests.find(r => r.id === parseInt(cb.value));
            return { phone: req.phone, name: req.fullName, requestId: req.id };
        });
    } else {
        const inputs = document.querySelectorAll('.recipient-phone');
        formData.recipients = Array.from(inputs).map(i => ({ phone: i.value.trim() }));
    }
    
    return formData;
}

function validateFormData(data) {
    if (!data.amount || data.amount <= 0) {
        return { valid: false, message: 'Veuillez sélectionner un montant' };
    }
    if (!data.senderName || !data.senderName.trim()) {
        return { valid: false, message: 'Veuillez entrer votre nom' };
    }
    if (!data.senderPhone || !data.senderPhone.trim()) {
        return { valid: false, message: 'Veuillez entrer votre numéro de téléphone' };
    }
    if (!data.recipients || data.recipients.length === 0) {
        return { valid: false, message: 'Veuillez ajouter au moins un destinataire' };
    }
    for (let i = 0; i < data.recipients.length; i++) {
        const r = data.recipients[i];
        if (!r.phone || r.phone.length < 10) {
            return { valid: false, message: `Numéro invalide pour le destinataire ${i + 1}` };
        }
    }
    return { valid: true };
}

// ============================================================
// PAYMENT PROCESSORS (Not used in TEST_MODE)
// ============================================================

async function processFlexPayMobilePayment(formData) {
    console.log('FlexPay Mobile payment would be processed here');
}

async function processFlexPayCardPayment(formData) {
    console.log('FlexPay Card payment would be processed here');
}

async function processManualPayment(formData) {
    console.log('Manual payment would be processed here');
}

// Export functions for global access
window.selectCurrency = selectCurrency;
window.selectPresetAmount = selectPresetAmount;
window.toggleRecipientFields = toggleRecipientFields;
window.addRecipientField = addRecipientField;
window.removeRecipientField = removeRecipientField;
window.toggleWaitingListItem = toggleWaitingListItem;
window.updateTotalAmount = updateTotalAmount;
window.updateFees = updateFees;