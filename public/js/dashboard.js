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

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
  if (await checkAuth()) {
    loadUserData();
    showSection('pending-orders');
    startRefresh();
  }
});

// FIXED Auth Check (persistent token read, retry for cookie race, no loop)
async function checkAuth(retry = true) {
  if (authChecked) return true;
  authChecked = true;

  try {
    // Persistent token from localStorage (survives reload)
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
    // Retry once (3s for cookie set post-login)
    if (retry && error.message === 'No auth') {
      console.log('Auth retry in 3s...'); // Temp
      setTimeout(() => checkAuth(false), 3000);
      return false; // Hold page during retry
    }

    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
    window.location.href = '/login.html';
    return false;
  }
}

// FIXED Show Section (null-check)
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

// [Keep all other functions unchanged: loadUserData, loadPendingOrders, createPendingOrderCard, loadTransactions, etc.]

async function loadUserData() {
  if (!currentUser) return;
  
  Promise.allSettled([
    loadPendingOrders(),
    loadTransactions(),
    loadRequests(),
    loadSenders()
  ]).then(results => {
    console.log('Dashboard loaded'); // Prod log
  });
}

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