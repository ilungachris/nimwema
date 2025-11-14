// Nimwema Platform - Payment Instructions Page (Production)
// Version: 2.0 - Clean, professional implementation

document.addEventListener('DOMContentLoaded', function() {
  loadOrderDetails();
  checkAuthentication();
});

/**
 * Load order details from session storage
 */
function loadOrderDetails() {
  const orderDataStr = sessionStorage.getItem('pendingOrder');
  
  if (!orderDataStr) {
    console.error('No order data found');
    showError('Données de commande non trouvées');
    setTimeout(() => {
      window.location.href = '/';
    }, 3000);
    return;
  }
  
  try {
    const order = JSON.parse(orderDataStr);
    populateOrderDetails(order);
    populatePaymentInstructions(order);
  } catch (error) {
    console.error('Error parsing order data:', error);
    showError('Erreur lors du chargement des données');
  }
}

/**
 * Check if user is authenticated
 */
function checkAuthentication() {
  const user = localStorage.getItem('nimwema_user');
  const accountPromotion = document.getElementById('accountPromotion');
  
  if (user) {
    // User is logged in, hide account promotion
    if (accountPromotion) {
      accountPromotion.style.display = 'none';
    }
  }
}

/**
 * Populate order details section
 */
function populateOrderDetails(order) {
  const detailsContainer = document.getElementById('orderDetails');
  
  if (!detailsContainer) return;
  
  const currencySymbol = order.currency === 'USD' ? '$' : 'FC';
  
  const details = [
    {
      label: 'Numéro de commande',
      value: order.id || order.orderId || 'N/A'
    },
    {
      label: 'Montant par bon',
      value: `${formatNumber(order.amount)} ${currencySymbol}`
    },
    {
      label: 'Quantité',
      value: order.quantity || 1
    },
    {
      label: 'Nombre de destinataires',
      value: order.recipients?.length || 0
    },
    {
      label: 'Sous-total',
      value: `${formatNumber(order.subtotal || (order.amount * order.quantity))} ${currencySymbol}`
    },
    {
      label: 'Frais de service (3.5%)',
      value: `${formatNumber(order.feeAmount || 0)} ${currencySymbol}`
    },
    {
      label: 'Total à payer',
      value: `${formatNumber(order.total || order.totalAmount)} ${currencySymbol}`,
      highlight: true
    },
    {
      label: 'Méthode de paiement',
      value: getPaymentMethodName(order.paymentMethod)
    }
  ];
  
  detailsContainer.innerHTML = details.map(detail => `
    <div class="confirmation-detail ${detail.highlight ? 'highlight' : ''}">
      <span class="confirmation-detail-label">${detail.label}</span>
      <span class="confirmation-detail-value" ${detail.highlight ? 'style="color: var(--primary-green); font-size: 18px;"' : ''}>
        ${detail.value}
      </span>
    </div>
  `).join('');
}

/**
 * Populate payment instructions based on payment method
 */
function populatePaymentInstructions(order) {
  const instructionsContainer = document.getElementById('paymentInstructions');
  
  if (!instructionsContainer) return;
  
  let instructions = '';
  
  switch (order.paymentMethod) {
    case 'cash':
      instructions = getCashInstructions(order);
      break;
    case 'bank':
      instructions = getBankInstructions(order);
      break;
    default:
      instructions = '<p>Instructions de paiement non disponibles.</p>';
  }
  
  instructionsContainer.innerHTML = instructions;
}

/**
 * Get cash/Western Union payment instructions
 */
