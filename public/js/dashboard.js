// Nimwema Platform - Dashboard JavaScript (Production)
// Integrates with server.js APIs: auth, orders, requests, senders, vouchers

// Config (Prod-only)
const CONFIG = {
    API_BASE: '/api',
    REFRESH_INTERVAL: 30000,
    STORAGE_KEYS: { USER: 'nimwema_user', TOKEN: 'nimwema_token' }
};

// State
let currentUser = null;
let allRequests = [];
let filteredRequests = [];
let allSenders = [];
let allTransactions = [];
let filteredTransactions = [];
let deleteTarget = null;
let refreshInterval = null;
let authChecked = false;

// FIXED: All functions defined FIRST (hoisting fix for calls in loadUserData/startRefresh)
async function loadPendingOrders() {
  const container = document.getElementById('pendingOrdersList');
  if (!container) return;
  
  showLoading(container);
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/orders/my-pending`, { credentials: 'include' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'No data');
    
    const orders = data.orders || [];
    console.log('📋 Pending orders loaded:', orders.length);
    
    if (orders.length === 0) {
      container.innerHTML = getEmptyState('Aucune commande en attente', 'Envoyez un bon d\'achat pour commencer.', '/send.html');
      return;
    }
    
    container.innerHTML = orders.map(order => createPendingOrderCard(order)).join('');
  } catch (error) {
    console.error('Error loading pending orders:', error);
    container.innerHTML = getErrorState('Erreur lors du chargement des commandes', 'Réessayer');
  }
}

function createPendingOrderCard(order) {
  return `
    <div class="order-card">
      <div class="order-header">
        <div>
          <h3>Commande #${escapeHTML(order.id)}</h3>
          <p class="text-small">${formatDate(order.createdAt)}</p>
        </div>
        <span class="status-badge status-pending">En attente</span>
      </div>
      <div class="order-details">
        <div class="detail-row">
          <span>Montant:</span>
          <strong>${formatCurrency(order.amount, order.currency)} × ${order.quantity} = ${formatCurrency(order.total_amount, order.currency)}</strong>
        </div>
        <div class="detail-row">
          <span>Méthode:</span>
          <strong>${getPaymentMethodLabel(order.payment_method)}</strong>
        </div>
        <div class="detail-row">
          <span>Destinataires:</span>
          <strong>${order.quantity}</strong>
        </div>
      </div>
      <div class="order-actions">
        <button class="btn btn-secondary btn-sm" onclick="viewOrderInstructions('${escapeHTML(order.id)}')" data-i18n="view_instructions">
          📄 Voir instructions
        </button>
        <button class="btn btn-danger btn-sm" onclick="confirmCancelOrder('${escapeHTML(order.id)}')" data-i18n="cancel">
          ❌ Annuler
        </button>
      </div>
    </div>
  `;
}

async function confirmCancelOrder(orderId) {
  if (!confirm('Êtes-vous sûr de vouloir annuler cette commande ?')) return;
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/orders/${orderId}/cancel`, {
      method: 'POST',
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.success) {
      showNotification('Commande annulée avec succès', 'success');
      loadPendingOrders();
    } else {
      throw new Error(data.message || 'Annulation échouée');
    }
  } catch (error) {
    console.error('Cancel order error:', error);
    showNotification('Erreur lors de l\'annulation', 'error');
  }
}

function viewOrderInstructions(orderId) {
  window.location.href = `/payment-instructions.html?order=${encodeURIComponent(orderId)}`;
}

