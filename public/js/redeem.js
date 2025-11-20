/**
 * Voucher Redemption JavaScript
 */

let currentVoucher = null;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    // Check if code is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
        document.getElementById('voucherCode').value = code;
        checkVoucher();
    }

    // Auto-format code input
    document.getElementById('voucherCode').addEventListener('input', function(e) {
        let value = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
        e.target.value = value;
    });

    // Enter key to check
    document.getElementById('voucherCode').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            checkVoucher();
        }
    });

    // Apply translations
    if (typeof applyTranslations === 'function') {
        applyTranslations();
    }
});

// Check voucher validity
async function checkVoucher() {
    const code = document.getElementById('voucherCode').value.trim();
    
    if (!code) {
        showAlert('error', 'Veuillez entrer un code de bon');
        return;
    }

    // Show loading
    showLoading(true);
    hideAlerts();

  try {
    const res = await fetch(`/api/merchant/vouchers/check?code=${encodeURIComponent(code)}`, {
        credentials: 'include'
    });

    // If route not found or not JSON, stop here
    if (!res.ok) {
        const text = await res.text();           // 👈 helps you debug in console
        console.error('Voucher check failed:', res.status, text);
        showLoading(false);
        showAlert('error', 'Code invalide ou bon introuvable');
        currentVoucher = null;
        return;
    }

    const data = await res.json();               // now safe

    showLoading(false);

    if (data.success && data.voucher) {
        currentVoucher = data.voucher;
        displayVoucherDetails(data.voucher);
    } else {
        showAlert('error', data.message || 'Code invalide ou bon déjà utilisé');
        currentVoucher = null;
    }
} catch (error) {
    showLoading(false);
    showAlert('error', 'Erreur lors de la vérification du code');
    console.error('Error:', error);
}

}

// Display voucher details
function displayVoucherDetails(voucher) {
    // Show details section
    document.getElementById('voucherDetails').classList.add('active');
    
    // Update details
    document.getElementById('voucherAmount').textContent = `${voucher.amount} ${voucher.currency}`;
    document.getElementById('detailCode').textContent = voucher.code;
    document.getElementById('detailStatus').textContent = getStatusText(voucher.status);
    document.getElementById('detailExpiry').textContent = formatDate(voucher.expires_at);
    
    // Sender info
    if (voucher.hide_identity) {
        document.getElementById('senderRow').style.display = 'none';
    } else {
        document.getElementById('senderRow').style.display = 'flex';
        document.getElementById('detailSender').textContent = voucher.sender_name || 'Anonyme';
    }
    
    // Message
    if (voucher.message) {
        document.getElementById('messageRow').style.display = 'flex';
        document.getElementById('detailMessage').textContent = voucher.message;
    } else {
        document.getElementById('messageRow').style.display = 'none';
    }
    
    // Update buttons
    document.getElementById('checkBtn').style.display = 'none';
    document.getElementById('cancelBtn').style.display = 'block';
    document.getElementById('redeemBtn').style.display = 'block';
    
    // Pre-fill merchant phone if available
    const merchantPhone = localStorage.getItem('merchantPhone');
    const merchantName = localStorage.getItem('merchantName');
    if (merchantPhone) {
        document.getElementById('merchantPhone').value = merchantPhone;
    }
    if (merchantName) {
        document.getElementById('merchantName').value = merchantName;
    }
}

// Redeem voucher
async function redeemVoucher() {
    if (!currentVoucher) {
        showAlert('error', 'Aucun bon sélectionné');
        return;
    }

    // Validate merchant info
    const merchantName = document.getElementById('merchantName').value.trim();
    const merchantPhone = document.getElementById('merchantPhone').value.trim();
    
    if (!merchantName) {
        showAlert('error', 'Veuillez entrer le nom du marchand');
        return;
    }
    
    if (!merchantPhone) {
        showAlert('error', 'Veuillez entrer le téléphone du marchand');
        return;
    }

    // Confirm redemption
    if (!confirm(`Confirmer l'utilisation du bon de ${currentVoucher.amount} ${currentVoucher.currency}?`)) {
        return;
    }

    // Show loading
    showLoading(true);
    hideAlerts();

      try {
        const response = await fetch('/api/merchant/vouchers/redeem', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                code: currentVoucher.code,
                merchant_name: merchantName,
                merchant_phone: merchantPhone,
                location: document.getElementById('location').value.trim(),
                notes: document.getElementById('notes').value.trim()
            })
        });

        if (!response.ok) {
            // 404 or other server error → show “code invalide / erreur”
            const text = await response.text();
            console.error('Redeem API error', response.status, text);
            showLoading(false);
            showAlert('error', "Erreur lors de l'utilisation du bon");
            return;
        }

        const data = await response.json();

        showLoading(false);

        if (data.success) {
            // Save merchant info for next time
            localStorage.setItem('merchantName', merchantName);
            localStorage.setItem('merchantPhone', merchantPhone);
            
            // Show success state
            showSuccessState(data.voucher, data.redemption);
        } else {
            showAlert('error', data.message || "Erreur lors de l'utilisation du bon");
        }
    } catch (error) {
        showLoading(false);
        showAlert('error', "Erreur lors de l'utilisation du bon");
        console.error('Error:', error);
    }

}

// Show success state
function showSuccessState(voucher, redemption) {
    // Hide initial state
    document.getElementById('initialState').style.display = 'none';
    
    // Show success state
    const successState = document.getElementById('successState');
    successState.style.display = 'block';
    
    // Update success details
    document.getElementById('successAmount').textContent = `${voucher.amount} ${voucher.currency}`;
    document.getElementById('successCode').textContent = voucher.code;
    document.getElementById('successMerchant').textContent = redemption.merchant_name;
    document.getElementById('successDate').textContent = formatDateTime(redemption.created_at);
}

// Reset form
function resetForm() {
    // Hide success state
    document.getElementById('successState').style.display = 'none';
    
    // Show initial state
    document.getElementById('initialState').style.display = 'block';
    
    // Reset form
    document.getElementById('voucherCode').value = '';
    document.getElementById('voucherDetails').classList.remove('active');
    document.getElementById('merchantName').value = '';
    document.getElementById('merchantPhone').value = '';
    document.getElementById('location').value = '';
    document.getElementById('notes').value = '';
    
    // Reset buttons
    document.getElementById('checkBtn').style.display = 'block';
    document.getElementById('cancelBtn').style.display = 'none';
    document.getElementById('redeemBtn').style.display = 'none';
    
    // Clear current voucher
    currentVoucher = null;
    
    // Hide alerts
    hideAlerts();
}

// Show alert
function showAlert(type, message) {
    hideAlerts();
    
    const alertId = type === 'error' ? 'alertError' : 
                    type === 'warning' ? 'alertWarning' : 'alertSuccess';
    
    const alert = document.getElementById(alertId);
    alert.textContent = message;
    alert.classList.add('active');
}

// Hide all alerts
function hideAlerts() {
    document.getElementById('alertSuccess').classList.remove('active');
    document.getElementById('alertError').classList.remove('active');
    document.getElementById('alertWarning').classList.remove('active');
}

// Show/hide loading
function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    if (show) {
        spinner.classList.add('active');
    } else {
        spinner.classList.remove('active');
    }
}

// Get status text
function getStatusText(status) {
    const statuses = {
        'pending': 'Valide',
        'redeemed': 'Déjà utilisé',
        'expired': 'Expiré',
        'cancelled': 'Annulé'
    };
    return statuses[status] || status;
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format date and time
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
