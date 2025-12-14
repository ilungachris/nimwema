/**
 * Nimwema Payment Preview Integration
 * 
 * This script should be added to send.html to enable the test/preview functionality.
 * It intercepts the form submission and redirects to payment-preview.html
 * 
 * To use: Add this script after send-voucher.js in send.html
 * <script src="/js/payment-preview.js"></script>
 */

(function() {
    'use strict';

    // Configuration
    const ENABLE_PREVIEW = true; // Set to false to disable preview mode
    const PREVIEW_PAGE = '/payment-preview.html';

    // Wait for DOM and send-voucher.js to initialize
    document.addEventListener('DOMContentLoaded', function() {
        if (!ENABLE_PREVIEW) return;

        // Wait a bit for send-voucher.js to set up its handlers
        setTimeout(setupPreviewInterceptor, 500);
    });

    function setupPreviewInterceptor() {
        const form = document.getElementById('sendVoucherForm');
        if (!form) {
            console.warn('[PaymentPreview] Form not found');
            return;
        }

        // Store the original submit handler
        const originalHandlers = form.onsubmit;

        // Override form submission
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Collect all form data
            const formData = collectFormData();
            
            if (!formData) {
                console.error('[PaymentPreview] Failed to collect form data');
                return;
            }

            // Validate the data
            const validation = validateFormData(formData);
            if (!validation.valid) {
                showNotification(validation.message, 'error');
                return;
            }

            // Store in sessionStorage and redirect to preview
            sessionStorage.setItem('paymentPreviewData', JSON.stringify(formData));
            console.log('[PaymentPreview] Form data captured:', formData);

            // Redirect to preview page
            window.location.href = PREVIEW_PAGE;
        }, true); // Use capture phase to intercept before other handlers

        console.log('[PaymentPreview] Preview interceptor installed');
    }

    function collectFormData() {
        try {
            // Get the selected amount (from send-voucher.js global or recalculate)
            let selectedAmount = window.selectedAmount || 0;
            const customAmountInput = document.getElementById('customAmount');
            if (customAmountInput && customAmountInput.value) {
                selectedAmount = parseFloat(customAmountInput.value);
            }
            if (!selectedAmount) {
                const selectedBtn = document.querySelector('.amount-preset-btn.selected');
                if (selectedBtn) {
                    // Parse the amount from the button
                    const text = selectedBtn.querySelector('.amount-primary')?.textContent || '';
                    selectedAmount = parseFloat(text.replace(/[^0-9.]/g, ''));
                }
            }

            // Get currency
            const currencyBtn = document.querySelector('.currency-btn.active');
            const currency = currencyBtn?.dataset.currency || 'USD';

            // Get quantity
            const quantity = parseInt(document.getElementById('quantity')?.value) || 1;

            // Get sender info
            const senderName = document.getElementById('senderName')?.value || '';
            const senderPhone = document.getElementById('senderPhone')?.value || '';
            const hideIdentity = document.getElementById('hideIdentity')?.checked || false;
            const message = document.getElementById('message')?.value || '';
            const coverFees = document.getElementById('coverFees')?.checked || false;

            // Get payment method
            const paymentMethodRadio = document.querySelector('input[name="paymentMethod"]:checked');
            const paymentMethod = paymentMethodRadio?.value || 'flexpay';

            // Get recipient type
            const recipientTypeRadio = document.querySelector('input[name="recipientType"]:checked');
            const recipientType = recipientTypeRadio?.value || 'specific';

            // Get recipients
            const recipients = [];
            
            if (recipientType === 'waiting_list') {
                // Get selected waiting list items
                const selectedItems = document.querySelectorAll('.waiting-list-checkbox:checked');
                selectedItems.forEach(cb => {
                    const item = cb.closest('.waiting-list-item');
                    const name = item?.querySelector('.waiting-list-name')?.textContent || '';
                    const phone = item?.querySelector('.waiting-list-details')?.textContent || '';
                    recipients.push({
                        phone: phone.trim(),
                        name: name.trim(),
                        requestId: cb.value
                    });
                });
            } else {
                // Get specific recipient inputs
                const phoneInputs = document.querySelectorAll('.recipient-phone');
                phoneInputs.forEach((input, index) => {
                    if (input.value.trim()) {
                        recipients.push({
                            phone: input.value.trim(),
                            name: '' // Name not collected in specific mode
                        });
                    }
                });
            }

            // Get email/password for cash/bank payments
            let email = '';
            let password = '';
            if (paymentMethod === 'cash' || paymentMethod === 'bank') {
                email = document.getElementById('senderEmail')?.value || '';
                password = document.getElementById('senderPassword')?.value || '';
            }

            return {
                amount: selectedAmount,
                currency: currency,
                quantity: quantity,
                senderName: senderName,
                senderPhone: senderPhone,
                hideIdentity: hideIdentity,
                message: message,
                coverFees: coverFees,
                paymentMethod: paymentMethod,
                recipientType: recipientType,
                recipients: recipients,
                email: email,
                password: password,
                // Add calculated fields
                exchangeRate: window.exchangeRate || 2800,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('[PaymentPreview] Error collecting form data:', error);
            return null;
        }
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

        // Validate each recipient has a phone number
        for (let i = 0; i < data.recipients.length; i++) {
            const r = data.recipients[i];
            if (!r.phone || r.phone.length < 10) {
                return { valid: false, message: `Numéro de téléphone invalide pour le destinataire ${i + 1}` };
            }
        }

        // Check quantity matches recipients for specific type
        if (data.recipientType === 'specific' && data.recipients.length !== data.quantity) {
            // Auto-adjust quantity or show warning
            console.warn('[PaymentPreview] Quantity mismatch:', data.quantity, 'vs', data.recipients.length);
        }

        return { valid: true };
    }

    function showNotification(message, type) {
        // Try to use Nimwema's notification system
        if (window.Nimwema && typeof window.Nimwema.showNotification === 'function') {
            window.Nimwema.showNotification(message, type);
        } else {
            // Fallback to alert
            alert(message);
        }
    }

})();