async function loadTransactions() {
  const container = document.getElementById('transactionsList');
  if (!container) return;
  
  showLoading(container);
  
  try {
    // Fetch sent vouchers
    const sentResponse = await fetch(`${CONFIG.API_BASE}/vouchers?phone=${encodeURIComponent(currentUser.phone || currentUser.email)}&type=sent`, { credentials: 'include' });
    const sentData = await sentResponse.json();
    
    // Fetch received vouchers
    const receivedResponse = await fetch(`${CONFIG.API_BASE}/vouchers?phone=${encodeURIComponent(currentUser.phone || currentUser.email)}&type=received`, { credentials: 'include' });
    const receivedData = await receivedResponse.json();
    
    // Fetch pending orders (transactions in progress)
    const ordersResponse = await fetch(`${CONFIG.API_BASE}/orders/my-pending`, { credentials: 'include' });
    const ordersData = await ordersResponse.json();
    
    allTransactions = [
      ...sentData.map(v => ({ ...v, type: 'sent', isOrder: false })),
      ...receivedData.map(v => ({ ...v, type: 'received', isOrder: false })),
      ...ordersData.orders.map(o => ({ ...o, type: 'order', isOrder: true }))
    ];
    filteredTransactions = [...allTransactions];
    
    console.log('📊 Transactions loaded:', allTransactions.length);
    sortTransactions(); // Initial sort
    renderTransactions();
  } catch (error) {
    console.error('Error loading transactions:', error);
    container.innerHTML = getErrorState('Erreur lors du chargement des transactions', 'Réessayer');
  }
}

function renderTransactions() {
  const container = document.getElementById('transactionsList');
  
  if (filteredTransactions.length === 0) {
    container.innerHTML = getEmptyState('Aucune transaction', 'Vos bons et commandes apparaîtront ici.', '/send.html');
    return;
  }
  
  container.innerHTML = filteredTransactions.map(tx => createTransactionCard(tx)).join('');
}

