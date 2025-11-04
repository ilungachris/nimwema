// Nimwema Platform - Request Confirmation Page

document.addEventListener('DOMContentLoaded', function() {
  loadRequestDetails();
});

function loadRequestDetails() {
  // Get request data from session storage
  const requestDataStr = sessionStorage.getItem('requestData');
  
  if (!requestDataStr) {
    // No request data found, redirect to request page
    window.location.href = '/request.html';
    return;
  }
  
  const requestData = JSON.parse(requestDataStr);
  
  // Populate request details
  const detailsContainer = document.getElementById('requestDetails');
  
  const details = [
    {
      label: 'Nom complet',
      value: `${requestData.firstName} ${requestData.lastName}`
    },
    {
      label: 'Numéro de téléphone',
      value: requestData.phone
    },
    {
      label: 'Type de demande',
      value: requestData.requestType === 'waiting_list' ? 'Liste d\'attente (48h)' : 'Expéditeur connu'
    }
  ];
  
  // Add sender info if known sender
  if (requestData.requestType === 'known_sender' && requestData.senderName) {
    details.push({
      label: 'Expéditeur',
      value: requestData.senderName
    });
    details.push({
      label: 'Numéro de l\'expéditeur',
      value: requestData.senderPhone
    });
  }
  
  // Add message if provided
  if (requestData.message) {
    details.push({
      label: 'Message',
      value: requestData.message
    });
  }
  
  // Add request ID
  details.push({
    label: 'Numéro de demande',
    value: `#${requestData.requestId}`
  });
  
  // Generate HTML
  detailsContainer.innerHTML = details.map(detail => `
    <div class="confirmation-detail">
      <span class="confirmation-detail-label">${detail.label}</span>
      <span class="confirmation-detail-value">${detail.value}</span>
    </div>
  `).join('');
  
  // Update next step text based on request type
  if (requestData.requestType === 'waiting_list') {
    const nextStep1 = document.getElementById('nextStep1');
    if (nextStep1) {
      nextStep1.textContent = 'Votre demande a été ajoutée à la liste d\'attente pour 48 heures';
    }
  }
  
  // Clear session storage after displaying
  // sessionStorage.removeItem('requestData');
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: 'CDF',
    minimumFractionDigits: 0
  }).format(amount);
}