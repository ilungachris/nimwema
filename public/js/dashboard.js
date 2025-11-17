// Nimwema Platform - Dashboard JavaScript (Production)
// Integrates with server.js APIs: auth, orders, requests, senders, vouchers

// Config
// Config (Prod-only: Hardcode /api for Render proxy)
const CONFIG = {
    API_BASE: '/api', // Direct prod path (assumes Render static serve + backend proxy)
    REFRESH_INTERVAL: 30000,
    STORAGE_KEYS: { USER: 'nimwema_user', TOKEN: 'nimwema_token' }
};

// State
let currentUser = null;
let allRequests = [];
let filteredRequests = [];
let allSenders = [];
let allTransactions = []; // Vouchers + orders
let filteredTransactions = [];
let deleteTarget = null;
let refreshInterval = null;
let authChecked = false; // Anti-loop flag

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
  console.log('Dashboard init – checking auth...'); // Temp: Entry point
  if (await checkAuth()) {
    loadUserData();
    showSection('pending-orders'); // Default – now after auth
    startRefresh();
  }
});

// FIXED Auth Check (cookie + token fallback, no loop)
async function checkAuth() {
  if (authChecked) return true; // Prevent re-check on reloads
  authChecked = true;

  try {
    // Cookie first (primary)
    const sessionId = document.cookie.split('; ').find(row => row.startsWith('sessionId='));
    console.log('Auth: Cookie check', { hasSession: !!sessionId }); // Temp

    let headers = { credentials: 'include' };
    if (!sessionId) {
      // Fallback to token (from login/signup localStorage)
      const token = localStorage.getItem(CONFIG.STORAGE_KEYS.TOKEN);
      if (token) {
        headers = { ...headers, Authorization: `Bearer ${token}` };
        console.log('Auth: Token fallback'); // Temp
      } else {
        throw new Error('No auth');
      }
    }

    const response = await fetch(`${CONFIG.API_BASE}/auth/me`, headers);
    console.log('Auth API response', { status: response.status, ok: response.ok }); // Temp
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (!data.success || !data.user) throw new Error('Invalid user data');
    
    currentUser = data.user;
    const userNameEl = document.getElementById('userName');
    if (userNameEl) {
      userNameEl.textContent = currentUser.name || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.email || 'Utilisateur';
    }
    
    console.log('✅ Auth success:', currentUser); // Temp
    return true;
  } catch (error) {
    console.error('Auth error:', error); // Temp
    localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN); // Clear stale
    window.location.href = '/login.html'; // One-way redirect
    return false;
  }
}

// FIXED Show Section (null-check, log)
function showSection(sectionName) {
  console.log('showSection:', sectionName); // Temp: Called?
  // Update nav
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  event?.currentTarget?.classList.add('active');
  
  // Hide sections
  document.querySelectorAll('.dashboard-section').forEach(section => section.classList.remove('active'));
  
  // FIXED: Null-safe target
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
    console.log('Section shown:', sectionName); // Temp
  } else {
    console.error('Target section null:', sectionName); // Temp: Debug missing ID
  }
}

// [Rest of your pasted code unchanged: loadUserData, loadPendingOrders, createPendingOrderCard, etc. – all good, no errors there]
async function loadUserData() {
  if (!currentUser) return;
  
  // Parallel load all sections
  Promise.allSettled([
    loadPendingOrders(),
    loadTransactions(),
    loadRequests(),
    loadSenders()
  ]).then(results => {
    console.log('📊 Dashboard loaded:', results.map(r => r.status)); // Temp
  });
}

// ... (keep all other functions: confirmCancelOrder, loadTransactions, renderTransactions, etc. – paste confirms no changes needed)

// Refresh Handler (debounced)
function startRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(() => {
    if (document.querySelector('.dashboard-section.active')) {
      // Refresh active section only
      const activeId = document.querySelector('.dashboard-section.active').id;
      if (activeId.includes('pending')) loadPendingOrders();
      else if (activeId.includes('transactions')) loadTransactions();
      else if (activeId.includes('requests')) loadRequests();
      else if (activeId.includes('senders')) loadSenders();
    }
  }, CONFIG.REFRESH_INTERVAL);
}

// Export globals for onclick (unchanged)
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