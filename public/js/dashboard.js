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
let retryCount = 0; // NEW: Anti-loop guard (max 3 retries total)

// FIXED Initialize (await auth before any load) + logs
document.addEventListener('DOMContentLoaded', async function() {
  console.log('[TRACE] ENTER DOMContentLoaded - Dashboard init starting...');
  console.log('[TRACE] On load: Token present?', !!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN));
  console.log('[TRACE] On load: User present?', !!localStorage.getItem(CONFIG.STORAGE_KEYS.USER));
  console.log('[TRACE] On load: Session cookie?', !!document.cookie.match(/sessionId=/));

  if (await checkAuth()) {
    console.log('[TRACE] Auth SUCCESS - Loading user data & showing section');
    loadUserData();
    showSection('pending-orders');
    startRefresh();
  } else {
    console.log('[TRACE] Auth FAILED - Should have redirected in checkAuth');
  }
  console.log('[TRACE] EXIT DOMContentLoaded');
});

// FIXED Auth Check (log response, set currentUser safely) + deep logs
async function checkAuth() {
  console.log(`[TRACE] ENTER checkAuth - authChecked: ${authChecked}, retryCount: ${retryCount}`);
  if (authChecked) {
    console.log('[TRACE] checkAuth early return: Already checked');
    return true;
  }
  authChecked = true;
  retryCount++;

  try {
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    const sessionId = document.cookie.split('; ').find(row => row.startsWith('sessionId='));
    
    console.log('[TRACE] checkAuth values:', { token: !!token, userStr: !!userStr, sessionId: !!sessionId });

    if (!token && !sessionId && !userStr) {
      console.log('[TRACE] checkAuth: No creds at all - THROW No auth');
      throw new Error('No auth');
    }

    // NEW: Fallback to local user if no token/session (for offline-ish check)
    if (userStr && (!token || !sessionId)) {
      try {
        const localUser = JSON.parse(userStr);
        if (localUser.role === 'admin') {
          console.log('[TRACE] checkAuth: Using localStorage user fallback', { id: localUser.id, role: localUser.role });
          currentUser = localUser;
          // Still try API for freshness
        }
      } catch (parseErr) {
        console.error('[TRACE] checkAuth: Local user parse fail', parseErr);
      }
    }

    let headers = { credentials: 'include' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      console.log('[TRACE] checkAuth: Using Bearer token');
    } else {
      console.log('[TRACE] checkAuth: No token, relying on session/cookies');
    }

    console.log('[TRACE] checkAuth: Fetching /auth/me...');
    const response = await fetch(`${CONFIG.API_BASE}/auth/me`, { ...headers });
    console.log('[TRACE] checkAuth: Fetch response status', response.status);
    const data = await response.json();
    console.log('[TRACE] checkAuth: API data shape', { success: data.success, hasUser: !!data.user, userKeys: data.user ? Object.keys(data.user) : [] });
    
    if (!response.ok || !data.success || !data.user) {
      console.log('[TRACE] checkAuth: API fail - THROW');
      throw new Error(`Auth fail: ${response.status} - ${data.message || 'No user'}`);
    }
    
    currentUser = data.user;
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
      userNameEl.textContent = currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || 'Utilisateur';
      console.log('[TRACE] checkAuth: Set userName UI');
    }
    
    console.log('[TRACE] ✅ checkAuth SUCCESS - currentUser set:', { id: currentUser.id, phone: currentUser.phone, email: currentUser.email, role: currentUser.role });
    retryCount = 0; // Reset on success
    return true;
  } catch (error) {
    console.error('[TRACE] checkAuth CATCH ERROR:', { message: error.message, retryCount });
    if (retryCount > 3) {
      console.error('[TRACE] checkAuth: MAX RETRIES - Force redirect without cleanup');
      window.location.href = '/login.html';
      return false;
    }
    console.log('[TRACE] checkAuth: Cleaning token & redirecting...');
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    localStorage.removeItem(CONFIG.STORAGE_KEYS.USER); // NEW: Clean both
    document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'; // Clear session
    console.log('[TRACE] checkAuth: REDIRECT to /login.html');
    window.location.href = '/login.html';
    return false;
  } finally {
    console.log('[TRACE] EXIT checkAuth');
  }
}