function createTransactionCard(tx) {
  const isVoucher = !tx.isOrder;
  const statusClass = getStatusClass(tx.status || 'pending');
  const statusText = getTransactionStatusText(tx.status || 'pending', tx.type);
  
  return `
    <div class="transaction-card ${tx.type}">
      <div class="transaction-header">
        <div>
          <h3>${isVoucher ? `Bon #${tx.code}` : `Commande #${tx.id}`}</h3>
          <p class="text-small">${formatDate(tx.created_at || tx.createdAt)}</p>
        </div>
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
      <div class="transaction-details">
        <div class="detail-row">
          <span>${tx.type === 'sent' ? 'Envoyé à' : tx.type === 'received' ? 'Reçu de' : 'Montant'}:</span>
          <strong>${formatCurrency(tx.amount, tx.currency)}${isVoucher ? ` (${tx.type})` : ` × ${tx.quantity}`}</strong>
        </div>
        ${tx.recipient_name ? `
          <div class="detail-row">
            <span>Destinataire:</span>
            <strong>${tx.recipient_name}</strong>
          </div>
        ` : ''}
        ${tx.sender_name ? `
          <div class="detail-row">
            <span>Expéditeur:</span>
            <strong>${tx.sender_name}</strong>
          </div>
        ` : ''}
        ${tx.message ? `
          <div class="detail-row">
            <span>Message:</span>
            <strong>${tx.message}</strong>
          </div>
        ` : ''}
        ${tx.payment_method ? `
          <div class="detail-row">
            <span>Méthode:</span>
            <strong>${getPaymentMethodLabel(tx.payment_method)}</strong>
          </div>
        ` : ''}
      </div>
      <div class="transaction-actions">
        ${tx.status === 'pending' && tx.isOrder ? `
          <button class="btn btn-secondary btn-sm" onclick="viewOrderInstructions('${tx.id}')" data-i18n="view_instructions">
            📄 Voir instructions
          </button>
        ` : ''}
        ${tx.status === 'active' && isVoucher ? `
          <button class="btn btn-primary btn-sm" onclick="redeemVoucher('${tx.code}')" data-i18n="redeem">
            💳 Utiliser le bon
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

function filterTransactions() {
  const typeFilter = document.getElementById('transactionTypeFilter').value;
  const statusFilter = document.getElementById('transactionStatusFilter').value;
  
  filteredTransactions = allTransactions.filter(tx => {
    const typeMatch = typeFilter === 'all' || tx.type === typeFilter;
    const statusMatch = statusFilter === 'all' || tx.status === statusFilter;
    return typeMatch && statusMatch;
  });
  
  sortTransactions();
  renderTransactions();
}

function sortTransactions() {
  const sortBy = document.getElementById('transactionSortBy').value;
  
  filteredTransactions.sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt);
    const dateB = new Date(b.created_at || b.createdAt);
    const amountA = parseFloat(a.amount || 0);
    const amountB = parseFloat(b.amount || 0);
    
    switch (sortBy) {
      case 'date_desc': return dateB - dateA;
      case 'date_asc': return dateA - dateB;
      case 'amount_desc': return amountB - amountA;
      default: return 0;
    }
  });
  
  renderTransactions();
}

async function exportTransactions() {
  try {
    const response = await fetch(`${CONFIG.API_BASE}/transactions/export?phone=${encodeURIComponent(currentUser.phone || currentUser.email)}`, {
      credentials: 'include'
    });
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nimwema-transactions-${formatDate(new Date())}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showNotification('Transactions exportées', 'success');
    } else {
      throw new Error('Export failed');
    }
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Erreur lors de l\'export', 'error');
  }
}

function redeemVoucher(code) {
  window.location.href = `/redeem.html?code=${encodeURIComponent(code)}`;
}

async function loadRequests() {
  const container = document.getElementById('requestsList');
  if (!container) return;
  
  showLoading(container);
  
  // FIXED: Null-check + fallback to id (if API supports ?userId=)
  if (!currentUser) {
    console.error('loadRequests: No currentUser');
    container.innerHTML = getErrorState('Erreur utilisateur', 'Recharger la page');
    return;
  }
  
  const userIdentifier = currentUser.phone || currentUser.email || currentUser.id; // Fallback to id
  console.log('loadRequests: Using identifier', userIdentifier); // Temp
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/requests?${currentUser.phone || currentUser.email ? `phone=${encodeURIComponent(currentUser.phone || currentUser.email)}` : `userId=${currentUser.id}`}`, { credentials: 'include' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const requests = await response.json();
    allRequests = requests;
    filteredRequests = [...requests];
    
    console.log('📋 Requests loaded:', allRequests.length);
    sortRequests();
    renderRequests();
  } catch (error) {
    console.error('Error loading requests:', error);
    container.innerHTML = getErrorState('Erreur lors du chargement des demandes', 'Réessayer');
  }
}

function renderRequests() {
  const container = document.getElementById('requestsList');
  
  if (filteredRequests.length === 0) {
    container.innerHTML = getEmptyState('Aucune demande', 'Faites votre première demande de bon d\'achat.', '/request.html');
    return;
  }
  
  container.innerHTML = filteredRequests.map(request => createRequestCard(request)).join('');
}

function createRequestCard(request) {
  return `
    <div class="request-card" onclick="viewRequest(${request.id})">
      <div class="request-card-header">
        <div class="request-card-title">
          <span class="request-id">#${escapeHTML(request.id)}</span>
          <span class="badge-status badge-${request.status}">${getStatusText(request.status)}</span>
          <span class="badge-status badge-${request.requestType.replace('_', '-')}">${getTypeText(request.requestType)}</span>
        </div>
        <div class="request-card-actions" onclick="event.stopPropagation()">
          <button class="btn-icon btn-view" onclick="viewRequest(${request.id})" title="Voir les détails">👁️</button>
          <button class="btn-icon btn-delete" onclick="deleteRequest(${request.id}, '${request.requestType}')" 
                  ${request.requestType === 'known_sender' ? 'disabled title="Impossible de supprimer"' : 'title="Supprimer"'} >🗑️</button>
        </div>
      </div>
      
      <div class="request-card-body">
        <div class="request-detail">
          <span class="request-detail-label">Demandeur</span>
          <span class="request-detail-value">${escapeHTML(request.fullName)}</span>
        </div>
        <div class="request-detail">
          <span class="request-detail-label">Téléphone</span>
          <span class="request-detail-value">${escapeHTML(request.phone)}</span>
        </div>
        ${request.senderName ? `
          <div class="request-detail">
            <span class="request-detail-label">Expéditeur</span>
            <span class="request-detail-value">${escapeHTML(request.senderName)}</span>
          </div>
        ` : ''}
        ${request.message ? `
          <div class="request-detail">
            <span class="request-detail-label">Message</span>
            <span class="request-detail-value">${escapeHTML(request.message)}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="request-card-footer">
        <span class="request-date">Créé le ${formatDate(request.created_at)}</span>
        ${request.status === 'pending' ? `<span class="request-expires">Expire le ${formatDate(request.expires_at)}</span>` : ''}
      </div>
    </div>
  `;
}

function filterRequests() {
  const statusFilter = document.getElementById('statusFilter').value;
  const typeFilter = document.getElementById('typeFilter').value;
  
  filteredRequests = allRequests.filter(request => {
    const statusMatch = statusFilter === 'all' || request.status === statusFilter;
    const typeMatch = typeFilter === 'all' || request.requestType === typeFilter;
    return statusMatch && typeMatch;
  });
  
  sortRequests();
  renderRequests();
}

function sortRequests() {
  const sortBy = document.getElementById('sortBy').value;
  
  filteredRequests.sort((a, b) => {
    const dateA = new Date(a.created_at);
    const dateB = new Date(b.created_at);
    
    switch (sortBy) {
      case 'date_desc': return dateB - dateA;
      case 'date_asc': return dateA - dateB;
      case 'status': return a.status.localeCompare(b.status);
      default: return 0;
    }
  });
  
  renderRequests();
}

async function deleteRequest(requestId, requestType) {
  if (requestType === 'known_sender') {
    showNotification('Impossible de supprimer une demande à un expéditeur connu', 'error');
    return;
  }
  
  if (!confirm('Êtes-vous sûr de vouloir supprimer cette demande ?')) return;
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/requests/${requestId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.success) {
      showNotification('Demande supprimée', 'success');
      loadRequests();
    } else {
      throw new Error(data.message || 'Suppression échouée');
    }
  } catch (error) {
    console.error('Delete request error:', error);
    showNotification('Erreur lors de la suppression', 'error');
  }
}

function viewRequest(requestId) {
  const request = allRequests.find(r => r.id === requestId);
  if (!request) return;
  
  const modalBody = document.getElementById('requestModalBody');
  modalBody.innerHTML = `
    <div class="request-details">
      <div class="form-section">
        <h3>Informations de la demande</h3>
        <div class="confirmation-details">
          <div class="confirmation-detail">
            <span class="confirmation-detail-label">Numéro de demande</span>
            <span class="confirmation-detail-value">#${escapeHTML(request.id)}</span>
          </div>
          <div class="confirmation-detail">
            <span class="confirmation-detail-label">Statut</span>
            <span class="confirmation-detail-value">
              <span class="badge-status badge-${request.status}">${getStatusText(request.status)}</span>
            </span>
          </div>
          <div class="confirmation-detail">
            <span class="confirmation-detail-label">Type</span>
            <span class="confirmation-detail-value">
              <span class="badge-status badge-${request.requestType.replace('_', '-')}">${getTypeText(request.requestType)}</span>
            </span>
          </div>
          <div class="confirmation-detail">
            <span class="confirmation-detail-label">Nom complet</span>
            <span class="confirmation-detail-value">${escapeHTML(request.fullName)}</span>
          </div>
          <div class="confirmation-detail">
            <span class="confirmation-detail-label">Téléphone</span>
            <span class="confirmation-detail-value">${escapeHTML(request.phone)}</span>
          </div>
          ${request.senderName ? `
            <div class="confirmation-detail">
              <span class="confirmation-detail-label">Expéditeur</span>
              <span class="confirmation-detail-value">${escapeHTML(request.senderName)}</span>
            </div>
          ` : ''}
          ${request.senderPhone ? `
            <div class="confirmation-detail">
              <span class="confirmation-detail-label">Téléphone expéditeur</span>
              <span class="confirmation-detail-value">${escapeHTML(request.senderPhone)}</span>
            </div>
          ` : ''}
          ${request.message ? `
            <div class="confirmation-detail">
              <span class="confirmation-detail-label">Message</span>
              <span class="confirmation-detail-value">${escapeHTML(request.message)}</span>
            </div>
          ` : ''}
          <div class="confirmation-detail">
            <span class="confirmation-detail-label">Date de création</span>
            <span class="confirmation-detail-value">${formatDate(request.created_at)}</span>
          </div>
          <div class="confirmation-detail">
            <span class="confirmation-detail-label">Date d'expiration</span>
            <span class="confirmation-detail-value">${formatDate(request.expires_at)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
  
  openModal('requestModal');
}

async function loadSenders() {
  const container = document.getElementById('sendersList');
  if (!container) return;
  
  showLoading(container);
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/senders?userId=${currentUser.id}`, { credentials: 'include' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const senders = await response.json();
    allSenders = senders;
    
    console.log('👥 Senders loaded:', allSenders.length);
    renderSenders();
  } catch (error) {
    console.error('Error loading senders:', error);
    container.innerHTML = getErrorState('Erreur lors du chargement des expéditeurs', 'Réessayer');
  }
}

function renderSenders() {
  const container = document.getElementById('sendersList');
  
  if (allSenders.length === 0) {
    container.innerHTML = getEmptyState('Aucun expéditeur', 'Ajoutez vos expéditeurs favoris pour faciliter vos demandes.', null);
    return;
  }
  
  container.innerHTML = allSenders.map(sender => createSenderCard(sender)).join('');
}

function createSenderCard(sender) {
  return `
    <div class="sender-card">
      <div class="sender-card-header">
        <div class="sender-avatar">${getInitials(sender.name)}</div>
        <div class="sender-card-actions">
          <button class="btn-icon btn-view" onclick="editSender(${sender.id})" title="Modifier">✏️</button>
          <button class="btn-icon btn-delete" onclick="deleteSender(${sender.id})" title="Supprimer">🗑️</button>
        </div>
      </div>
      
      <div class="sender-card-body">
        <div class="sender-name">${escapeHTML(sender.name)}</div>
        <div class="sender-phone">${escapeHTML(sender.phone)}</div>
        ${sender.relation ? `<span class="sender-relation">${escapeHTML(sender.relation)}</span>` : ''}
      </div>
      
      <div class="sender-card-footer">
        <button class="btn-use-sender" onclick="useSender(${sender.id})" data-i18n="use_for_request">
          Utiliser pour une demande
        </button>
      </div>
    </div>
  `;
}

function showAddSenderModal() {
  document.getElementById('senderModalTitle').textContent = 'Ajouter un expéditeur';
  document.getElementById('senderForm').reset();
  document.getElementById('senderId').value = '';
  openModal('senderModal');
}

function editSender(senderId) {
  const sender = allSenders.find(s => s.id === senderId);
  if (!sender) return;
  
  document.getElementById('senderModalTitle').textContent = 'Modifier l\'expéditeur';
  document.getElementById('senderId').value = sender.id;
  document.getElementById('senderFormName').value = sender.name;
  document.getElementById('senderFormPhone').value = sender.phone;
  document.getElementById('senderFormRelation').value = sender.relation || '';
  
  openModal('senderModal');
}

async function saveSender(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const senderId = formData.get('senderId');
  const senderData = {
    name: formData.get('name').trim(),
    phone: formData.get('phone').trim(),
    relation: formData.get('relation').trim() || null,
    userId: currentUser.id
  };
  
  // Validate
  if (!senderData.name || !senderData.phone) {
    showNotification('Nom et téléphone requis', 'error');
    return;
  }
  
  try {
    const endpoint = senderId ? `${CONFIG.API_BASE}/senders/${senderId}` : `${CONFIG.API_BASE}/senders`;
    const method = senderId ? 'PUT' : 'POST';
    
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(senderData),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (result.success) {
      showNotification(senderId ? 'Expéditeur modifié' : 'Expéditeur ajouté', 'success');
      closeModal('senderModal');
      loadSenders();
    } else {
      throw new Error(result.message || 'Échec enregistrement');
    }
  } catch (error) {
    console.error('Save sender error:', error);
    showNotification('Erreur lors de l\'enregistrement', 'error');
  }
}

async function deleteSender(senderId) {
  if (!confirm('Êtes-vous sûr de vouloir supprimer cet expéditeur ?')) return;
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/senders/${senderId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    const data = await response.json();
    
    if (data.success) {
      showNotification('Expéditeur supprimé', 'success');
      loadSenders();
    } else {
      throw new Error(data.message || 'Suppression échouée');
    }
  } catch (error) {
    console.error('Delete sender error:', error);
    showNotification('Erreur lors de la suppression', 'error');
  }
}

function useSender(senderId) {
  const sender = allSenders.find(s => s.id === senderId);
  if (!sender) return;
  
  sessionStorage.setItem('selectedSender', JSON.stringify(sender));
  window.location.href = '/request.html';
}

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  document.body.style.overflow = 'auto';
}

async function confirmDelete() {
  if (!deleteTarget) return;
  
  try {
    let endpoint = '';
    if (deleteTarget.type === 'request') endpoint = `${CONFIG.API_BASE}/requests/${deleteTarget.id}`;
    else if (deleteTarget.type === 'sender') endpoint = `${CONFIG.API_BASE}/senders/${deleteTarget.id}`;
    
    const response = await fetch(endpoint, { method: 'DELETE', credentials: 'include' });
    const data = await response.json();
    
    if (data.success) {
      showNotification('Supprimé avec succès', 'success');
      closeModal('deleteModal');
      
      // Reload section
      if (deleteTarget.type === 'request') loadRequests();
      else if (deleteTarget.type === 'sender') loadSenders();
    } else {
      throw new Error(data.message || 'Suppression échouée');
    }
  } catch (error) {
    console.error('Confirm delete error:', error);
    showNotification('Erreur lors de la suppression', 'error');
  }
  
  deleteTarget = null;
}

function showLoading(container) {
  container.innerHTML = '<div class="loading-state"><p>Chargement...</p></div>';
}

function getEmptyState(title, message, actionUrl = null) {
  let actionBtn = '';
  if (actionUrl) actionBtn = `<button class="btn btn-primary" onclick="window.location.href='${actionUrl}'">${title === 'Aucune commande en attente' ? 'Envoyer un bon' : 'Faire une demande'}</button>`;
  
  return `
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <h3>${title}</h3>
      <p>${message}</p>
      ${actionBtn}
    </div>
  `;
}

function getErrorState(title, action = 'Réessayer') {
  return `
    <div class="error-state">
      <div class="empty-state-icon">⚠️</div>
      <h3>${title}</h3>
      <button class="btn btn-secondary" onclick="load${title.includes('demandes') ? 'Requests' : title.includes('commandes') ? 'PendingOrders' : 'Transactions'}()">
        ${action}
      </button>
    </div>
  `;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => notification.remove(), 3000);
}

function getStatusText(status) {
  const map = { pending: 'En attente', fulfilled: 'Satisfait', expired: 'Expiré' };
  return map[status] || status;
}

function getTypeText(type) {
  const map = { known_sender: 'Expéditeur connu', waiting_list: 'Liste d\'attente' };
  return map[type] || type;
}

function getTransactionStatusText(status, type) {
  const map = {
    pending: 'En attente',
    active: 'Actif',
    redeemed: 'Utilisé',
    expired: 'Expiré'
  };
  return map[status] || status;
}

function getStatusClass(status) {
  return `status-${status}`;
}

function getPaymentMethodLabel(method) {
  const map = { cash: 'Cash/WU', bank: 'Virement', flexpay: 'Mobile Money', flexpaycard: 'Carte' };
  return map[method] || method;
}

function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('fr-CD', { style: 'currency', currency }).format(amount);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('fr-FR', { 
    year: 'numeric', month: 'long', day: 'numeric', 
    hour: '2-digit', minute: '2-digit' 
  });
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function toggleMenu() {
  document.querySelector('.dashboard-sidebar').classList.toggle('mobile-open');
}

async function logout() {
  if (!confirm('Êtes-vous sûr ?')) return;
  
  try {
    await fetch(`${CONFIG.API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    sessionStorage.clear();
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    window.location.href = '/';
  }
}

// FIXED loadUserData (calls after definitions)
async function loadUserData() {
  if (!currentUser) return;
  
  Promise.allSettled([
    loadPendingOrders(),
    loadTransactions(),
    loadRequests(),
    loadSenders()
  ]).then(results => {
    console.log('Dashboard loaded');
  });
}

// FIXED startRefresh (calls after definitions)
function startRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (document.querySelector('.dashboard-section.active')) {
      const activeId = document.querySelector('.dashboard-section.active').id;
      if (activeId.includes('pending')) loadPendingOrders();
      else if (activeId.includes('transactions')) loadTransactions();
      else if (activeId.includes('requests')) loadRequests();
      else if (activeId.includes('senders')) loadSenders();
    }
  }, CONFIG.REFRESH_INTERVAL);
}

