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
    <h3 style="margin-bottom: var(--space-md); color: var(--primary-green);">
      💵 Instructions pour paiement Cash / Western Union
    </h3>
    
    <div style="background: var(--paper); padding: var(--space-lg); border-radius: var(--radius-input); margin-bottom: var(--space-md);">
      <h4 style="margin-bottom: var(--space-sm);">Option 1: Paiement en espèces</h4>
      <ol style="margin-left: var(--space-lg); line-height: 1.8;">
        <li>Rendez-vous à l'un de nos points de collecte</li>
        <li>Présentez votre numéro de commande: <strong>${order.id}</strong></li>
        <li>Effectuez le paiement de <strong>${totalText}</strong></li>
        <li>Conservez votre reçu</li>
      </ol>
    </div>
    
    <div style="background: var(--paper); padding: var(--space-lg); border-radius: var(--radius-input); margin-bottom: var(--space-md);">
      <h4 style="margin-bottom: var(--space-sm);">Option 2: Western Union</h4>
      <ol style="margin-left: var(--space-lg); line-height: 1.8;">
        <li>Envoyez <strong>${totalText}</strong> via Western Union à:</li>
        <li style="margin-left: var(--space-lg);">
          <strong>Nom:</strong> NIMWEMA SERVICES<br>
          <strong>Ville:</strong> Kinshasa, RDC
        </li>
        <li>Notez le MTCN (numéro de contrôle)</li>
        <li>Envoyez-nous le MTCN par WhatsApp: <strong>+243 XXX XXX XXX</strong></li>
        <li>Incluez votre numéro de commande: <strong>${order.id}</strong></li>
      </ol>
    </div>
    
    <div style="background: var(--info); color: var(--white); padding: var(--space-md); border-radius: var(--radius-input);">
      <p style="margin: 0; font-size: 14px;">
        <strong>📍 Points de collecte:</strong><br>
        • Kinshasa Centre: Avenue Kasa-Vubu, Immeuble XYZ<br>
        • Gombe: Boulevard du 30 Juin, près de la Poste<br>
        • Limete: Marché Central, Stand 45<br>
        <br>
        <strong>⏰ Horaires:</strong> Lundi - Samedi, 8h00 - 18h00
      </p>
    </div>
  `;
}

function getBankInstructions(order) {
  const currencySymbol = order.currency === 'USD' ? '$' : 'FC';
  const totalText = `${order.total} ${currencySymbol}`;
  
  return `
    <h3 style="margin-bottom: var(--space-md); color: var(--primary-green);">
      🏦 Instructions pour virement bancaire
    </h3>
    
    <div style="background: var(--paper); padding: var(--space-lg); border-radius: var(--radius-input); margin-bottom: var(--space-md);">
      <h4 style="margin-bottom: var(--space-md);">Coordonnées bancaires:</h4>
      
      <div style="display: grid; gap: var(--space-sm);">
        <div style="display: flex; justify-content: space-between; padding: var(--space-sm) 0; border-bottom: 1px solid var(--grey-200);">
          <span style="color: var(--grey-700);">Bénéficiaire:</span>
          <strong>NIMWEMA SARL</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: var(--space-sm) 0; border-bottom: 1px solid var(--grey-200);">
          <span style="color: var(--grey-700);">Banque:</span>
          <strong>Rawbank</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: var(--space-sm) 0; border-bottom: 1px solid var(--grey-200);">
          <span style="color: var(--grey-700);">Numéro de compte:</span>
          <strong>CD00 0000 0000 0000 0000 0000</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: var(--space-sm) 0; border-bottom: 1px solid var(--grey-200);">
          <span style="color: var(--grey-700);">Code SWIFT:</span>
          <strong>RAWBCDKI</strong>
        </div>
        <div style="display: flex; justify-content: space-between; padding: var(--space-sm) 0;">
          <span style="color: var(--grey-700);">Montant:</span>
          <strong style="color: var(--primary-green); font-size: 18px;">${totalText}</strong>
        </div>
      </div>
    </div>
    
    <div style="background: var(--paper); padding: var(--space-lg); border-radius: var(--radius-input); margin-bottom: var(--space-md);">
      <h4 style="margin-bottom: var(--space-sm);">Instructions:</h4>
      <ol style="margin-left: var(--space-lg); line-height: 1.8;">
        <li>Effectuez le virement bancaire du montant indiqué</li>
        <li>Dans la référence/communication, indiquez: <strong>${order.id}</strong></li>
        <li>Prenez une photo ou capture d'écran de la preuve de virement</li>
        <li>Envoyez la preuve par email à: <strong>paiements@nimwema.cd</strong></li>
        <li>Ou par WhatsApp: <strong>+243 XXX XXX XXX</strong></li>
      </ol>
    </div>
    
    <div style="background: var(--warning); color: var(--ink-black); padding: var(--space-md); border-radius: var(--radius-input);">
      <p style="margin: 0; font-size: 14px;">
        <strong>⚠️ Important:</strong> N'oubliez pas d'inclure votre numéro de commande (<strong>${order.id}</strong>) dans la référence du virement ou dans votre message. Cela nous permettra de traiter votre commande plus rapidement.
      </p>
    </div>
  `;
}

function getPaymentMethodName(method) {
  const methods = {
    'cash': 'Cash / Western Union',
    'bank': 'Virement Bancaire',
    'flexpay': 'FlexPay',
    'flutterwave': 'Flutterwave'
  };
  return methods[method] || method;
}