// FIXED Show Section (guard currentUser, retry auth if null – prevent recursion loop on failure) + logs + debounce
function showSection(sectionName) {
  console.log(`[TRACE] ENTER showSection: section=${sectionName}, currentUser=${!!currentUser}, retryCount=${retryCount}`);
  
  // FIXED: Anti-loop – max retries, check if already redirecting
  if (!currentUser) {
    if (retryCount > 3) {
      console.error('[TRACE] showSection: MAX RETRY - Bailing, should redirect');
      return;
    }
    console.log('[TRACE] showSection: currentUser null – retrying auth...');
    checkAuth().then(authSuccess => {
      console.log('[TRACE] showSection retry: authSuccess=', authSuccess);
      if (authSuccess) {
        showSection(sectionName); // Only recurse if success
      } // Else: Already redirected in checkAuth
    }).catch(err => {
      console.error('[TRACE] showSection retry CATCH:', err);
    });
    console.log('[TRACE] showSection: EXIT early (retrying)');
    return;
  }

  console.log('[TRACE] showSection: Auth good – switching sections');
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  event?.currentTarget?.classList.add('active');
  
  document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
  
  let targetSection;
  switch (sectionName) {
    case 'pending-orders':
      console.log('[TRACE] showSection: Loading pending-orders');
      targetSection = document.getElementById('pendingOrdersSection');
      if (targetSection) loadPendingOrders();
      break;
    case 'transactions':
      console.log('[TRACE] showSection: Loading transactions');
      targetSection = document.getElementById('transactionsSection');
      if (targetSection) loadTransactions();
      break;
    case 'requests':
      console.log('[TRACE] showSection: Loading requests');
      targetSection = document.getElementById('requestsSection');
      if (targetSection) loadRequests();
      break;
    case 'senders':
      console.log('[TRACE] showSection: Loading senders');
      targetSection = document.getElementById('sendersSection');
      if (targetSection) loadSenders();
      break;
    default:
      console.log('[TRACE] showSection: Unknown section, EXIT');
      return;
  }
  
  if (targetSection) {
    targetSection.classList.add('active');
    console.log('[TRACE] showSection: Activated section');
  }
  console.log('[TRACE] EXIT showSection');
}

// FIXED loadRequests + logs (example; apply similar to others)
async function loadRequests() {
  console.log('[TRACE] ENTER loadRequests');
  const container = document.getElementById('requestsList');
  if (!container) {
    console.error('[TRACE] loadRequests: No container - EXIT');
    return;
  }
  
  console.log('[TRACE] loadRequests: Showing loading');
  showLoading(container);
  
  if (!currentUser) {
    console.error('[TRACE] loadRequests: No currentUser – retry auth');
    checkAuth().then(() => loadRequests());
    return;
  }
  
  const userIdentifier = currentUser.phone || currentUser.email || currentUser.id;
  console.log('[TRACE] loadRequests: Identifier=', userIdentifier);
  if (!userIdentifier) {
    console.error('[TRACE] loadRequests: No identifier - Error state');
    container.innerHTML = getErrorState('Erreur utilisateur', 'Recharger la page');
    return;
  }
  
  try {
    const params = new URLSearchParams();
    if (currentUser.phone || currentUser.email) params.append('phone', currentUser.phone || currentUser.email);
    else params.append('userId', currentUser.id);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    console.log('[TRACE] loadRequests: Fetching /requests' + queryString);
    
    const response = await fetch(`${CONFIG.API_BASE}/requests${queryString}`, { credentials: 'include' });
    console.log('[TRACE] loadRequests: Response status', response.status);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    console.log('[TRACE] loadRequests: Data shape', { requestsCount: (data.requests || data)?.length });
    const requests = data.requests || data;
    allRequests = requests;
    filteredRequests = [...allRequests];
    
    console.log('[TRACE] 📋 Requests loaded:', allRequests.length);
    sortRequests();
    renderRequests();
  } catch (error) {
    console.error('[TRACE] loadRequests CATCH:', error);
    container.innerHTML = getErrorState('Erreur lors du chargement des demandes', 'Réessayer');
  } finally {
    console.log('[TRACE] loadRequests: Hiding loading');
    hideLoading(container);
    console.log('[TRACE] EXIT loadRequests');
  }
}