// FIXED checkAuth (no retry, token if present)
async function checkAuth() {
  if (authChecked) return true;
  authChecked = true;

  try {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    const sessionId = document.cookie.split('; ').find(row => row.startsWith('sessionId='));
    
    if (!token && !sessionId) {
      throw new Error('No auth');
    }

    let headers = { credentials: 'include' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${CONFIG.API_BASE}/auth/me`, headers);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.success || !data.user) throw new Error('Invalid user data');

    currentUser = data.user;
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
      userNameEl.textContent = currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || 'Utilisateur';
    }

    return true;
  } catch (error) {
    console.error('Auth error details:', { message: error.message, token: !!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN), session: !!document.cookie.match(/sessionId=/) });
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    window.location.href = '/login.html';
    return false;
  }
}

// FIXED showSection (null-check)
function showSection(sectionName) {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  event?.currentTarget?.classList.add('active');
  
  document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
  
  let targetSection;
  switch (sectionName) {
    case 'pending-orders':
      targetSection = document.getElementById('pendingOrdersSection');
      if (targetSection) loadPendingOrders();
      break;
    case 'transactions':
      targetSection = document.getElementById('transactionsSection');
      if (targetSection) loadTransactions();
      break;
    case 'requests':
      targetSection = document.getElementById('requestsSection');
      if (targetSection) loadRequests();
      break;
    case 'senders':
      targetSection = document.getElementById('sendersSection');
      if (targetSection) loadSenders();
      break;
    default:
      return;
  }
  
  if (targetSection) {
    targetSection.classList.add('active');
  }
}

// Export globals for onclick (AFTER definitions – fixes ReferenceError)
window.showSection = showSection;
window.loadPendingOrders = loadPendingOrders;
window.confirmCancelOrder = confirmCancelOrder;
window.viewOrderInstructions = viewOrderInstructions;
window.loadTransactions = loadTransactions;
window.filterTransactions = filterTransactions;
window.sortTransactions = sortTransactions;
window.exportTransactions = exportTransactions;
window.redeemVoucher = redeemVoucher;
window.loadRequests = loadRequests;
window.filterRequests = filterRequests;
window.sortRequests = sortRequests;
window.viewRequest = viewRequest;
window.deleteRequest = deleteRequest;
window.showAddSenderModal = showAddSenderModal;
window.editSender = editSender;
window.saveSender = saveSender;
window.deleteSender = deleteSender;
window.useSender = useSender;
window.openModal = openModal;
window.closeModal = closeModal;
window.confirmDelete = confirmDelete;
window.logout = logout;
window.toggleMenu = toggleMenu;