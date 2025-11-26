/**
 * Nimwema Dashboard - Consolidated JavaScript
 * Handles both sender and requester views in unified dashboard
 */

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  API_BASE: '/api',
  STORAGE_KEYS: {
    USER: 'nimwema_user',
    TOKEN: 'nimwema_token',
    GUEST: 'nimwema_guest'
  },
  REFRESH_INTERVAL: 30000,
  PREVIEW_LIMIT: 5
};




// ============================================
// STATE
// ============================================

let currentUser = null;
let allSentVouchers = [];
let allRequestedVouchers = [];
let allRecipients = [];
let allSenders = [];
let deleteTarget = null; // { type: 'recipient'|'sender', id: '...' }

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
  console.log('[Dashboard] Initializing...');
  
  if (!checkAuth()) {
    return;
  }
  
  // Load home section by default
  showSection('home');
});
//==================================




//MyConfig

///////
 const userString = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
currentUser = JSON.parse(userString);
const sfullName = currentUser.name || "";
const sphone = currentUser.phone || "";

// Split into first + last name
let sfirstName = "";
let slastName = "";

if (sfullName.includes(" ")) {
    const parts = sfullName.trim().split(" ");
    sfirstName = parts[0];
    slastName = parts.slice(1).join(" ");
} else {
    sfirstName = sfullName;
}

// Encode for URL
const qsFirst = encodeURIComponent(sfirstName);
const qsLast = encodeURIComponent(slastName);
const qsPhone = encodeURIComponent(sphone);

/////////
// ============================================
// AUTHENTICATION
// ============================================

function checkAuth() {
  const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
  
  if (!userStr) {
    // Check for guest session
    const guestStr = localStorage.getItem(CONFIG.STORAGE_KEYS.GUEST);
    if (guestStr) {
      try {
        const guest = JSON.parse(guestStr);
        currentUser = { ...guest, isGuest: true };
        document.getElementById('userName').textContent = 'Invité';
        return true;
      } catch (e) {
        console.error('Error parsing guest data:', e);
      }
    }
    
    window.location.href = '/login.html';
    return false;
  }
  
  try {
    currentUser = JSON.parse(userStr);
    const displayName = currentUser.name || currentUser.email || currentUser.phone || 'Utilisateur';
    document.getElementById('userName').textContent = displayName;
   
    
    
   


    return true;
  } catch (error) {
    console.error('Error parsing user data:', error);
    logout();
    return false;
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : ''
  };
}

