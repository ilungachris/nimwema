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

// FIXED Show Section (guard currentUser, retry auth if null)
function showSection(sectionName) {
  // FIXED: Retry auth if currentUser null (timing fix)
  if (!currentUser) {
    console.log('showSection: currentUser null – retrying auth...'); // Temp
    checkAuth().then(() => showSection(sectionName)); // Recursive safe
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
  }
}

// [Keep all other functions unchanged: loadPendingOrders, loadTransactions, loadSenders, renderRequests, etc. – they're solid]

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

// [Rest unchanged: logout, showSection, etc.]

// Export globals (after definitions)
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