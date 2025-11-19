let CURRENT_USER = null;
let currentUserPromise = null;

async function fetchCurrentUser() {
  if (CURRENT_USER) return CURRENT_USER;
  if (currentUserPromise) return currentUserPromise;

  currentUserPromise = fetch('/api/auth/me', {
    credentials: 'include'
  }).then(async res => {
    if (!res.ok) {
      throw new Error('Not authenticated');
    }
    const data = await res.json();
    CURRENT_USER = data.user || data; // depending on your /api/auth/me format
    return CURRENT_USER;
  }).catch(err => {
    console.error('Failed to load current user:', err);
    CURRENT_USER = null;
    throw err;
  });

  return currentUserPromise;
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