async function logout() {
  try {
    await fetch(`${CONFIG.API_BASE}/auth/logout`, {
      method: 'POST',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.GUEST);
    window.location.href = '/login.html';
  }
}

// ============================================
// NAVIGATION
// ============================================

function showSection(sectionName) {
  console.log('[Dashboard] Showing section:', sectionName);
  
  // Update nav items
  document.querySelectorAll('.dashboard-nav .nav-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const sectionMap = {
    'home': '#home',
    'sent-vouchers': '#sent-vouchers',
    'requested-vouchers': '#requested-vouchers',
    'recipients': '#recipients',
    'senders': '#senders'
  };
  
  const selector = sectionMap[sectionName];
  if (selector) {
    const activeLink = document.querySelector(`.dashboard-nav a[href="${selector}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }
  }
  
  // Hide all sections
  document.querySelectorAll('.dashboard-section').forEach(section => {
    section.classList.remove('active');
  });
  
  // Show target section and load data
  switch (sectionName) {
    case 'home':
      document.getElementById('homeSection').classList.add('active');
      loadHome();
      break;
    case 'sent-vouchers':
      document.getElementById('sentVouchersSection').classList.add('active');
      loadSentVouchers();
      break;
    case 'requested-vouchers':
      document.getElementById('requestedVouchersSection').classList.add('active');
      loadRequestedVouchers();
      break;
    case 'recipients':
      document.getElementById('recipientsSection').classList.add('active');
      loadRecipients();
      break;
    case 'senders':
      document.getElementById('sendersSection').classList.add('active');
      loadSenders();
      break;
  }
  
  // Close mobile menu if open
  closeMobileMenu();
}

function toggleMobileMenu() {
  const sidebar = document.getElementById('dashboardSidebar');
  sidebar.classList.toggle('mobile-open');
}

function closeMobileMenu() {
  const sidebar = document.getElementById('dashboardSidebar');
  sidebar.classList.remove('mobile-open');
}

// ============================================
// HOME SECTION
// ============================================

async function loadHome() {
  console.log('[Dashboard] Loading home...');
  
  // Load both previews in parallel
  await Promise.all([
    loadSentVouchersPreview(),
    loadRequestedVouchersPreview()
  ]);
}

async function loadSentVouchersPreview() {
  const container = document.getElementById('sentVouchersPreview');
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/orders/my-sent`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.orders && data.orders.length > 0) {
      allSentVouchers = data.orders;
      const preview = data.orders.slice(0, CONFIG.PREVIEW_LIMIT);
      container.innerHTML = preview.map(order => renderOrderCard(order, true)).join('');
    } else {
      container.innerHTML = `
        <div class="empty-state-small">
          <p>Aucun bon envoyé</p>
          <a href="/send.html" class="btn btn-primary btn-sm">Envoyer un bon</a>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading sent vouchers preview:', error);
    container.innerHTML = `
      <div class="empty-state-small">
        <p>Aucun bon envoyé</p>
        <a href="/send.html" class="btn btn-primary btn-sm">Envoyer un bon</a>
      </div>
    `;
  }
}

async function loadRequestedVouchersPreview() {
  const container = document.getElementById('requestedVouchersPreview');
  
  try {
    const requests = await fetchRequests();
    
    if (requests.length > 0) {
      allRequestedVouchers = requests;
      const preview = requests.slice(0, CONFIG.PREVIEW_LIMIT);
      container.innerHTML = preview.map(req => renderRequestCard(req, true)).join('');
    } else {
      container.innerHTML = `
        <div class="empty-state-small">
          <p>Aucune demande</p>
          <a href="/request.html" class="btn btn-primary btn-sm">Faire une demande</a>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading requests preview:', error);
    container.innerHTML = `
      <div class="empty-state-small">
        <p>Aucune demande</p>
        <a href="/request.html" class="btn btn-primary btn-sm">Faire une demande</a>
      </div>
    `;
  }
}

// ============================================
// SENT VOUCHERS (ORDERS)
// ============================================

async function loadSentVouchers() {
  const container = document.getElementById('sentVouchersList');
  container.innerHTML = '<div class="loading-state"><p>Chargement...</p></div>';
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/orders/my-sent`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.orders) {
      allSentVouchers = data.orders;
      renderSentVouchers();
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📤</div>
          <h3>Aucun bon envoyé</h3>
          <p>Vous n'avez pas encore envoyé de bons d'achat.</p>
          <a href="/send.html" class="btn btn-primary">Envoyer un bon</a>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading sent vouchers:', error);
    container.innerHTML = `
      <div class="error-state">
        <p>Erreur lors du chargement</p>
        <button class="btn btn-secondary" onclick="loadSentVouchers()">Réessayer</button>
      </div>
    `;
  }
}

function renderSentVouchers() {
  const container = document.getElementById('sentVouchersList');
  const statusFilter = document.getElementById('sentStatusFilter')?.value || 'all';
  const sortBy = document.getElementById('sentSortBy')?.value || 'date_desc';
  
  let filtered = [...allSentVouchers];
  
  // Apply status filter
  if (statusFilter !== 'all') {
    filtered = filtered.filter(o => o.status === statusFilter);
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'date_asc':
        return new Date(a.createdAt) - new Date(b.createdAt);
      case 'amount_desc':
        return (b.amount || 0) - (a.amount || 0);
      case 'amount_asc':
        return (a.amount || 0) - (b.amount || 0);
      case 'date_desc':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Aucun résultat pour ce filtre</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filtered.map(order => renderOrderCard(order, false)).join('');
}

function filterSentVouchers() {
  renderSentVouchers();
}

function sortSentVouchers() {
  renderSentVouchers();
}

function renderOrderCard(order, isPreview = false) {
  const statusInfo = getOrderStatusInfo(order.status);
  const date = formatDate(order.createdAt);
  const amount = formatCurrency(order.amount || order.total, order.currency);
  
  return `
    <div class="order-card ${isPreview ? 'preview-card' : ''}">
      <div class="order-header">
        <div>
          <h4>Commande #${escapeHTML(order.id?.slice(-8) || '')}</h4>
          <p class="text-small text-muted">${date}</p>
        </div>
        <span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>
      </div>
      <div class="order-details">
        <div class="detail-row">
          <span>Montant:</span>
          <strong>${amount}</strong>
        </div>
        <div class="detail-row">
          <span>Quantité:</span>
          <strong>${order.quantity || 1} bon(s)</strong>
        </div>
        ${!isPreview ? `
        <div class="detail-row">
          <span>Méthode:</span>
          <strong>${getPaymentMethodLabel(order.paymentMethod)}</strong>
        </div>
        ` : ''}
      </div>
      ${!isPreview && order.status === 'pending' ? `
      <div class="order-actions">
        <button class="btn btn-secondary btn-sm" onclick="viewOrderDetails('${order.id}')">Détails</button>
      </div>
      ` : ''}
    </div>
  `;
}

function getOrderStatusInfo(status) {
  const statuses = {
    'pending': { label: 'En attente', class: 'status-pending' },
    'pending_payment': { label: 'Paiement en attente', class: 'status-pending' },
    'pending_approval': { label: 'En validation', class: 'status-pending' },
    'paid': { label: 'Payé', class: 'status-success' },
    'sent': { label: 'Envoyé', class: 'status-success' },
    'failed': { label: 'Échoué', class: 'status-failed' },
    'cancelled': { label: 'Annulé', class: 'status-failed' }
  };
  return statuses[status] || { label: status || 'Inconnu', class: 'status-pending' };
}

function viewOrderDetails(orderId) {
  const order = allSentVouchers.find(o => o.id === orderId);
  if (!order) return;
  
  const statusInfo = getOrderStatusInfo(order.status);
  
  document.getElementById('orderModalBody').innerHTML = `
    <div class="order-details-full">
      <div class="detail-row">
        <span>ID Commande:</span>
        <strong>${escapeHTML(order.id)}</strong>
      </div>
      <div class="detail-row">
        <span>Statut:</span>
        <span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>
      </div>
      <div class="detail-row">
        <span>Montant:</span>
        <strong>${formatCurrency(order.amount, order.currency)}</strong>
      </div>
      <div class="detail-row">
        <span>Total:</span>
        <strong>${formatCurrency(order.total, order.currency)}</strong>
      </div>
      <div class="detail-row">
        <span>Quantité:</span>
        <strong>${order.quantity || 1} bon(s)</strong>
      </div>
      <div class="detail-row">
        <span>Méthode de paiement:</span>
        <strong>${getPaymentMethodLabel(order.paymentMethod)}</strong>
      </div>
      <div class="detail-row">
        <span>Date:</span>
        <strong>${formatDate(order.createdAt)}</strong>
      </div>
      ${order.message ? `
      <div class="detail-row">
        <span>Message:</span>
        <span>${escapeHTML(order.message)}</span>
      </div>
      ` : ''}
    </div>
  `;
  
  openModal('orderModal');
}

// ============================================
// REQUESTED VOUCHERS
// ============================================

async function fetchRequests() {
  // Fetch from API
  const params = new URLSearchParams();
  if (currentUser?.phone) {
    params.append('phone', currentUser.phone);
  } else if (currentUser?.id) {
    params.append('userId', currentUser.id);
  }
  
  const response = await fetch(`${CONFIG.API_BASE}/requests?${params.toString()}`, {
    headers: getAuthHeaders(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  const data = await response.json();
  
  // Handle both array response and { success, requests } format
  let requests = Array.isArray(data) ? data : (data.requests || data || []);
  
  // Also check localStorage for guest requests
  const localRequests = getLocalRequests();
  
  // Merge and deduplicate by ID
  const byId = new Map();
  requests.forEach(r => {
    if (r && r.id) byId.set(String(r.id), r);
  });
  localRequests.forEach(r => {
    if (r && r.id && !byId.has(String(r.id))) {
      byId.set(String(r.id), r);
    }
  });
  
  return Array.from(byId.values());
}

function getLocalRequests() {
  try {
    const raw = localStorage.getItem('nimwema_requests');
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch (e) {
    return [];
  }
}

async function loadRequestedVouchers() {
  const container = document.getElementById('requestedVouchersList');
  container.innerHTML = '<div class="loading-state"><p>Chargement...</p></div>';
  
  try {
    const requests = await fetchRequests();
    allRequestedVouchers = requests;
    renderRequestedVouchers();
  } catch (error) {
    console.error('Error loading requests:', error);
    container.innerHTML = `
      <div class="error-state">
        <p>Erreur lors du chargement</p>
        <button class="btn btn-secondary" onclick="loadRequestedVouchers()">Réessayer</button>
      </div>
    `;
  }
}

function renderRequestedVouchers() {
  const container = document.getElementById('requestedVouchersList');
  const statusFilter = document.getElementById('requestStatusFilter')?.value || 'all';
  const typeFilter = document.getElementById('requestTypeFilter')?.value || 'all';
  const sortBy = document.getElementById('requestSortBy')?.value || 'date_desc';
  
  let filtered = [...allRequestedVouchers];
  
  // Apply status filter
  if (statusFilter !== 'all') {
    filtered = filtered.filter(r => (r.status || 'pending') === statusFilter);
  }
  
  // Apply type filter
  if (typeFilter !== 'all') {
    filtered = filtered.filter(r => (r.requestType || r.type || 'waiting_list') === typeFilter);
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || 0);
    const dateB = new Date(b.created_at || b.createdAt || 0);
    return sortBy === 'date_asc' ? dateA - dateB : dateB - dateA;
  });
  
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📥</div>
        <h3>Aucune demande</h3>
        <p>Vous n'avez pas encore fait de demande de bon.</p>
        <a href="/request.html" class="btn btn-primary">Faire une demande</a>
      </div>
    `;
    return;
  }
  
  container.innerHTML = filtered.map(req => renderRequestCard(req, false)).join('');
}

function filterRequestedVouchers() {
  renderRequestedVouchers();
}

function sortRequestedVouchers() {
  renderRequestedVouchers();
}

function renderRequestCard(req, isPreview = false) {
  const statusInfo = getRequestStatusInfo(req.status);
  const typeInfo = getRequestTypeInfo(req.requestType || req.type);
  const date = formatDate(req.created_at || req.createdAt);
  const expiresAt = req.expires_at || req.expiresAt;
  
  const fullName = req.fullName || 
    (req.firstName ? `${req.firstName} ${req.lastName || ''}`.trim() : '') ||
    (req.requester_first_name ? `${req.requester_first_name} ${req.requester_last_name || ''}`.trim() : 'Demande');
  
  return `
    <div class="request-card ${isPreview ? 'preview-card' : ''}">
      <div class="order-header">
        <div>
          <h4>${escapeHTML(fullName)}</h4>
          <p class="text-small text-muted">${date}</p>
        </div>
        <span class="status-badge ${statusInfo.class}">${statusInfo.label}</span>
      </div>
      <div class="order-details">
        <div class="detail-row">
          <span>Téléphone:</span>
          <strong>${escapeHTML(req.phone || req.requester_phone || '')}</strong>
        </div>
        <div class="detail-row">
          <span>Type:</span>
          <span class="type-badge ${typeInfo.class}">${typeInfo.label}</span>
        </div>
        ${expiresAt && (req.requestType || req.type) === 'waiting_list' ? `
        <div class="detail-row">
          <span>Expire le:</span>
          <strong>${formatDate(expiresAt)}</strong>
        </div>
        ` : ''}
      </div>
      ${req.message && !isPreview ? `
      <div class="request-message">
        <span class="text-small text-muted">Message:</span>
        <p>${escapeHTML(req.message)}</p>
      </div>
      ` : ''}
    </div>
  `;
}

function getRequestStatusInfo(status) {
  const statuses = {
    'pending': { label: 'En attente', class: 'status-pending' },
    'fulfilled': { label: 'Satisfait', class: 'status-success' },
    'received': { label: 'Reçu', class: 'status-success' },
    'expired': { label: 'Expiré', class: 'status-expired' },
    'cancelled': { label: 'Annulé', class: 'status-failed' },
    'canceled': { label: 'Annulé', class: 'status-failed' }
  };
  return statuses[status] || { label: 'En attente', class: 'status-pending' };
}

function getRequestTypeInfo(type) {
  const types = {
    'known_sender': { label: 'Expéditeur connu', class: 'type-known' },
    'waiting_list': { label: 'Liste d\'attente', class: 'type-waiting' }
  };
  return types[type] || { label: 'Liste d\'attente', class: 'type-waiting' };
}

// ============================================
// RECIPIENTS MANAGEMENT
// ============================================



 


async function loadRecipients() {
  const container = document.getElementById('recipientsList');
  container.innerHTML = '<div class="loading-state"><p>Chargement...</p></div>';
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/recipients`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Non authentifié');
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.recipients) {
      allRecipients = data.recipients;
      renderRecipients();
    } else {
      renderEmptyRecipients();
    }
  } catch (error) {
    console.error('Error loading recipients:', error);
    renderEmptyRecipients();
  }
}

function renderRecipients() {
  const container = document.getElementById('recipientsList');
  
  if (!allRecipients || allRecipients.length === 0) {
    renderEmptyRecipients();
    return;
  }
  
  container.innerHTML = allRecipients.map(recipient => `
    <div class="contact-card">
      <div class="contact-avatar">${getInitials(recipient.name)}</div>
      <div class="contact-info">
        <h4>${escapeHTML(recipient.name)}</h4>
        <p class="text-small">${escapeHTML(recipient.phone)}</p>
        ${recipient.notes ? `<p class="text-small text-muted">${escapeHTML(recipient.notes)}</p>` : ''}
        ${recipient.vouchers_received > 0 ? `
        <p class="text-small text-muted">${recipient.vouchers_received} bon(s) envoyé(s)</p>
        ` : ''}
      </div>
      <div class="contact-actions">
        <button class="btn-icon btn-edit" onclick="editRecipient('${recipient.id}')" title="Modifier">✏️</button>
        <button class="btn-icon btn-delete" onclick="deleteRecipientConfirm('${recipient.id}')" title="Supprimer">🗑️</button>
        <a href="/send.html?sname=${encodeURIComponent(sfirstName)}%20${encodeURIComponent(slastName)}&sphone=${encodeURIComponent(sphone)}&phone=${encodeURIComponent(recipient.phone)}&name=${encodeURIComponent(recipient.name)}" class="btn btn-primary btn-sm">Envoyer</a>

       <!--  <a href="/send.html?phone=${encodeURIComponent(recipient.phone)}&name=${encodeURIComponent(recipient.name)}" class="btn btn-primary btn-sm">Envoyer</a> -->
      </div>
    </div>
  `).join('');
}

function renderEmptyRecipients() {
  document.getElementById('recipientsList').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">👥</div>
      <h3>Aucun destinataire</h3>
      <p>Ajoutez des destinataires pour envoyer des bons plus rapidement.</p>
      <button class="btn btn-primary" onclick="showAddRecipientModal()">Ajouter un destinataire</button>
    </div>
  `;
}

function showAddRecipientModal() {
  document.getElementById('recipientModalTitle').textContent = 'Ajouter un destinataire';
  document.getElementById('recipientForm').reset();
  document.getElementById('recipientId').value = '';
  openModal('recipientModal');
}

function editRecipient(id) {
  const recipient = allRecipients.find(r => r.id === id);
  if (!recipient) return;
  
  document.getElementById('recipientModalTitle').textContent = 'Modifier le destinataire';
  document.getElementById('recipientId').value = recipient.id;
  document.getElementById('recipientName').value = recipient.name || '';
  document.getElementById('recipientPhone').value = recipient.phone || '';
  document.getElementById('recipientNotes').value = recipient.notes || '';
  
  openModal('recipientModal');
}

async function saveRecipient(event) {
  event.preventDefault();
  
  const id = document.getElementById('recipientId').value;
  const name = document.getElementById('recipientName').value.trim();
  const phone = document.getElementById('recipientPhone').value.trim();
  const notes = document.getElementById('recipientNotes').value.trim();
  
  if (!name || !phone) {
    showNotification('Nom et téléphone requis', 'error');
    return;
  }
  
  try {
    const url = id ? `${CONFIG.API_BASE}/recipients/${id}` : `${CONFIG.API_BASE}/recipients`;
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ name, phone, notes })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification(id ? 'Destinataire modifié' : 'Destinataire ajouté', 'success');
      closeModal('recipientModal');
      loadRecipients();
    } else {
      throw new Error(data.message || 'Erreur');
    }
  } catch (error) {
    console.error('Error saving recipient:', error);
    showNotification('Erreur lors de l\'enregistrement', 'error');
  }
}

