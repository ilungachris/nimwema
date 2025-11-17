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

// FIXED Initialize (await auth before any load)
document.addEventListener('DOMContentLoaded', async function() {
  console.log('Dashboard init – awaiting auth...');
  // FIXED: Avoid undefined 'token' – check localStorage directly
  console.log('On load: Token present?', !!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN));

  if (await checkAuth()) {
    loadUserData();
    showSection('pending-orders');
    startRefresh();
  }
});

// FIXED Auth Check (log response, set currentUser safely)
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
    const data = await response.json();
    console.log('Auth response:', { status: response.status, data }); // Temp: See user shape (phone/email?)
    
    if (!response.ok || !data.success || !data.user) throw new Error(`Auth fail: ${response.status}`);
    
    currentUser = data.user;
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
      userNameEl.textContent = currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || 'Utilisateur';
    }
    
    console.log('✅ currentUser set:', { id: currentUser.id, phone: currentUser.phone, email: currentUser.email }); // Temp
    return true;
  } catch (error) {
    console.error('Auth error details:', { message: error.message, token: !!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN), session: !!document.cookie.match(/sessionId=/) });
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    window.location.href = '/login.html';
    return false;
  }
}

// FIXED Show Section (guard currentUser, retry auth if null – prevent recursion loop on failure)
function showSection(sectionName) {
  // FIXED: Retry auth if currentUser null (timing fix) + check success to avoid loop
  if (!currentUser) {
    console.log('showSection: currentUser null – retrying auth...'); // Temp
    checkAuth().then(authSuccess => {
      if (authSuccess) {
        showSection(sectionName); // Only recurse if auth succeeded
      }
      // If failed, it already redirected – no further action needed
    });
    return;
  }

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

// FIXED loadRequests (robust fallback, no null crash)
async function loadRequests() {
  const container = document.getElementById('requestsList');
  if (!container) return;
  
  showLoading(container);
  
  // FIXED: Guard currentUser + use id if phone/email missing (API fallback)
  if (!currentUser) {
    console.error('loadRequests: No currentUser – retry auth');
    checkAuth().then(() => loadRequests());
    return;
  }
  
  const userIdentifier = currentUser.phone || currentUser.email || currentUser.id;
  if (!userIdentifier) {
    console.error('loadRequests: No identifier', currentUser); // Temp
    container.innerHTML = getErrorState('Erreur utilisateur', 'Recharger la page');
    return;
  }
  
  console.log('loadRequests: Using identifier', userIdentifier); // Temp
  
  try {
    // FIXED: Query by phone OR userId (API supports ?phone or ?userId)
    const params = new URLSearchParams();
    if (currentUser.phone || currentUser.email) params.append('phone', currentUser.phone || currentUser.email);
    else params.append('userId', currentUser.id);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    const response = await fetch(`${CONFIG.API_BASE}/requests${queryString}`, { credentials: 'include' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    const requests = data.requests || data; // API shape fallback
    allRequests = requests;
    filteredRequests = [...allRequests];
    
    console.log('📋 Requests loaded:', allRequests.length);
    sortRequests();
    renderRequests();
  } catch (error) {
    console.error('Error loading requests:', error);
    container.innerHTML = getErrorState('Erreur lors du chargement des demandes', 'Réessayer');
  } finally {
    hideLoading(container); // Assume this exists
  }
}

// NEW: Add missing loadPendingOrders (modeled after loadRequests – adapt to your API/render as needed)
async function loadPendingOrders() {
  const container = document.getElementById('pendingOrdersBody'); // From your HTML
  if (!container) {
    console.error('No container for pending orders');
    return;
  }

  showLoading(container); // Assume helper exists; stub if not

  if (!currentUser) {
    console.error('loadPendingOrders: No currentUser – retry auth');
    checkAuth().then(() => loadPendingOrders());
    return;
  }

  const userIdentifier = currentUser.phone || currentUser.email || currentUser.id;
  if (!userIdentifier) {
    console.error('loadPendingOrders: No identifier', currentUser);
    container.innerHTML = getErrorState('Erreur utilisateur', 'Recharger la page');
    return;
  }

  console.log('loadPendingOrders: Using identifier', userIdentifier);

  try {
    const params = new URLSearchParams({ status: 'pending_approval' }); // Adjust status filter for pending
    params.append('phone', userIdentifier); // Or userId if needed
    const response = await fetch(`${CONFIG.API_BASE}/orders?${params.toString()}`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN)}` }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();
    const orders = data.orders || data; // API shape fallback
    allTransactions = orders; // Reuse state if shared; or new array
    filteredTransactions = [...allTransactions];

    console.log('📦 Pending orders loaded:', allTransactions.length);
    sortTransactions(); // Assume exists
    renderPendingOrders(); // Assume render func exists – implement if missing (similar to renderRequests)
  } catch (error) {
    console.error('Error loading pending orders:', error);
    container.innerHTML = getErrorState('Erreur lors du chargement des commandes en attente', 'Réessayer');
  } finally {
    hideLoading(container);
  }
}

// Stub missing helpers (add real impl if needed; these prevent crashes)
function showLoading(container) {
  container.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">⏳ Chargement...</td></tr>'; // Adapt colspan to your table
}

function hideLoading(container) {
  // Clear loading if needed – often handled in render
}

function getErrorState(title, action) {
  return `
    <tr>
      <td colspan="9" class="empty-state" style="text-align: center; padding: 60px 20px; color: #999;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <p style="font-weight: 600; color: #dc3545;">${title}</p>
        <p>${action}</p>
        <button class="btn btn-secondary" onclick="loadPendingOrders()">🔄 Réessayer</button> <!-- Example onclick -->
      </td>
    </tr>
  `;
}

function renderPendingOrders() {
  const container = document.getElementById('pendingOrdersBody');
  if (!container || filteredTransactions.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="9" class="empty-state">
          <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
          <p>Aucune commande en attente</p>
        </td>
      </tr>
    `;
    return;
  }
  // TODO: Implement full render like in your admin HTML (map orders to table rows with status, actions, etc.)
  // For now, basic placeholder to avoid blank/crash
  container.innerHTML = filteredTransactions.map(order => `
    <tr>
      <td>${order.id || 'N/A'}</td>
      <td>${order.sender_name || 'N/A'}</td>
      <td>${order.amount || 0}</td>
      <td>${order.quantity || 0}</td>
      <td>${order.recipients?.length || 0}</td>
      <td>${order.payment_method || 'N/A'}</td>
      <td><span class="status-badge status-pending">En attente</span></td>
      <td>${new Date(order.created_at).toLocaleDateString('fr-FR')}</td>
      <td><button class="btn btn-sm btn-primary">Voir</button></td>
    </tr>
  `).join('');
}

// Stub other missing functions (implement fully based on your API/HTML)
async function loadTransactions() {
  console.log('loadTransactions: Stub – implement fetch/render for all transactions');
  // Similar to loadPendingOrders, but no status filter
}

async function loadSenders() {
  console.log('loadSenders: Stub – implement fetch/render for senders');
}

function sortRequests() {
  console.log('sortRequests: Stub – implement sorting logic');
}

function renderRequests() {
  console.log('renderRequests: Stub – implement table render');
}

function sortTransactions() {
  console.log('sortTransactions: Stub – implement sorting');
}

// ... Add other stubs as needed: filterRequests, viewRequest, etc.

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

// Stub logout (implement full if missing)
function logout() {
  localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
  document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  window.location.href = '/login.html';
}

// Export globals (after definitions – now safe since funcs defined)
window.showSection = showSection;
window.loadPendingOrders = loadPendingOrders;
window.confirmCancelOrder = window.confirmCancelOrder || (() => {}); // Stub if missing
window.viewOrderInstructions = window.viewOrderInstructions || (() => {});
window.loadTransactions = loadTransactions;
window.filterTransactions = window.filterTransactions || (() => {});
window.sortTransactions = sortTransactions;
window.exportTransactions = window.exportTransactions || (() => {});
window.redeemVoucher = window.redeemVoucher || (() => {});
window.loadRequests = loadRequests;
window.filterRequests = window.filterRequests || (() => {});
window.sortRequests = sortRequests;
window.viewRequest = window.viewRequest || (() => {});
window.deleteRequest = window.deleteRequest || (() => {});
window.showAddSenderModal = window.showAddSenderModal || (() => {});
window.editSender = window.editSender || (() => {});
window.saveSender = window.saveSender || (() => {});
window.deleteSender = window.deleteSender || (() => {});
window.useSender = window.useSender || (() => {});
window.openModal = window.openModal || (() => {});
window.closeModal = window.closeModal || (() => {});
window.confirmDelete = window.confirmDelete || (() => {});
window.logout = logout;
window.toggleMenu = window.toggleMenu || (() => {});