// NEW: loadPendingOrders with logs (full impl from prior, + traces)
async function loadPendingOrders() {
  console.log('[TRACE] ENTER loadPendingOrders');
  const container = document.getElementById('pendingOrdersBody');
  if (!container) {
    console.error('[TRACE] loadPendingOrders: No container - EXIT');
    return;
  }

  console.log('[TRACE] loadPendingOrders: Showing loading');
  showLoading(container);

  if (!currentUser) {
    console.error('[TRACE] loadPendingOrders: No currentUser – retry auth');
    checkAuth().then(() => loadPendingOrders());
    return;
  }

  const userIdentifier = currentUser.phone || currentUser.email || currentUser.id;
  console.log('[TRACE] loadPendingOrders: Identifier=', userIdentifier);

  if (!userIdentifier) {
    console.error('[TRACE] loadPendingOrders: No identifier - Error state');
    container.innerHTML = getErrorState('Erreur utilisateur', 'Recharger la page');
    return;
  }

  try {
    const params = new URLSearchParams({ status: 'pending_approval' });
    if (userIdentifier) params.append('phone', userIdentifier); // Or 'userId'
    console.log('[TRACE] loadPendingOrders: Fetching /orders?' + params.toString());
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    const response = await fetch(`${CONFIG.API_BASE}/orders?${params.toString()}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    console.log('[TRACE] loadPendingOrders: Response status', response.status);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);

    const data = await response.json();
    console.log('[TRACE] loadPendingOrders: Data shape', { ordersCount: (data.orders || data)?.length });
    const orders = data.orders || data;
    allTransactions = orders; // Reuse or new
    filteredTransactions = [...allTransactions];

    console.log('[TRACE] 📦 Pending orders loaded:', allTransactions.length);
    sortTransactions();
    renderPendingOrders();
  } catch (error) {
    console.error('[TRACE] loadPendingOrders CATCH:', error);
    container.innerHTML = getErrorState('Erreur lors du chargement des commandes en attente', 'Réessayer');
  } finally {
    console.log('[TRACE] loadPendingOrders: Hiding loading');
    hideLoading(container);
    console.log('[TRACE] EXIT loadPendingOrders');
  }
}

// Stubs with minimal logs (expand as needed)
function showLoading(container) {
  console.log('[TRACE] showLoading: Setting loading UI');
  container.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">⏳ Chargement...</td></tr>';
}

function hideLoading() {
  console.log('[TRACE] hideLoading: (noop - render handles)');
}

function getErrorState(title, action) {
  console.log('[TRACE] getErrorState: Generating error HTML');
  return `<tr><td colspan="9" class="empty-state" style="text-align: center; padding: 60px 20px; color: #999;"><div style="font-size: 48px; margin-bottom: 16px;">⚠️</div><p style="font-weight: 600; color: #dc3545;">${title}</p><p>${action}</p><button class="btn btn-secondary" onclick="loadPendingOrders()">🔄 Réessayer</button></td></tr>`;
}

function renderPendingOrders() {
  console.log('[TRACE] renderPendingOrders: Rendering', filteredTransactions.length, 'items');
  const container = document.getElementById('pendingOrdersBody');
  if (!container) return;
  if (filteredTransactions.length === 0) {
    container.innerHTML = `<tr><td colspan="9" class="empty-state"><div style="font-size: 48px; margin-bottom: 16px;">✅</div><p>Aucune commande en attente</p></td></tr>`;
    return;
  }
  // Full render from your HTML (approve/reject/view buttons, etc.)
  container.innerHTML = filteredTransactions.map(order => {
    const recipientsCount = order.recipients ? order.recipients.length : order.quantity;
    const paymentMethodLabel = getPaymentMethodLabel(order.payment_method);
    const statusLabel = getStatusLabel(order.status, order.payment_status);
    return `
      <tr>
        <td><strong>${order.id}</strong></td>
        <td>${order.sender_name || 'N/A'}<br><small style="color: #666;">${order.sender_phone || ''}</small></td>
        <td><strong>${formatAmount(order.amount)} ${order.currency}</strong></td>
        <td>${order.quantity} bon(s)</td>
        <td>${recipientsCount} personne(s)</td>
        <td><span class="status-badge status-pending">${paymentMethodLabel}</span></td>
        <td><span class="status-badge ${getStatusClass(order.status)}">${statusLabel}</span></td>
        <td>${formatDate(order.created_at)}</td>
        <td>
          <div class="action-buttons">
            <button class="btn btn-success btn-sm" onclick="approveOrder('${order.id}')">✅ Approuver</button>
            <button class="btn btn-danger btn-sm" onclick="rejectOrder('${order.id}')">❌ Rejeter</button>
            <button class="btn btn-secondary btn-sm" onclick="viewOrderDetails('${order.id}')">👁️ Voir</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  console.log('[TRACE] renderPendingOrders: Done');
}

// Add stubs for missing (with logs)
async function loadTransactions() { console.log('[TRACE] loadTransactions: Stub - Implement'); }
async function loadSenders() { console.log('[TRACE] loadSenders: Stub - Implement'); }
function sortRequests() { console.log('[TRACE] sortRequests: Stub'); }
function renderRequests() { console.log('[TRACE] renderRequests: Stub'); }
function sortTransactions() { console.log('[TRACE] sortTransactions: Stub'); }

// Utilities from HTML (add logs if called)
function getPaymentMethodLabel(method) { return { cash: '💵 Cash / WU', bank: '🏦 Virement Bancaire', flexpay: '📱 FlexPay Mobile', flexpaycard: '💳 FlexPay Carte' }[method] || method; }
function getStatusLabel(status, paymentStatus) {
  if (status === 'pending_payment') return 'En attente de paiement';
  if (status === 'pending_approval') return 'En attente d\'approbation';
  if (status === 'sent') return 'Envoyé';
  if (status === 'paid') return 'Payé';
  if (status === 'cancelled') return 'Annulé';
  return status;
}
function getStatusClass(status) {
  if (status === 'pending_payment' || status === 'pending_approval' || status === 'pending') return 'status-pending';
  if (status === 'paid' || status === 'sent') return 'status-paid';
  if (status === 'cancelled' || status === 'failed') return 'status-failed';
  return 'status-pending';
}
function formatAmount(amount) { return parseFloat(amount).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function formatDate(dateString) { return new Date(dateString).toLocaleDateString('fr-FR'); }

// Stubs for actions (logs + fetch; expand)
async function approveOrder(orderId) {
  console.log('[TRACE] approveOrder:', orderId);
  if (!confirm('Confirmer?')) return;
  try {
    const response = await fetch(`/api/admin/orders/${orderId}/approve`, { method: 'POST', credentials: 'include' });
    const data = await response.json();
    if (data.success) { alert('✅ Apprové'); loadPendingOrders(); } else alert('❌ ' + data.message);
  } catch (err) { console.error('[TRACE] approveOrder error:', err); alert('Erreur'); }
}

async function rejectOrder(orderId) {
  console.log('[TRACE] rejectOrder:', orderId);
  const reason = prompt('Raison?');
  if (!reason) return;
  try {
    const response = await fetch(`/api/admin/orders/${orderId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    const data = await response.json();
    if (data.success) { alert('✅ Rejeté'); loadPendingOrders(); } else alert('❌ ' + data.message);
  } catch (err) { console.error('[TRACE] rejectOrder error:', err); alert('Erreur'); }
}

async function viewOrderDetails(orderId) {
  console.log('[TRACE] viewOrderDetails:', orderId);
  // Fetch & populate modal as in old inline
  const modal = document.getElementById('orderModal');
  modal.style.display = 'flex'; // Temp placeholder
  // Full impl: fetch, set innerHTML
}

function closeOrderModal() {
  console.log('[TRACE] closeOrderModal');
  document.getElementById('orderModal').style.display = 'none';
}

async function loadUserData() {
  console.log('[TRACE] ENTER loadUserData');
  if (!currentUser) {
    console.log('[TRACE] loadUserData: No user - EXIT');
    return;
  }
  
  Promise.allSettled([
    loadPendingOrders(),
    loadTransactions(),
    loadRequests(),
    loadSenders()
  ]).then(results => {
    console.log('[TRACE] loadUserData: All settled', results.map(r => ({ status: r.status, reason: r.reason?.message })));
    console.log('Dashboard loaded');
  });
  console.log('[TRACE] EXIT loadUserData');
}

function startRefresh() {
  console.log('[TRACE] startRefresh: Setting interval');
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (document.querySelector('.dashboard-section.active')) {
      const activeId = document.querySelector('.dashboard-section.active').id;
      console.log('[TRACE] startRefresh: Active section', activeId);
      if (activeId.includes('pending')) loadPendingOrders();
      else if (activeId.includes('transactions')) loadTransactions();
      else if (activeId.includes('requests')) loadRequests();
      else if (activeId.includes('senders')) loadSenders();
    }
  }, CONFIG.REFRESH_INTERVAL);
}

function logout() {
  console.log('[TRACE] logout: Clearing all');
  localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
  localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
  document.cookie = 'sessionId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  window.location.href = '/login.html';
}

// Export globals (safe now)
window.showSection = showSection;
window.loadPendingOrders = loadPendingOrders;
window.approveOrder = approveOrder;
window.rejectOrder = rejectOrder;
window.viewOrderDetails = viewOrderDetails;
window.closeOrderModal = closeOrderModal;
window.logout = logout;
// ... (add others as needed)

// Export globals (after definitions – now safe since funcs defined)
 
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
 
window.toggleMenu = window.toggleMenu || (() => {});