function deleteRecipientConfirm(id) {
  deleteTarget = { type: 'recipient', id };
  document.getElementById('deleteMessage').textContent = 'Êtes-vous sûr de vouloir supprimer ce destinataire ?';
  openModal('deleteModal');
}

// ============================================
// SENDERS MANAGEMENT
// ============================================

async function loadSenders() {
  const container = document.getElementById('sendersList');
  container.innerHTML = '<div class="loading-state"><p>Chargement...</p></div>';
  
  try {
    const response = await fetch(`${CONFIG.API_BASE}/senders`, {
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Non authentifié');
      }
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.senders) {
      allSenders = data.senders;
      renderSenders();
    } else if (Array.isArray(data)) {
      // Handle old format
      allSenders = data;
      renderSenders();
    } else {
      renderEmptySenders();
    }
  } catch (error) {
    console.error('Error loading senders:', error);
    renderEmptySenders();
  }
}

function renderSenders() {
  const container = document.getElementById('sendersList');
  
  if (!allSenders || allSenders.length === 0) {
    renderEmptySenders();
    return;
  }
  
  container.innerHTML = allSenders.map(sender => `
    <div class="contact-card">
      <div class="contact-avatar">${getInitials(sender.name)}</div>
      <div class="contact-info">
        <h4>${escapeHTML(sender.name)}</h4>
        <p class="text-small">${escapeHTML(sender.phone)}</p>
        ${sender.relationship ? `<p class="text-small text-muted">${escapeHTML(sender.relationship)}</p>` : ''}
      </div>
      <div class="contact-actions">
        <button class="btn-icon btn-edit" onclick="editSender('${sender.id}')" title="Modifier">✏️</button>
        <button class="btn-icon btn-delete" onclick="deleteSenderConfirm('${sender.id}')" title="Supprimer">🗑️</button>
        <a href="/request.html?senderPhone=${encodeURIComponent(sender.phone)}&senderName=${encodeURIComponent(sender.name)}" class="btn btn-primary btn-sm">Demander</a>
      </div>
    </div>
  `).join('');
}

