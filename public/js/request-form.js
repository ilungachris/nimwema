// Nimwema Platform - Request Voucher Form Handler

document.addEventListener('DOMContentLoaded', function() {
  initRequestForm();
});

function initRequestForm() {
  const form = document.getElementById('requestVoucherForm');
  if (!form) {
    console.warn('[RequestForm] no form found on this page');
    return;
  }

  console.log('[RequestForm] initRequestForm: form found, wiring submit handler');

  // Safety: if the old handler was ever attached, remove it
  if (typeof window.handleRequestVoucher === 'function') {
    form.removeEventListener('submit', window.handleRequestVoucher);
  }

  // Setup form validation
  setupFormValidation();
  setupMessageCounter();
  setupPhoneFormatting();

  // ✅ Attach our handler (bubble phase is enough now)
  form.addEventListener('submit', handleFormSubmit);
}

/////
// Toggle sender fields based on radio selection
function toggleSenderFields() {
  const knownSenderRadio = document.querySelector('input[name="requestType"][value="known_sender"]');
  const senderFields = document.getElementById('knownSenderFields');
  
  if (knownSenderRadio.checked) {
    senderFields.classList.remove('hidden');
    senderFields.classList.add('fade-in');
    
    // Make sender fields required
    document.getElementById('senderName').required = true;
    document.getElementById('senderPhone').required = true;
    document.getElementById('senderPhoneConfirm').required = true;
  } else {
    senderFields.classList.add('hidden');
    
    // Make sender fields optional
    document.getElementById('senderName').required = false;
    document.getElementById('senderPhone').required = false;
    document.getElementById('senderPhoneConfirm').required = false;
    
    // Clear sender fields
    document.getElementById('senderName').value = '';
    document.getElementById('senderPhone').value = '';
    document.getElementById('senderPhoneConfirm').value = '';
  }
}

// Setup form validation
function setupFormValidation() {
  const form = document.getElementById('requestVoucherForm');
  
  // First Name validation
  const firstName = document.getElementById('firstName');
  firstName.addEventListener('blur', function() {
    validateField(this, 'firstNameError', (value) => {
      if (!value.trim()) return 'Le prénom est requis';
      if (value.trim().length < 2) return 'Le prénom doit contenir au moins 2 caractères';
      return null;
    });
  });
  
  // Last Name validation
  const lastName = document.getElementById('lastName');
  lastName.addEventListener('blur', function() {
    validateField(this, 'lastNameError', (value) => {
      if (!value.trim()) return 'Le nom est requis';
      if (value.trim().length < 2) return 'Le nom doit contenir au moins 2 caractères';
      return null;
    });
  });
  
  // Phone validation
  const phone = document.getElementById('phone');
  phone.addEventListener('blur', function() {
    validateField(this, 'phoneError', (value) => {
      if (!value.trim()) return 'Le numéro de téléphone est requis';
      if (!validatePhoneNumber(value)) return 'Numéro de téléphone invalide (format: +243XXXXXXXXX)';
      return null;
    });
  });
  
  // Phone confirmation validation
  const phoneConfirm = document.getElementById('phoneConfirm');
  phoneConfirm.addEventListener('blur', function() {
    validateField(this, 'phoneConfirmError', (value) => {
      if (!value.trim()) return 'Veuillez confirmer votre numéro';
      if (value !== phone.value) return 'Les numéros ne correspondent pas';
      return null;
    });
  });
  
  // Sender phone validation (if visible)
  const senderPhone = document.getElementById('senderPhone');
  senderPhone.addEventListener('blur', function() {
    if (!this.required) return;
    validateField(this, 'senderPhoneError', (value) => {
      if (!value.trim()) return 'Le numéro de l\'expéditeur est requis';
      if (!validatePhoneNumber(value)) return 'Numéro de téléphone invalide';
      return null;
    });
  });
  
  // Sender phone confirmation validation
  const senderPhoneConfirm = document.getElementById('senderPhoneConfirm');
  senderPhoneConfirm.addEventListener('blur', function() {
    if (!this.required) return;
    validateField(this, 'senderPhoneConfirmError', (value) => {
      if (!value.trim()) return 'Veuillez confirmer le numéro';
      if (value !== senderPhone.value) return 'Les numéros ne correspondent pas';
      return null;
    });
  });
  
  
}

// Validate a single field
function validateField(field, errorId, validationFn) {
  const error = validationFn(field.value);
  const errorElement = document.getElementById(errorId);
  
  if (error) {
    field.classList.add('error');
    field.classList.remove('success');
    errorElement.textContent = error;
    return false;
  } else {
    field.classList.remove('error');
    field.classList.add('success');
    errorElement.textContent = '';
    return true;
  }
}

// Validate phone number
function validatePhoneNumber(phone) {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it starts with 243 and has correct length
  if (cleaned.startsWith('243')) {
    return cleaned.length >= 12 && cleaned.length <= 13;
  }
  
  // Check if it's a local number (9-10 digits)
  return cleaned.length >= 9 && cleaned.length <= 10;
}

// Format phone number
function formatPhoneNumber(phone) {
  // Remove all non-digit characters
 
  
  
  
 // Remove all non-digit characters
 
  if (!phone) return '';
  // Remove all non-digit characters
  let cleaned = String(phone).replace(/\D/g, '');
  
  
  
  
  
  
  // Add +243 if not present
  if (!cleaned.startsWith('243')) {
    cleaned = '243' + cleaned;
  }
  
  return '+' + cleaned;
}

// Setup phone formatting
function setupPhoneFormatting() {
  const phoneInputs = document.querySelectorAll('input[type="tel"]');
  
  phoneInputs.forEach(input => {
    input.addEventListener('input', function(e) {
      let value = e.target.value;
      
      // Remove all non-digit characters except +
      value = value.replace(/[^\d+]/g, '');
      
      // Ensure it starts with +
      if (value && !value.startsWith('+')) {
        value = '+' + value;
      }
      
      e.target.value = value;
    });
  });
}

