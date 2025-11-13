// Nimwema Platform - Dashboard JavaScript

// Current user data (will be loaded from session/API)
let currentUser = null;

// State management
let allRequests = [];
let allSenders = [];
let filteredRequests = [];
let deleteTarget = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is logged in (mock check)
  checkAuth();
  
  // Load user data
  loadUserData();
  
  // Load requests and senders
  loadRequests();
  loadSenders();
  
  // Setup phone formatting in sender form
  setupPhoneFormatting();
});

// Check authentication
function checkAuth() {
  // Check actual session/token
  fetch('/api/auth/me')
    .then(response => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error('Not authenticated');
      }
    })
    .then(data => {
      currentUser = data.user;
      const userName = document.getElementById('userName');
      if (userName) {
        userName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;
      }
      loadUserData();
    })
    .catch(error => {
      console.error('Auth error:', error);
      window.location.href = '/login.html';
    });
}

// Load user data
function loadUserData() {
  // In production, fetch from API
  console.log('User loaded:', currentUser);
}

// Show section
function showSection(section) {
  // Hide all sections
  document.querySelectorAll('.dashboard-section').forEach(s => {
    s.classList.remove('active');
  });
  
  // Remove active from all nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  // Show selected section
  if (section === 'requests') {
    document.getElementById('requestsSection').classList.add('active');
    document.querySelector('[onclick*="requests"]').classList.add('active');
  } else if (section === 'senders') {
    document.getElementById('sendersSection').classList.add('active');
    document.querySelector('[onclick*="senders"]').classList.add('active');
  }
}

// ============================================
// REQUESTS MANAGEMENT
// ============================================

// Load requests
async function loadRequests() {
  try {
    // Fetch from API with user phone
    const response = await fetch(`/api/requests?phone=${encodeURIComponent(currentUser.phone)}`);
    const requests = await response.json();
    
    allRequests = requests;
    filteredRequests = requests;
    
    renderRequests();
  } catch (error) {
    console.error('Error loading requests:', error);
    showEmptyState('requestsList', 'Aucune demande', 'Vous n'avez pas encore fait de demande de bon d'achat.');
  }
}

