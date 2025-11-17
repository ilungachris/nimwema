// Nimwema Platform - Dashboard JavaScript (Production)
// Integrates with server.js APIs: auth, orders, requests, senders, vouchers

// Config (Prod-only)
const CONFIG = {
    API_BASE: '/api', // Render proxy
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
let authChecked = false; // Anti-loop

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
  console.log('Dashboard init – checking auth...'); // Temp
  if (await checkAuth()) {
    loadUserData();
    showSection('pending-orders');
    startRefresh();
  }
});

// FIXED Auth Check (token Bearer first, cookie fallback, detailed logs, no loop)
async function checkAuth() {
  if (authChecked) return true;
  authChecked = true;

  try {
    // Token first (from login localStorage)
    const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
    const sessionId = document.cookie.split('; ').find(row => row.startsWith('sessionId='));
    console.log('Auth: Checks', { hasToken: !!token, hasSession: !!sessionId }); // Temp

    let headers = { credentials: 'include' }; // Cookie always
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      console.log('Auth: Using token Bearer'); // Temp
    } else if (!sessionId) {
      throw new Error('No auth');
    }

    const response = await fetch(`${CONFIG.API_BASE}/auth/me`, headers);
    console.log('Auth API:', { status: response.status, ok: response.ok, url: `${CONFIG.API_BASE}/auth/me` }); // Temp: Pinpoint fail

    if (!response.ok) throw new Error(`HTTP ${response.status} – ${response.statusText}`);

    const data = await response.json();
    if (!data.success || !data.user) throw new Error('Invalid user data');

    currentUser = data.user;
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
      userNameEl.textContent = currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || 'Utilisateur';
    }

    console.log('✅ Auth success:', { userId: currentUser.id }); // Temp
    return true;
  } catch (error) {
    console.error('Auth error details:', { message: error.message, token: !!localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN), session: !!document.cookie.match(/sessionId=/) }); // Temp: Debug
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN); // Clear stale
    window.location.href = '/login.html'; // One-way
    return false;
  }
}

// FIXED Show Section (null-check)
function showSection(sectionName) {
  console.log('showSection:', sectionName); // Temp
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
      console.warn('Unknown section:', sectionName); // Temp
      return;
  }
  
  if (targetSection) {
    targetSection.classList.add('active');
    console.log('Section active:', sectionName); // Temp
  } else {
    console.error('Section null:', sectionName); // Temp
  }
}

// [Keep all other functions unchanged: loadUserData, loadPendingOrders, etc. – they're solid]

async function loadUserData() {
  if (!currentUser) return;
  
  Promise.allSettled([
    loadPendingOrders(),
    loadTransactions(),
    loadRequests(),
    loadSenders()
  ]).then(results => {
    console.log('Dashboard loaded:', results.map(r => r.status)); // Temp
  });
}

// [Rest unchanged: createPendingOrderCard, loadTransactions, etc. – no edits needed]

// Refresh (unchanged)
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

// Export globals (unchanged)
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