// Setup message counter
function setupMessageCounter() {
  const messageField = document.getElementById('message');
  const messageCount = document.getElementById('messageCount');
  
  if (messageField && messageCount) {
    messageField.addEventListener('input', function() {
      messageCount.textContent = this.value.length;
    });
  }
}

// Clear form
function clearForm() {
  const form = document.getElementById('requestVoucherForm');
  
  if (confirm('Êtes-vous sûr de vouloir effacer le formulaire ?')) {
    form.reset();
    
    // Clear all error messages
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    
    // Remove validation classes
    document.querySelectorAll('.form-input, .form-textarea').forEach(el => {
      el.classList.remove('error', 'success');
    });
    
    // Hide sender fields
    document.getElementById('knownSenderFields').classList.add('hidden');
    
    // Reset message counter
    document.getElementById('messageCount').textContent = '0';
  }
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
    console.log('[RequestForm] submit captured');
  
  
  
  //e.stopImmediatePropagation(); // ensure main.js handler doesn't also run
  
  
  
  
  // Validate all fields
  let isValid = true;
  
  // Validate required fields
  const firstName = document.getElementById('firstName');
  const lastName = document.getElementById('lastName');
  const phone = document.getElementById('phone');
  const phoneConfirm = document.getElementById('phoneConfirm');
  
  isValid = validateField(firstName, 'firstNameError', (value) => {
    if (!value.trim()) return 'Le prénom est requis';
    if (value.trim().length < 2) return 'Le prénom doit contenir au moins 2 caractères';
    return null;
  }) && isValid;
  
  isValid = validateField(lastName, 'lastNameError', (value) => {
    if (!value.trim()) return 'Le nom est requis';
    if (value.trim().length < 2) return 'Le nom doit contenir au moins 2 caractères';
    return null;
  }) && isValid;
  
  isValid = validateField(phone, 'phoneError', (value) => {
    if (!value.trim()) return 'Le numéro de téléphone est requis';
    if (!validatePhoneNumber(value)) return 'Numéro de téléphone invalide';
    return null;
  }) && isValid;
  
  isValid = validateField(phoneConfirm, 'phoneConfirmError', (value) => {
    if (!value.trim()) return 'Veuillez confirmer votre numéro';
    if (value !== phone.value) return 'Les numéros ne correspondent pas';
    return null;
  }) && isValid;
  
  // Validate sender fields if known sender is selected
  const requestType = document.querySelector('input[name="requestType"]:checked').value;
  if (requestType === 'known_sender') {
    const senderPhone = document.getElementById('senderPhone');
    const senderPhoneConfirm = document.getElementById('senderPhoneConfirm');
    
    isValid = validateField(senderPhone, 'senderPhoneError', (value) => {
      if (!value.trim()) return 'Le numéro de l\'expéditeur est requis';
      if (!validatePhoneNumber(value)) return 'Numéro de téléphone invalide';
      return null;
    }) && isValid;
    
    isValid = validateField(senderPhoneConfirm, 'senderPhoneConfirmError', (value) => {
      if (!value.trim()) return 'Veuillez confirmer le numéro';
      if (value !== senderPhone.value) return 'Les numéros ne correspondent pas';
      return null;
    }) && isValid;
  }
  
  if (!isValid) {
    window.Nimwema.showNotification('Veuillez corriger les erreurs dans le formulaire', 'error');
    return;
  }
  
  // Prepare form data
  const formData = {
    firstName: firstName.value.trim(),
    lastName: lastName.value.trim(),
    phone: formatPhoneNumber(phone.value),
    message: document.getElementById('message').value.trim(),
    requestType: requestType
  };
  
  // Add sender info if known sender
  if (requestType === 'known_sender') {
    formData.senderName = document.getElementById('senderName').value.trim();
    formData.senderPhone = formatPhoneNumber(document.getElementById('senderPhone').value);
  }
  
  // Show loading state
  const form = e.target;
  form.classList.add('form-loading');
  
  try {
    // --- Submit to real API endpoint in production ---
    const REQUEST_URL = '/api/vouchers/request';

    console.log('[RequestForm] Submitting voucher request', {
      url: REQUEST_URL,
      payload: formData
    });

    const response = await fetch(REQUEST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      // Read raw body for debugging
      const raw = await response.text().catch(() => '');
      console.error('[RequestForm] Non-OK response', {
        status: response.status,
        rawBody: raw
      });

      const msg = response.status === 404
        ? "Endpoint introuvable: /api/vouchers/request"
        : `Erreur serveur (${response.status})`;
      throw new Error(msg);
    }

    const result = await response.json();
    console.log('[RequestForm] API result', result);

    if (result.success) {
      // Store request data for confirmation page
      sessionStorage.setItem('requestData', JSON.stringify({
        ...formData,
        requestId: result.request.id
      }));

      // Redirect to confirmation page
      window.location.href = '/request-confirmation.html';
    } else {
      throw new Error(result.message || 'Erreur lors de l\'envoi de la demande');
    }
  } catch (error) {
    console.error('Error submitting request:', error);
    window.Nimwema.showNotification(
      error.message || 'Erreur lors de l\'envoi de la demande',
      'error'
    );
    form.classList.remove('form-loading');
  }  catch (error) {
    console.error('Error submitting request:', error);
    window.Nimwema.showNotification(error.message || 'Erreur lors de l\'envoi de la demande', 'error');
    form.classList.remove('form-loading');
  }
}

// Export functions for use in HTML
window.toggleSenderFields = toggleSenderFields;
window.clearForm = clearForm;