// Render requests
function renderRequests() {
  const container = document.getElementById('requestsList');
  
  if (filteredRequests.length === 0) {
    showEmptyState('requestsList', 'Aucune demande', 'Vous n\'avez pas encore fait de demande de bon d\'achat.');
    return;
  }
  
  container.innerHTML = filteredRequests.map(request => `
    <div class="request-card" onclick="viewRequest(${request.id})">
      <div class="request-card-header">
        <div class="request-card-title">
          <span class="request-id">#${request.id}</span>
          <span class="badge-status badge-${request.status}">${getStatusText(request.status)}</span>
          <span class="badge-status badge-${request.requestType.replace('_', '-')}">${getTypeText(request.requestType)}</span>
        </div>
        <div class="request-card-actions" onclick="event.stopPropagation()">
          <button class="btn-icon btn-view" onclick="viewRequest(${request.id})" title="Voir les détails">
            👁️
          </button>
          <button 
            class="btn-icon btn-delete" 
            onclick="deleteRequest(${request.id}, '${request.requestType}')"
            ${request.requestType === 'known_sender' ? 'disabled' : ''}
            title="${request.requestType === 'known_sender' ? 'Impossible de supprimer une demande à un expéditeur connu' : 'Supprimer'}">
            🗑️
          </button>
        </div>
      </div>
      
      <div class="request-card-body">
        <div class="request-detail">
          <span class="request-detail-label">Demandeur</span>
          <span class="request-detail-value">${request.fullName}</span>
        </div>
        <div class="request-detail">
          <span class="request-detail-label">Téléphone</span>
          <span class="request-detail-value">${request.phone}</span>
        </div>
        ${request.senderName ? `
          <div class="request-detail">
            <span class="request-detail-label">Expéditeur</span>
            <span class="request-detail-value">${request.senderName}</span>
          </div>
        ` : ''}
        ${request.message ? `
          <div class="request-detail">
            <span class="request-detail-label">Message</span>
            <span class="request-detail-value">${request.message}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="request-card-footer">
        <span class="request-date">
          Créé le ${formatDate(request.created_at)}
        </span>
        ${request.status === 'pending' ? `
          <span class="request-expires">
            Expire le ${formatDate(request.expires_at)}
          </span>
        ` : ''}
      </div>
    </div>
  `).join('');
}

// Filter requests
function filterRequests() {
  const statusFilter = document.getElementById('statusFilter').value;
  const typeFilter = document.getElementById('typeFilter').value;
  
  filteredRequests = allRequests.filter(request => {
    const statusMatch = statusFilter === 'all' || request.status === statusFilter;
    const typeMatch = typeFilter === 'all' || request.requestType === typeFilter;
    return statusMatch && typeMatch;
  });
  
  sortRequests();
}

// Sort requests
function sortRequests() {
  const sortBy = document.getElementById('sortBy').value;
  
  filteredRequests.sort((a, b) => {
    if (sortBy === 'date_desc') {
      return new Date(b.created_at) - new Date(a.created_at);
    } else if (sortBy === 'date_asc') {
      return new Date(a.created_at) - new Date(b.created_at);
    } else if (sortBy === 'status') {
      return a.status.localeCompare(b.status);
    }
    return 0;
  });
  
  renderRequests();
}

// View request details
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
            <span class="confirmation-detail-value">#${request.id}</span>
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
            <span class="confirmation-detail-value">${request.fullName}</span>
          </div>
          <div class="confirmation-detail">
            <span class="confirmation-detail-label">Téléphone</span>
            <span class="confirmation-detail-value">${request.phone}</span>
          </div>
          ${request.senderName ? `
            <div class="confirmation-detail">
              <span class="confirmation-detail-label">Expéditeur</span>
              <span class="confirmation-detail-value">${request.senderName}</span>
            </div>
          ` : ''}
          ${request.senderPhone ? `
            <div class="confirmation-detail">
              <span class="confirmation-detail-label">Téléphone expéditeur</span>
              <span class="confirmation-detail-value">${request.senderPhone}</span>
            </div>
          ` : ''}
          ${request.message ? `
            <div class="confirmation-detail">
              <span class="confirmation-detail-label">Message</span>
              <span class="confirmation-detail-value">${request.message}</span>
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

// Delete request
function deleteRequest(requestId, requestType) {
  if (requestType === 'known_sender') {
    window.Nimwema.showNotification('Impossible de supprimer une demande à un expéditeur connu', 'error');
    return;
  }
  
  deleteTarget = { type: 'request', id: requestId };
  document.getElementById('deleteMessage').textContent = 
    'Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible.';
  openModal('deleteModal');
}

// ============================================
// SENDERS MANAGEMENT
// ============================================

// Load senders
async function loadSenders() {
  try {
    // In production, fetch from API
    const response = await fetch(`/api/senders?userId=${currentUser.id}`);
    const senders = await response.json();
    
    allSenders = senders;
    renderSenders();
  } catch (error) {
    console.error('Error loading senders:', error);
    // Show empty state with demo data
    allSenders = [];
    renderSenders();
  }
}

// Render senders
function renderSenders() {
  const container = document.getElementById('sendersList');
  
  if (allSenders.length === 0) {
    showEmptyState('sendersList', 'Aucun expéditeur', 'Ajoutez vos expéditeurs favoris pour faciliter vos demandes futures.');
    return;
  }
  
  container.innerHTML = allSenders.map(sender => `
    <div class="sender-card">
      <div class="sender-card-header">
        <div class="sender-avatar">${getInitials(sender.name)}</div>
        <div class="sender-card-actions">
          <button class="btn-icon btn-view" onclick="editSender(${sender.id})" title="Modifier">
            ✏️
          </button>
          <button class="btn-icon btn-delete" onclick="deleteSender(${sender.id})" title="Supprimer">
            🗑️
          </button>
        </div>
      </div>
      
      <div class="sender-card-body">
        <div class="sender-name">${sender.name}</div>
        <div class="sender-phone">${sender.phone}</div>
        ${sender.relation ? `<span class="sender-relation">${sender.relation}</span>` : ''}
      </div>
      
      <div class="sender-card-footer">
        <button class="btn-use-sender" onclick="useSender(${sender.id})">
          Utiliser pour une demande
        </button>
      </div>
    </div>
  `).join('');
}

// Show add sender modal
function showAddSenderModal() {
  document.getElementById('senderModalTitle').textContent = 'Ajouter un expéditeur';
  document.getElementById('senderForm').reset();
  document.getElementById('senderId').value = '';
  openModal('senderModal');
}

// Edit sender
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

// Save sender
async function saveSender(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const senderId = formData.get('senderId');
  const senderData = {
    name: formData.get('name'),
    phone: formData.get('phone'),
    relation: formData.get('relation'),
    userId: currentUser.id
  };
  
  try {
    let response;
    if (senderId) {
      // Update existing sender
      response = await fetch(`/api/senders/${senderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(senderData)
      });
    } else {
      // Create new sender
      response = await fetch('/api/senders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(senderData)
      });
    }
    
    const result = await response.json();
    
    if (result.success) {
      window.Nimwema.showNotification(
        senderId ? 'Expéditeur modifié avec succès' : 'Expéditeur ajouté avec succès',
        'success'
      );
      closeModal('senderModal');
      loadSenders();
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error saving sender:', error);
    window.Nimwema.showNotification('Erreur lors de l\'enregistrement', 'error');
  }
}

// Delete sender
function deleteSender(senderId) {
  deleteTarget = { type: 'sender', id: senderId };
  document.getElementById('deleteMessage').textContent = 
    'Êtes-vous sûr de vouloir supprimer cet expéditeur ? Cette action est irréversible.';
  openModal('deleteModal');
}

// Use sender for new request
function useSender(senderId) {
  const sender = allSenders.find(s => s.id === senderId);
  if (!sender) return;
  
  // Store sender data in session storage
  sessionStorage.setItem('selectedSender', JSON.stringify(sender));
  
  // Redirect to request page
  window.location.href = '/request.html';
}

// ============================================
// MODAL MANAGEMENT
// ============================================

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
  document.body.style.overflow = 'auto';
}

// Confirm delete
async function confirmDelete() {
  if (!deleteTarget) return;
  
  try {
    let response;
    if (deleteTarget.type === 'request') {
      response = await fetch(`/api/requests/${deleteTarget.id}`, {
        method: 'DELETE'
      });
    } else if (deleteTarget.type === 'sender') {
      response = await fetch(`/api/senders/${deleteTarget.id}`, {
        method: 'DELETE'
      });
    }
    
    const result = await response.json();
    
    if (result.success) {
      window.Nimwema.showNotification('Supprimé avec succès', 'success');
      closeModal('deleteModal');
      
      if (deleteTarget.type === 'request') {
        loadRequests();
      } else {
        loadSenders();
      }
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error deleting:', error);
    window.Nimwema.showNotification('Erreur lors de la suppression', 'error');
  }
  
  deleteTarget = null;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getStatusText(status) {
  const statusMap = {
    'pending': 'En attente',
    'fulfilled': 'Satisfait',
    'expired': 'Expiré'
  };
  return statusMap[status] || status;
}

function getTypeText(type) {
  const typeMap = {
    'known_sender': 'Expéditeur connu',
    'waiting_list': 'Liste d\'attente'
  };
  return typeMap[type] || type;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getInitials(name) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

function showEmptyState(containerId, title, message) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <h3>${title}</h3>
      <p>${message}</p>
    </div>
  `;
}

function setupPhoneFormatting() {
  const phoneInput = document.getElementById('senderFormPhone');
  if (phoneInput) {
    phoneInput.addEventListener('input', function(e) {
      let value = e.target.value;
      value = value.replace(/[^\d+]/g, '');
      if (value && !value.startsWith('+')) {
        value = '+' + value;
      }
      e.target.value = value;
    });
  }
}

function logout() {
  if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
    // Clear session
    localStorage.removeItem('nimwema_user');
    sessionStorage.clear();
    
    // Redirect to home
    window.location.href = '/';
  }
}

// Export functions for HTML onclick handlers
window.showSection = showSection;
window.viewRequest = viewRequest;
window.deleteRequest = deleteRequest;
window.filterRequests = filterRequests;
window.sortRequests = sortRequests;
window.showAddSenderModal = showAddSenderModal;
window.editSender = editSender;
window.deleteSender = deleteSender;
window.useSender = useSender;
window.saveSender = saveSender;
window.openModal = openModal;
window.closeModal = closeModal;
window.confirmDelete = confirmDelete;
window.logout = logout;
// Load user's pending orders
async function loadPendingOrders() {
    try {
        const pendingOrdersList = document.getElementById('pendingOrdersList');
        
        // Get all orders from global.orders that belong to this user
        const response = await fetch('/api/orders/my-pending');
        const data = await response.json();
        
        if (!data.success || !data.orders || data.orders.length === 0) {
            pendingOrdersList.innerHTML = '<div class="empty-state"><p>Aucune commande en attente</p></div>';
            return;
        }
        
        pendingOrdersList.innerHTML = data.orders.map(order => `
            <div class="request-card" style="border-left: 4px solid #FFA726;">
                <div class="request-header">
                    <div>
                        <h3>Commande ${order.id}</h3>
                        <p class="text-small">${new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <span class="status-badge" style="background: #FFA726; color: white;">En attente</span>
                </div>
                <div class="request-details">
                    <p><strong>Montant:</strong> ${order.amount} ${order.currency} × ${order.quantity} = ${order.total} ${order.currency}</p>
                    <p><strong>Méthode:</strong> ${order.paymentMethod === 'cash' ? 'Cash/Western Union' : 'Virement Bancaire'}</p>
                    <p><strong>Destinataires:</strong> ${order.recipients?.length || 0}</p>
                </div>
                <div class="request-actions">
                    <button class="btn btn-secondary btn-sm" onclick="viewPaymentInstructions('${order.id}')">📄 Voir instructions</button>
                    <button class="btn btn-danger btn-sm" onclick="cancelOrder('${order.id}')">❌ Annuler</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading pending orders:', error);
    }
}

// View payment instructions
function viewPaymentInstructions(orderId) {
    window.location.href = `/payment-instructions.html?order=${orderId}`;
}

// Cancel order
async function cancelOrder(orderId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette commande?')) return;
    
    try {
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Commande annulée');
            loadPendingOrders();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Erreur: ' + error.message);
    }
}

// Load on page load
if (document.getElementById('pendingOrdersList')) {
    loadPendingOrders();
    setInterval(loadPendingOrders, 30000);
}

// Load user's pending orders
async function loadPendingOrders() {
    try {
        const pendingOrdersList = document.getElementById('pendingOrdersList');
        if (!pendingOrdersList) return;
        
        // Get all orders from global.orders that match user's phone or are in pending_payment status
        const response = await fetch('/api/orders/my-pending');
        const data = await response.json();
        
        if (!data.success || !data.orders || data.orders.length === 0) {
            pendingOrdersList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #999;">
                    <p>Aucune commande en attente</p>
                    <button class="btn btn-primary" onclick="window.location.href='/send.html'">
                        Envoyer un bon d'achat
                    </button>
                </div>
            `;
            return;
        }
        
        pendingOrdersList.innerHTML = data.orders.map(order => `
            <div class="card" style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <h3 style="margin: 0 0 8px 0;">Commande ${order.id}</h3>
                        <p style="margin: 4px 0; color: #666;">
                            <strong>Montant:</strong> ${order.amount} ${order.currency} × ${order.quantity} = ${order.total} ${order.currency}
                        </p>
                        <p style="margin: 4px 0; color: #666;">
                            <strong>Méthode:</strong> ${order.paymentMethod === 'cash' ? 'Cash / Western Union' : 'Virement Bancaire'}
                        </p>
                        <p style="margin: 4px 0; color: #666;">
                            <strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}
                        </p>
                        <p style="margin: 4px 0;">
                            <span class="status-badge" style="background: #FFA726; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px;">
                                En attente de validation
                            </span>
                        </p>
                    </div>
                    <button class="btn btn-danger btn-sm" onclick="cancelOrder('${order.id}')">
                        Annuler
                    </button>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading pending orders:', error);
    }
}

// Cancel order
async function cancelOrder(orderId) {
    if (!confirm('Êtes-vous sûr de vouloir annuler cette commande?')) return;
    
    try {
        const response = await fetch(`/api/orders/${orderId}/cancel`, {
            method: 'POST'
        });
        const data = await response.json();
        
        if (data.success) {
            alert('✅ Commande annulée avec succès');
            loadPendingOrders();
        } else {
            alert('❌ ' + data.message);
        }
    } catch (error) {
        alert('❌ Erreur: ' + error.message);
    }
}

// Load on page load
if (document.getElementById('pendingOrdersList')) {
    loadPendingOrders();
    setInterval(loadPendingOrders, 30000); // Refresh every 30 seconds
}
