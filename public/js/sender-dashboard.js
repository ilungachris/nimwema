// Sender Dashboard JavaScript

// State management
let currentSection = 'vouchers';
let vouchers = [];
let recipients = [];
let transactions = [];
let stats = {
    totalSent: 0,
    redeemedCount: 0,
    pendingCount: 0,
    recipientCount: 0
};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    loadDashboardData();
    setupEventListeners();
    initializeI18n();
});

// Initialize navigation
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            switchSection(section);
        });
    });
}

// Switch between sections
function switchSection(section) {
    currentSection = section;
    
    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`[data-section="${section}"]`).classList.add('active');
    
    // Update sections
    document.querySelectorAll('.dashboard-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(`${section}-section`).classList.add('active');
    
    // Load section data
    loadSectionData(section);
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load statistics
        const statsResponse = await fetch('/api/sender/stats');
        if (statsResponse.ok) {
            stats = await statsResponse.json();
            updateStatistics();
        }
        
        // Load initial section data
        loadSectionData(currentSection);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load section-specific data
async function loadSectionData(section) {
    switch(section) {
        case 'vouchers':
            await loadVouchers();
            break;
        case 'recipients':
            await loadRecipients();
            break;
        case 'transactions':
            await loadTransactions();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Update statistics display
function updateStatistics() {
    document.getElementById('totalSent').textContent = `$${stats.totalSent.toLocaleString()}`;
    document.getElementById('redeemedCount').textContent = stats.redeemedCount;
    document.getElementById('pendingCount').textContent = stats.pendingCount;
    document.getElementById('recipientCount').textContent = stats.recipientCount;
}

// Load vouchers
async function loadVouchers() {
    try {
        const response = await fetch('/api/sender/vouchers');
        if (response.ok) {
            vouchers = await response.json();
            displayVouchers(vouchers);
        } else {
            // Demo data for testing
            vouchers = generateDemoVouchers();
            displayVouchers(vouchers);
        }
    } catch (error) {
        console.error('Error loading vouchers:', error);
        // Show demo data
        vouchers = generateDemoVouchers();
        displayVouchers(vouchers);
    }
}

// Generate demo vouchers
function generateDemoVouchers() {
    return [
        {
            id: 1,
            code: 'NMW-ABC123',
            amount: 50,
            currency: 'USD',
            status: 'pending',
            recipient: '+243 812 345 678',
            recipientName: 'Jean Mukendi',
            createdAt: new Date('2024-01-15'),
            expiresAt: new Date('2024-04-15'),
            message: 'Pour vos courses'
        },
        {
            id: 2,
            code: 'NMW-DEF456',
            amount: 100,
            currency: 'USD',
            status: 'redeemed',
            recipient: '+243 823 456 789',
            recipientName: 'Marie Kabila',
            createdAt: new Date('2024-01-10'),
            redeemedAt: new Date('2024-01-12'),
            expiresAt: new Date('2024-04-10')
        },
        {
            id: 3,
            code: 'NMW-GHI789',
            amount: 25,
            currency: 'USD',
            status: 'pending',
            recipient: '+243 834 567 890',
            recipientName: 'Pierre Tshisekedi',
            createdAt: new Date('2024-01-20'),
            expiresAt: new Date('2024-04-20'),
            message: 'Bon courage!'
        }
    ];
}

// Display vouchers
function displayVouchers(vouchersToDisplay) {
    const grid = document.getElementById('vouchersGrid');
    const emptyState = document.getElementById('noVouchers');
    
    if (vouchersToDisplay.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    grid.innerHTML = vouchersToDisplay.map(voucher => `
        <div class="voucher-card ${voucher.status}">
            <div class="voucher-header">
                <div class="voucher-code">${voucher.code}</div>
                <span class="voucher-status ${voucher.status}" data-i18n="${voucher.status}">
                    ${getStatusText(voucher.status)}
                </span>
            </div>
            <div class="voucher-amount">$${voucher.amount}</div>
            <div class="voucher-details">
                <div class="voucher-detail-item">
                    <span class="voucher-detail-label" data-i18n="recipient">Destinataire:</span>
                    <span class="voucher-detail-value">${voucher.recipientName || voucher.recipient}</span>
                </div>
                <div class="voucher-detail-item">
                    <span class="voucher-detail-label" data-i18n="sent_on">Envoyé le:</span>
                    <span class="voucher-detail-value">${formatDate(voucher.createdAt)}</span>
                </div>
                ${voucher.status === 'redeemed' ? `
                <div class="voucher-detail-item">
                    <span class="voucher-detail-label" data-i18n="redeemed_on">Utilisé le:</span>
                    <span class="voucher-detail-value">${formatDate(voucher.redeemedAt)}</span>
                </div>
                ` : `
                <div class="voucher-detail-item">
                    <span class="voucher-detail-label" data-i18n="expires_on">Expire le:</span>
                    <span class="voucher-detail-value">${formatDate(voucher.expiresAt)}</span>
                </div>
                `}
            </div>
            <div class="voucher-actions">
                <button class="btn-view-details" onclick="showVoucherDetails(${voucher.id})" data-i18n="view_details">
                    Voir Détails
                </button>
            </div>
        </div>
    `).join('');
}

// Get status text
function getStatusText(status) {
    const statusTexts = {
        'pending': 'En attente',
        'redeemed': 'Utilisé',
        'expired': 'Expiré'
    };
    return statusTexts[status] || status;
}

// Format date
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Show voucher details modal
function showVoucherDetails(voucherId) {
    const voucher = vouchers.find(v => v.id === voucherId);
    if (!voucher) return;
    
    const modal = document.getElementById('voucherDetailsModal');
    const content = document.getElementById('voucherDetailsContent');
    
    content.innerHTML = `
        <div class="voucher-details-full">
            <div class="detail-row">
                <strong data-i18n="voucher_code">Code du bon:</strong>
                <span>${voucher.code}</span>
            </div>
            <div class="detail-row">
                <strong data-i18n="amount">Montant:</strong>
                <span>$${voucher.amount} ${voucher.currency}</span>
            </div>
            <div class="detail-row">
                <strong data-i18n="status">Statut:</strong>
                <span class="voucher-status ${voucher.status}">${getStatusText(voucher.status)}</span>
            </div>
            <div class="detail-row">
                <strong data-i18n="recipient">Destinataire:</strong>
                <span>${voucher.recipientName || voucher.recipient}</span>
            </div>
            <div class="detail-row">
                <strong data-i18n="phone_number">Téléphone:</strong>
                <span>${voucher.recipient}</span>
            </div>
            <div class="detail-row">
                <strong data-i18n="sent_on">Envoyé le:</strong>
                <span>${formatDate(voucher.createdAt)}</span>
            </div>
            ${voucher.status === 'redeemed' ? `
            <div class="detail-row">
                <strong data-i18n="redeemed_on">Utilisé le:</strong>
                <span>${formatDate(voucher.redeemedAt)}</span>
            </div>
            ` : `
            <div class="detail-row">
                <strong data-i18n="expires_on">Expire le:</strong>
                <span>${formatDate(voucher.expiresAt)}</span>
            </div>
            `}
            ${voucher.message ? `
            <div class="detail-row">
                <strong data-i18n="message">Message:</strong>
                <span>${voucher.message}</span>
            </div>
            ` : ''}
        </div>
    `;
    
    modal.classList.add('active');
}

// Close voucher details modal
function closeVoucherDetailsModal() {
    document.getElementById('voucherDetailsModal').classList.remove('active');
}

// Load recipients
async function loadRecipients() {
    try {
        const response = await fetch('/api/sender/recipients');
        if (response.ok) {
            recipients = await response.json();
            displayRecipients(recipients);
        } else {
            // Demo data
            recipients = generateDemoRecipients();
            displayRecipients(recipients);
        }
    } catch (error) {
        console.error('Error loading recipients:', error);
        recipients = generateDemoRecipients();
        displayRecipients(recipients);
    }
}

// Generate demo recipients
function generateDemoRecipients() {
    return [
        {
            id: 1,
            name: 'Jean Mukendi',
            phone: '+243 812 345 678',
            vouchersReceived: 5,
            totalAmount: 250,
            notes: 'Frère'
        },
        {
            id: 2,
            name: 'Marie Kabila',
            phone: '+243 823 456 789',
            vouchersReceived: 3,
            totalAmount: 150,
            notes: 'Sœur'
        },
        {
            id: 3,
            name: 'Pierre Tshisekedi',
            phone: '+243 834 567 890',
            vouchersReceived: 2,
            totalAmount: 100,
            notes: 'Ami'
        }
    ];
}

// Display recipients
function displayRecipients(recipientsToDisplay) {
    const grid = document.getElementById('recipientsGrid');
    const emptyState = document.getElementById('noRecipients');
    
    if (recipientsToDisplay.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    grid.innerHTML = recipientsToDisplay.map(recipient => `
        <div class="recipient-card">
            <div class="recipient-header">
                <div class="recipient-avatar">${recipient.name.charAt(0).toUpperCase()}</div>
                <div class="recipient-info">
                    <h3>${recipient.name}</h3>
                    <p class="recipient-phone">${recipient.phone}</p>
                </div>
            </div>
            <div class="recipient-stats">
                <div class="recipient-stat">
                    <div class="recipient-stat-value">${recipient.vouchersReceived}</div>
                    <div class="recipient-stat-label" data-i18n="vouchers">Bons</div>
                </div>
                <div class="recipient-stat">
                    <div class="recipient-stat-value">$${recipient.totalAmount}</div>
                    <div class="recipient-stat-label" data-i18n="total">Total</div>
                </div>
            </div>
            ${recipient.notes ? `<p style="font-size: 0.875rem; color: #666; margin: 10px 0;">${recipient.notes}</p>` : ''}
            <div class="recipient-actions">
                <button class="btn-send-voucher" onclick="sendToRecipient(${recipient.id})" data-i18n="send_voucher">
                    Envoyer un Bon
                </button>
                <button class="btn-edit-recipient" onclick="editRecipient(${recipient.id})" data-i18n="edit">
                    Modifier
                </button>
                <button class="btn-delete-recipient" onclick="deleteRecipient(${recipient.id})" data-i18n="delete">
                    Supprimer
                </button>
            </div>
        </div>
    `).join('');
}

// Show add recipient modal
function showAddRecipientModal() {
    document.getElementById('recipientModalTitle').setAttribute('data-i18n', 'add_recipient');
    document.getElementById('recipientModalTitle').textContent = 'Ajouter un Destinataire';
    document.getElementById('recipientForm').reset();
    document.getElementById('recipientId').value = '';
    document.getElementById('recipientModal').classList.add('active');
}

// Edit recipient
function editRecipient(recipientId) {
    const recipient = recipients.find(r => r.id === recipientId);
    if (!recipient) return;
    
    document.getElementById('recipientModalTitle').setAttribute('data-i18n', 'edit_recipient');
    document.getElementById('recipientModalTitle').textContent = 'Modifier le Destinataire';
    document.getElementById('recipientId').value = recipient.id;
    document.getElementById('recipientName').value = recipient.name;
    document.getElementById('recipientPhone').value = recipient.phone;
    document.getElementById('recipientNotes').value = recipient.notes || '';
    document.getElementById('recipientModal').classList.add('active');
}

// Delete recipient
async function deleteRecipient(recipientId) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce destinataire?')) return;
    
    try {
        const response = await fetch(`/api/sender/recipients/${recipientId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            await loadRecipients();
            alert('Destinataire supprimé avec succès');
        }
    } catch (error) {
        console.error('Error deleting recipient:', error);
        alert('Erreur lors de la suppression du destinataire');
    }
}

// Close recipient modal
function closeRecipientModal() {
    document.getElementById('recipientModal').classList.remove('active');
}

// Send voucher to recipient
function sendToRecipient(recipientId) {
    const recipient = recipients.find(r => r.id === recipientId);
    if (!recipient) return;
    
    // Redirect to send page with pre-filled recipient info
    window.location.href = `send.html?recipient=${encodeURIComponent(recipient.phone)}&name=${encodeURIComponent(recipient.name)}`;
}

// Load transactions
async function loadTransactions() {
    try {
        const response = await fetch('/api/sender/transactions');
        if (response.ok) {
            transactions = await response.json();
            displayTransactions(transactions);
        } else {
            // Demo data
            transactions = generateDemoTransactions();
            displayTransactions(transactions);
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
        transactions = generateDemoTransactions();
        displayTransactions(transactions);
    }
}

// Generate demo transactions
function generateDemoTransactions() {
    return [
        {
            id: 1,
            transactionId: 'TXN-2024-001',
            date: new Date('2024-01-15'),
            amount: 50,
            paymentMethod: 'flexpay',
            vouchersCount: 1,
            status: 'completed'
        },
        {
            id: 2,
            transactionId: 'TXN-2024-002',
            date: new Date('2024-01-10'),
            amount: 100,
            paymentMethod: 'flutterwave',
            vouchersCount: 2,
            status: 'completed'
        },
        {
            id: 3,
            transactionId: 'TXN-2024-003',
            date: new Date('2024-01-20'),
            amount: 25,
            paymentMethod: 'cash',
            vouchersCount: 1,
            status: 'pending'
        }
    ];
}

// Display transactions
function displayTransactions(transactionsToDisplay) {
    const tbody = document.getElementById('transactionsTableBody');
    const emptyState = document.getElementById('noTransactions');
    
    if (transactionsToDisplay.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    tbody.innerHTML = transactionsToDisplay.map(transaction => `
        <tr>
            <td>${formatDate(transaction.date)}</td>
            <td class="transaction-id">${transaction.transactionId}</td>
            <td class="transaction-amount">$${transaction.amount}</td>
            <td>${getPaymentMethodText(transaction.paymentMethod)}</td>
            <td>${transaction.vouchersCount}</td>
            <td>
                <span class="transaction-status ${transaction.status}">
                    ${getTransactionStatusText(transaction.status)}
                </span>
            </td>
            <td>
                <button class="btn-view-transaction" onclick="viewTransaction(${transaction.id})">
                    Voir
                </button>
            </td>
        </tr>
    `).join('');
}

// Get payment method text
function getPaymentMethodText(method) {
    const methods = {
        'flexpay': 'FlexPay',
        'flutterwave': 'Flutterwave',
        'cash': 'Cash/Western Union',
        'bank': 'Virement Bancaire'
    };
    return methods[method] || method;
}

// Get transaction status text
function getTransactionStatusText(status) {
    const statuses = {
        'completed': 'Complété',
        'pending': 'En attente',
        'failed': 'Échoué'
    };
    return statuses[status] || status;
}

// View transaction
function viewTransaction(transactionId) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    
    alert(`Détails de la transaction:\n\nID: ${transaction.transactionId}\nMontant: $${transaction.amount}\nStatut: ${getTransactionStatusText(transaction.status)}`);
}

// Export transactions
function exportTransactions() {
    // Create CSV content
    let csv = 'Date,ID Transaction,Montant,Méthode,Bons,Statut\n';
    transactions.forEach(t => {
        csv += `${formatDate(t.date)},${t.transactionId},$${t.amount},${getPaymentMethodText(t.paymentMethod)},${t.vouchersCount},${getTransactionStatusText(t.status)}\n`;
    });
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Load settings
function loadSettings() {
    // Load saved settings from localStorage
    const settings = JSON.parse(localStorage.getItem('senderSettings') || '{}');
    
    document.getElementById('emailNotifications').checked = settings.emailNotifications !== false;
    document.getElementById('smsNotifications').checked = settings.smsNotifications !== false;
    document.getElementById('redemptionAlerts').checked = settings.redemptionAlerts !== false;
    document.getElementById('defaultCurrency').value = settings.defaultCurrency || 'USD';
    document.getElementById('languageSetting').value = settings.language || 'fr';
    document.getElementById('hideIdentity').checked = settings.hideIdentity || false;
    document.getElementById('shareStats').checked = settings.shareStats || false;
}

// Save settings
function saveSettings() {
    const settings = {
        emailNotifications: document.getElementById('emailNotifications').checked,
        smsNotifications: document.getElementById('smsNotifications').checked,
        redemptionAlerts: document.getElementById('redemptionAlerts').checked,
        defaultCurrency: document.getElementById('defaultCurrency').value,
        language: document.getElementById('languageSetting').value,
        hideIdentity: document.getElementById('hideIdentity').checked,
        shareStats: document.getElementById('shareStats').checked
    };
    
    localStorage.setItem('senderSettings', JSON.stringify(settings));
    alert('Paramètres enregistrés avec succès!');
}

// Setup event listeners
function setupEventListeners() {
    // Status filter
    document.getElementById('statusFilter').addEventListener('change', filterVouchers);
    
    // Sort filter
    document.getElementById('sortFilter').addEventListener('change', filterVouchers);
    
    // Search
    document.getElementById('searchVouchers').addEventListener('input', filterVouchers);
    
    // Date range filter
    document.getElementById('dateRangeFilter').addEventListener('change', filterTransactions);
    
    // Payment method filter
    document.getElementById('paymentMethodFilter').addEventListener('change', filterTransactions);
    
    // Recipient form
    document.getElementById('recipientForm').addEventListener('submit', handleRecipientSubmit);
    
    // Modal close on outside click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

// Filter vouchers
function filterVouchers() {
    const status = document.getElementById('statusFilter').value;
    const sort = document.getElementById('sortFilter').value;
    const search = document.getElementById('searchVouchers').value.toLowerCase();
    
    let filtered = [...vouchers];
    
    // Filter by status
    if (status !== 'all') {
        filtered = filtered.filter(v => v.status === status);
    }
    
    // Filter by search
    if (search) {
        filtered = filtered.filter(v => 
            v.code.toLowerCase().includes(search) ||
            (v.recipientName && v.recipientName.toLowerCase().includes(search)) ||
            v.recipient.includes(search)
        );
    }
    
    // Sort
    filtered.sort((a, b) => {
        switch(sort) {
            case 'date-desc':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'date-asc':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'amount-desc':
                return b.amount - a.amount;
            case 'amount-asc':
                return a.amount - b.amount;
            default:
                return 0;
        }
    });
    
    displayVouchers(filtered);
}

// Filter transactions
function filterTransactions() {
    const dateRange = document.getElementById('dateRangeFilter').value;
    const paymentMethod = document.getElementById('paymentMethodFilter').value;
    
    let filtered = [...transactions];
    
    // Filter by date range
    if (dateRange !== 'all') {
        const now = new Date();
        filtered = filtered.filter(t => {
            const tDate = new Date(t.date);
            switch(dateRange) {
                case 'today':
                    return tDate.toDateString() === now.toDateString();
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return tDate >= weekAgo;
                case 'month':
                    return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
                case 'year':
                    return tDate.getFullYear() === now.getFullYear();
                default:
                    return true;
            }
        });
    }
    
    // Filter by payment method
    if (paymentMethod !== 'all') {
        filtered = filtered.filter(t => t.paymentMethod === paymentMethod);
    }
    
    displayTransactions(filtered);
}

// Handle recipient form submit
async function handleRecipientSubmit(e) {
    e.preventDefault();
    
    const recipientId = document.getElementById('recipientId').value;
    const recipientData = {
        name: document.getElementById('recipientName').value,
        phone: document.getElementById('recipientPhone').value,
        notes: document.getElementById('recipientNotes').value
    };
    
    try {
        const url = recipientId ? `/api/sender/recipients/${recipientId}` : '/api/sender/recipients';
        const method = recipientId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recipientData)
        });
        
        if (response.ok) {
            closeRecipientModal();
            await loadRecipients();
            alert(recipientId ? 'Destinataire modifié avec succès' : 'Destinataire ajouté avec succès');
        }
    } catch (error) {
        console.error('Error saving recipient:', error);
        alert('Erreur lors de l\'enregistrement du destinataire');
    }
}

// Initialize i18n
function initializeI18n() {
    // Language toggle
    const languageToggle = document.getElementById('languageToggle');
    if (languageToggle) {
        languageToggle.addEventListener('click', function() {
            const currentLang = localStorage.getItem('language') || 'fr';
            const newLang = currentLang === 'fr' ? 'en' : 'fr';
            localStorage.setItem('language', newLang);
            location.reload();
        });
    }
    
    // Apply translations
    if (typeof applyTranslations === 'function') {
        applyTranslations();
    }
}
// Load sender profile info
async function loadSenderProfile() {
    try {
        // For now, use mock data - will be replaced with actual API call
        const senderName = localStorage.getItem('senderName') || 'Jean Dupont';
        const senderPhone = localStorage.getItem('senderPhone') || '+243123456789';
        
        document.getElementById('senderName').textContent = senderName;
        document.getElementById('senderPhone').textContent = senderPhone;
    } catch (error) {
        console.error('Error loading sender profile:', error);
    }
}

// Call on page load
loadSenderProfile();