function getCashInstructions(order) {
  const currencySymbol = order.currency === 'USD' ? '$' : 'FC';
  const totalText = `${formatNumber(order.total || order.totalAmount)} ${currencySymbol}`;
  const orderId = order.id || order.orderId;
  
  return `
    <h2 style="margin-bottom: var(--space-lg); color: var(--primary-green); text-align: center;">
      💵 Western Union et Espèces
    </h2>
    
    <div style="background: #E8F5E9; padding: var(--space-lg); border-radius: var(--radius-input); margin-bottom: var(--space-md); border-left: 4px solid var(--primary-green);">
      <h4 style="margin-bottom: var(--space-md); color: var(--primary-green);">Paiement à effectuer à :</h4>
      <div style="font-size: 16px; line-height: 1.8;">
        <p style="margin-bottom: var(--space-sm);"><strong>👤 Mr Paulin Ikoko</strong></p>
        <p style="margin-bottom: var(--space-sm);">📱 <strong>+243 821 075 415</strong></p>
        <p style="margin-bottom: var(--space-sm);">📍 <strong>7 Chemin de bon accueil, Q/Socimat</strong></p>
        <p><strong>Kinshasa Gombe</strong></p>
      </div>
    </div>
    
    <div style="background: var(--paper); padding: var(--space-lg); border-radius: var(--radius-input); margin-bottom: var(--space-md);">
      <h4 style="margin-bottom: var(--space-sm);">Instructions :</h4>
      <ol style="margin-left: var(--space-lg); line-height: 1.8;">
        <li>Effectuez le paiement de <strong>${totalText}</strong></li>
        <li>Mentionnez votre numéro de commande : <strong>${orderId}</strong></li>
        <li>Conservez votre reçu ou MTCN (Western Union)</li>
        <li>Les bons seront envoyés après validation du paiement</li>
      </ol>
    </div>
    
    <div style="background: #FFF3CD; padding: var(--space-md); border-radius: var(--radius-input); border-left: 4px solid var(--warning);">
      <p style="margin: 0; font-size: 14px; color: var(--ink-black);">
        <strong>📝 Note :</strong> La validation du paiement peut prendre jusqu'à 24 heures. Vous recevrez un SMS de confirmation.
      </p>
    </div>
  `;
}

/**
 * Get bank transfer payment instructions
 */
function getBankInstructions(order) {
  const currencySymbol = order.currency === 'USD' ? '$' : 'FC';
  const totalText = `${formatNumber(order.total || order.totalAmount)} ${currencySymbol}`;
  const orderId = order.id || order.orderId;
  
  return `
    <h2 style="margin-bottom: var(--space-lg); color: #1976D2; text-align: center;">
      🏦 Virement Bancaire
    </h2>
    
    <div style="background: #E3F2FD; padding: var(--space-lg); border-radius: var(--radius-input); margin-bottom: var(--space-md); border-left: 4px solid #1976D2;">
      <h4 style="margin-bottom: var(--space-md); color: #1565C0;">EquityBCDC</h4>
      <div style="font-size: 16px; line-height: 1.8;">
        <p style="margin-bottom: var(--space-sm);"><strong>Intitulé du compte :</strong> CPOSSIBLE</p>
        <p><strong>Numéro de compte :</strong> 024 200 000 007 245</p>
      </div>
    </div>
    
    <div style="background: var(--paper); padding: var(--space-lg); border-radius: var(--radius-input); margin-bottom: var(--space-md);">
      <h4 style="margin-bottom: var(--space-sm);">Instructions :</h4>
      <ol style="margin-left: var(--space-lg); line-height: 1.8;">
        <li>Effectuez le virement bancaire de <strong>${totalText}</strong></li>
        <li>Dans la référence, indiquez : <strong>${orderId}</strong></li>
        <li>Prenez une photo de la preuve de virement</li>
        <li>Envoyez la preuve à : <strong>paiements@nimwema.cd</strong></li>
        <li>Les bons seront envoyés après validation</li>
      </ol>
    </div>
    
    <div style="background: #FFF3CD; padding: var(--space-md); border-radius: var(--radius-input); border-left: 4px solid var(--warning);">
      <p style="margin: 0; font-size: 14px; color: var(--ink-black);">
        <strong>⚠️ Important :</strong> N'oubliez pas d'inclure votre numéro de commande (<strong>${orderId}</strong>) dans la référence du virement.
      </p>
    </div>
  `;
}

/**
 * Get payment method display name
 */
function getPaymentMethodName(method) {
  const methods = {
    'cash': 'Cash / Western Union',
    'bank': 'Virement Bancaire',
    'flexpay': 'FlexPay Mobile Money',
    'flexpaycard': 'FlexPay Carte Bancaire'
  };
  return methods[method] || method;
}

/**
 * Format number with thousands separator
 */
function formatNumber(num) {
  if (!num) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Show error message
 */
function showError(message) {
  const detailsContainer = document.getElementById('orderDetails');
  const instructionsContainer = document.getElementById('paymentInstructions');
  
  if (detailsContainer) {
    detailsContainer.innerHTML = `
      <div style="text-align: center; padding: var(--space-xl); color: var(--error);">
        <p>❌ ${message}</p>
      </div>
    `;
  }
  
  if (instructionsContainer) {
    instructionsContainer.innerHTML = '';
  }
}