function renderEmptySenders() {
  document.getElementById('sendersList').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">👤</div>
      <h3>Aucun expéditeur</h3>
      <p>Ajoutez des expéditeurs pour demander des bons plus rapidement.</p>
      <button class="btn btn-primary" onclick="showAddSenderModal()">Ajouter un expéditeur</button>
    </div>
  `;
}

function showAddSenderModal() {
  document.getElementById('senderModalTitle').textContent = 'Ajouter un expéditeur';
  document.getElementById('senderForm').reset();
  document.getElementById('senderId').value = '';
  openModal('senderModal');
}

function editSender(id) {
  const sender = allSenders.find(s => s.id === id);
  if (!sender) return;
  
  document.getElementById('senderModalTitle').textContent = 'Modifier l\'expéditeur';
  document.getElementById('senderId').value = sender.id;
  document.getElementById('senderFormName').value = sender.name || '';
  document.getElementById('senderFormPhone').value = sender.phone || '';
  document.getElementById('senderFormRelation').value = sender.relationship || '';
  
  openModal('senderModal');
}

async function saveSender(event) {
  event.preventDefault();
  
  const id = document.getElementById('senderId').value;
  const name = document.getElementById('senderFormName').value.trim();
  const phone = document.getElementById('senderFormPhone').value.trim();
  const relationship = document.getElementById('senderFormRelation').value.trim();
  
  if (!name || !phone) {
    showNotification('Nom et téléphone requis', 'error');
    return;
  }
  
  try {
    const url = id ? `${CONFIG.API_BASE}/senders/${id}` : `${CONFIG.API_BASE}/senders`;
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: getAuthHeaders(),
      credentials: 'include',
      body: JSON.stringify({ name, phone, relationship })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification(id ? 'Expéditeur modifié' : 'Expéditeur ajouté', 'success');
      closeModal('senderModal');
      loadSenders();
    } else {
      throw new Error(data.message || 'Erreur');
    }
  } catch (error) {
    console.error('Error saving sender:', error);
    showNotification('Erreur lors de l\'enregistrement', 'error');
  }
}

function deleteSenderConfirm(id) {
  deleteTarget = { type: 'sender', id };
  document.getElementById('deleteMessage').textContent = 'Êtes-vous sûr de vouloir supprimer cet expéditeur ?';
  openModal('deleteModal');
}

// ============================================
// DELETE CONFIRMATION
// ============================================

async function confirmDelete() {
  if (!deleteTarget) return;
  
  try {
    const url = deleteTarget.type === 'recipient' 
      ? `${CONFIG.API_BASE}/recipients/${deleteTarget.id}`
      : `${CONFIG.API_BASE}/senders/${deleteTarget.id}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification('Supprimé avec succès', 'success');
      closeModal('deleteModal');
      
      if (deleteTarget.type === 'recipient') {
        loadRecipients();
      } else {
        loadSenders();
      }
    } else {
      throw new Error(data.message || 'Erreur');
    }
  } catch (error) {
    console.error('Error deleting:', error);
    showNotification('Erreur lors de la suppression', 'error');
  } finally {
    deleteTarget = null;
  }
}

