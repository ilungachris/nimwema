// Nimwema Platform - Payment Instructions Page

document.addEventListener('DOMContentLoaded', function() {
  loadOrderDetails();
});

function loadOrderDetails() {
  // Get order data from session storage
  const orderDataStr = sessionStorage.getItem('pendingOrder');
  
  if (!orderDataStr) {
    // No order data found, redirect to home
    window.location.href = '/';
    return;
  }
  
  const order = JSON.parse(orderDataStr);
  
  // Populate order details
  populateOrderDetails(order);
  
  // Populate payment instructions based on method
  populatePaymentInstructions(order);
}

function populateOrderDetails(order) {
  const detailsContainer = document.getElementById('orderDetails');
  
  const currencySymbol = order.currency === 'USD' ? '$' : 'FC';
  const amountText = `${order.amount} ${currencySymbol}`;
  const totalText = `${order.total} ${currencySymbol}`;
  
  const details = [
    {
      label: 'Numéro de commande',
      value: order.id
    },
    {
      label: 'Montant par bon',
      value: amountText
    },
    {
      label: 'Quantité',
      value: order.quantity
    },
    {
      label: 'Nombre de destinataires',
      value: order.recipients.length
    },
    {
      label: 'Sous-total',
      value: `${order.subtotal} ${currencySymbol}`
    },
    {
      label: 'Frais de service (3.5%)',
      value: `${order.feeAmount.toFixed(2)} ${currencySymbol}`
    },
    {
      label: 'Total à payer',
      value: totalText
    },
    {
      label: 'Méthode de paiement',
      value: getPaymentMethodName(order.paymentMethod)
    }
  ];
  
  detailsContainer.innerHTML = details.map(detail => `
    <div class="confirmation-detail">
      <span class="confirmation-detail-label">${detail.label}</span>
      <span class="confirmation-detail-value">${detail.value}</span>
    </div>
  `).join('');
}

function populatePaymentInstructions(order) {
  const instructionsContainer = document.getElementById('paymentInstructions');
  
  let instructions = '';
  
  if (order.paymentMethod === 'cash') {
    instructions = getCashInstructions(order);
  } else if (order.paymentMethod === 'bank') {
    instructions = getBankInstructions(order);
  }
  
  instructionsContainer.innerHTML = instructions;
}

function getCashInstructions(order) {
  const currencySymbol = order.currency === 'USD' ? '$' : 'FC';
  const totalText = `${order.total} ${currencySymbol}`;
  
  return `
    <h2 style="margin-bottom: var(--space-lg); color: var(--primary-green); text-align: center;">
      💵 Western Union et Espèces
    </h2>
    
    <div style="background: #E8F5E9; padding: var(--space-lg); border-radius: var(--radius-input); margin-bottom: var(--space-md); border-left: 4px solid var(--primary-green);">
      <h4 style="margin-bottom: var(--space-md); color: var(--primary-green);">Paiement à effectuer à:</h4>
      <div style="font-size: 16px; line-height: 1.8;">
        <p style="margin-bottom: var(--space-sm);"><strong>👤 Mr Paulin Ikoko</strong></p>
        <p style="margin-bottom: var(--space-sm);">📱 <strong>+243 821 075 415</strong></p>
        <p style="margin-bottom: var(--space-sm);">📍 <strong>7 Chemin de bon accueil, Q/Socimat</strong></p>
        <p><strong>Kinshasa Gombe</strong></p>
      </div>
    </div>
    
    <div style="background: var(--paper); padding: var(--space-lg); border-radius: var(--radius-input); margin-bottom: var(--space-md);">
      <h4 style="margin-bottom: var(--space-sm);">Instructions:</h4>
      <ol style="margin-left: var(--space-lg); line-height: 1.8;">
        <li>Effectuez le paiement de <strong>${totalText}</strong></li>
        <li>Mentionnez votre numéro de commande: <strong>${order.id}</strong></li>
        <li>Conservez votre reçu ou MTCN (Western Union)</li>
        <li>Les bons seront envoyés après validation du paiement</li>
      </ol>
    </div>
    
    <div style="background: var(--warning); color: var(--ink-black); padding: var(--space-md); border-radius: var(--radius-input);">
      <p style="margin: 0; font-size: 14px;">
        <strong>⚠️ Important:</strong> Vos bons d'achat seront générés et envoyés aux destinataires une fois que nous aurons confirmé la réception de votre paiement.
      </p>
    </div>
  `;
}

function getBankInstructions(order) {
  const currencySymbol = order.currency === 'USD' ? '$' : 'FC';
  const totalText = `${order.total} ${currencySymbol}`;
  
  return `
    <h2 style="margin-bottom: var(--space-lg); color: #1976D2; text-align: center;">
      🏦 Virement Bancaire
    </h2>
    
    <div style="background: #E3F2FD; padding: var(--space-lg); border-radius: var(--radius-input); margin-bottom: var(--space-md); border-left: 4px solid #1976D2;">
      <h4 style="margin-bottom: var(--space-md); color: #1565C0;">EquityBCDC</h4>
      <div style="font-size: 16px; line-height: 1.8;">
        <p style="margin-bottom: var(--space-sm);"><strong>Intitulé du compte:</strong> CPOSSIBLE</p>
        <p><strong>Numéro de compte:</strong> 024 200 000 007 245</p>
      </div>
    </div>
    
    <div style="background: var(--paper); padding: var(--space-lg); border-radius: var(--radius-input); margin-bottom: var(--space-md);">
      <h4 style="margin-bottom: var(--space-sm);">Instructions:</h4>
      <ol style="margin-left: var(--space-lg); line-height: 1.8;">
        <li>Effectuez le virement bancaire de <strong>${totalText}</strong></li>
        <li>Dans la référence, indiquez: <strong>${order.id}</strong></li>
        <li>Prenez une photo de la preuve de virement</li>
        <li>Envoyez la preuve à: <strong>paiements@nimwema.cd</strong></li>
        <li>Les bons seront envoyés après validation</li>
      </ol>
    </div>
    
    <div style="background: var(--warning); color: var(--ink-black); padding: var(--space-md); border-radius: var(--radius-input);">
      <p style="margin: 0; font-size: 14px;">
        <strong>⚠️ Important:</strong> N'oubliez pas d'inclure votre numéro de commande (<strong>${order.id}</strong>) dans la référence du virement.
      </p>
    </div>
  `;
}

function getPaymentMethodName(method) {
  const methods = {
    'cash': 'Cash / Western Union',
    'bank': 'Virement Bancaire',
    'flexpay': 'FlexPay Mobile Money',
    'flexpaycard': 'FlexPay Carte Bancaire'
  };
  return methods[method] || method;
}
