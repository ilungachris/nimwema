

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