// ============================================
// MODAL HELPERS
// ============================================

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function escapeHTML(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatCurrency(amount, currency = 'USD') {
  if (!amount) return '0';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount);
}

function formatDate(dateString) {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateString));
}

function getPaymentMethodLabel(method) {
  const labels = {
    'flexpay': 'Mobile Money',
    'flexpaycard': 'Carte bancaire',
    'cash': 'Cash/Western Union',
    'bank': 'Virement bancaire'
  };
  return labels[method] || method || 'Non spécifié';
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function showNotification(message, type = 'info') {
  // Use Nimwema global if available
  if (window.Nimwema && window.Nimwema.showNotification) {
    window.Nimwema.showNotification(message, type);
    return;
  }
  
  // Fallback
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 8px;
    background: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 10000;
    border-left: 4px solid ${type === 'success' ? '#2E7D32' : type === 'error' ? '#D32F2F' : '#1976D2'};
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 4000);
}

// ============================================
// GLOBAL EXPORTS
// ============================================

window.showSection = showSection;
window.toggleMobileMenu = toggleMobileMenu;
window.logout = logout;
window.loadSentVouchers = loadSentVouchers;
window.filterSentVouchers = filterSentVouchers;
window.sortSentVouchers = sortSentVouchers;
window.loadRequestedVouchers = loadRequestedVouchers;
window.filterRequestedVouchers = filterRequestedVouchers;
window.sortRequestedVouchers = sortRequestedVouchers;
window.loadRecipients = loadRecipients;
window.showAddRecipientModal = showAddRecipientModal;
window.editRecipient = editRecipient;
window.saveRecipient = saveRecipient;
window.deleteRecipientConfirm = deleteRecipientConfirm;
window.loadSenders = loadSenders;
window.showAddSenderModal = showAddSenderModal;
window.editSender = editSender;
window.saveSender = saveSender;
window.deleteSenderConfirm = deleteSenderConfirm;
window.confirmDelete = confirmDelete;
window.openModal = openModal;
window.closeModal = closeModal;
window.viewOrderDetails = viewOrderDetails;
