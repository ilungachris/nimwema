// Nimwema Platform - Main JavaScript

// Toggle mobile menu
function toggleMenu() {
  const hamburger = document.querySelector('.hamburger');
  const menu = document.querySelector('.mobile-menu');
  
  hamburger.classList.toggle('active');
  
  if (menu) {
    menu.classList.toggle('visible');
  } else {
    // Create mobile menu if it doesn't exist
    createMobileMenu();
  }
}

// Create mobile menu
function createMobileMenu() {
  const menu = document.createElement('div');
  menu.className = 'mobile-menu visible';
  menu.innerHTML = `
    <nav class="mobile-nav">
      <a href="/" data-i18n="home">Accueil</a>
      <a href="/send.html" data-i18n="send_voucher">Envoyer un bon</a>
      <a href="/request.html" data-i18n="request_voucher">Demander un bon</a>
      <a href="/how-it-works.html" data-i18n="how_it_works">Comment ça marche</a>
      <a href="/about.html" data-i18n="about">À propos</a>
      <a href="/contact.html" data-i18n="contact">Contact</a>
      <a href="/login.html" data-i18n="login">Connexion</a>
    </nav>
  `;
  
  document.body.appendChild(menu);
  
  // Add styles for mobile menu
  const style = document.createElement('style');
  style.textContent = `
    .mobile-menu {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--white);
      z-index: 999;
      display: none;
      padding: var(--space-xl);
      padding-top: 80px;
    }
    
    .mobile-menu.visible {
      display: block;
    }
    
    .mobile-nav {
      display: flex;
      flex-direction: column;
      gap: var(--space-lg);
    }
    
    .mobile-nav a {
      font-size: 18px;
      font-weight: 600;
      color: var(--ink-black);
      text-decoration: none;
      padding: var(--space-md);
      border-bottom: 1px solid var(--grey-200);
    }
    
    .mobile-nav a:hover {
      color: var(--primary-green);
    }
    
    .hamburger.active span:nth-child(1) {
      transform: rotate(45deg) translate(5px, 5px);
    }
    
    .hamburger.active span:nth-child(2) {
      opacity: 0;
    }
    
    .hamburger.active span:nth-child(3) {
      transform: rotate(-45deg) translate(7px, -7px);
    }
  `;
  document.head.appendChild(style);
}

// Load merchants from API
async function loadMerchants() {
  try {
    const response = await fetch('/api/merchants');
    const merchants = await response.json();
    
    const grid = document.getElementById('merchantsGrid');
    if (grid && merchants.length > 0) {
      grid.innerHTML = merchants.map(merchant => `
        <div class="merchant-card">
          <img src="${merchant.logo || 'https://via.placeholder.com/80x80/8BC34A/111111?text=' + merchant.name.charAt(0)}" 
               alt="${merchant.name}" 
               class="merchant-logo">
          <div class="merchant-name">${merchant.name}</div>
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading merchants:', error);
  }
}

// Format currency (Congolese Franc)
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-CD', {
    style: 'currency',
    currency: 'CDF',
    minimumFractionDigits: 0
  }).format(amount);
}

// Format phone number
function formatPhoneNumber(phone) {
  // Check if phone is null or undefined
  if (!phone) {
    return '';
  }
  
  // Convert to string if not already
  phone = String(phone);
  
  // Remove all non-digit characters
  phone = phone.replace(/\D/g, '');
  
  // Add +243 if not present
  if (!phone.startsWith('243')) {
    phone = '243' + phone;
  }
  
  return '+' + phone;
}

// Validate phone number
function validatePhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 9 && cleaned.length <= 13;
}

// Show notification
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .notification {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 24px;
      border-radius: var(--radius-input);
      background: var(--white);
      box-shadow: var(--shadow-hover);
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
      max-width: 400px;
    }
    
    .notification-success {
      border-left: 4px solid var(--success);
    }
    
    .notification-error {
      border-left: 4px solid var(--error);
    }
    
    .notification-warning {
      border-left: 4px solid var(--warning);
    }
    
    .notification-info {
      border-left: 4px solid var(--info);
    }
    
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
  `;
  
  if (!document.querySelector('style[data-notification-styles]')) {
    style.setAttribute('data-notification-styles', 'true');
    document.head.appendChild(style);
  }
  
  document.body.appendChild(notification);
  
  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideIn 0.3s ease-out reverse';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// API Helper functions
const API = {
  async get(endpoint) {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  
  async post(endpoint, data) {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  
  async put(endpoint, data) {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  },
  
  async delete(endpoint) {
    const response = await fetch(endpoint, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('API request failed');
    return response.json();
  }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  // Load merchants if on homepage
  if (document.getElementById('merchantsGrid')) {
    loadMerchants();
  }
  
  // Setup form handlers
  setupFormHandlers();
});

// Setup form handlers
function setupFormHandlers() {
  // Send voucher form
  
  // Request voucher form
  const requestForm = document.getElementById('requestVoucherForm');
  if (requestForm) {
    requestForm.addEventListener('submit', handleRequestVoucher);
  }
  
  // Login form
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }
}

// Handle send voucher
// async function handleSendVoucher(e) {
//   e.preventDefault();
//   
//   const formData = new FormData(e.target);
//   const data = {
//     amount: formData.get('amount'),
//     quantity: formData.get('quantity'),
//     recipient_phone: formatPhoneNumber(formData.get('recipient_phone')),
//     sender_name: formData.get('sender_name'),
//     message: formData.get('message'),
//     hide_identity: formData.get('hide_identity') === 'on',
//     cover_fees: formData.get('cover_fees') === 'on'
//   };
//   
//   try {
//     const result = await API.post('/api/vouchers/send', data);
//     showNotification(window.i18n.t('success_send'), 'success');
//     e.target.reset();
//     
//     // Redirect to success page or dashboard
//     setTimeout(() => {
//       window.location.href = '/dashboard.html';
//     }, 2000);
//   } catch (error) {
//     showNotification(window.i18n.t('error_generic'), 'error');
//   }
// }

// Handle request voucher
async function handleRequestVoucher(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    amount: formData.get('amount'),
    requester_name: formData.get('requester_name'),
    requester_phone: formatPhoneNumber(formData.get('requester_phone')),
    request_type: formData.get('request_type'),
    target_phone: formData.get('target_phone') ? formatPhoneNumber(formData.get('target_phone')) : null,
    message: formData.get('message')
  };
  
  try {
    const result = await API.post('/api/vouchers/request', data);
    showNotification(window.i18n.t('success_request'), 'success');
    e.target.reset();
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 2000);
  } catch (error) {
    showNotification(window.i18n.t('error_generic'), 'error');
  }
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = {
    phone: formatPhoneNumber(formData.get('phone')),
    password: formData.get('password')
  };
  
  try {
    const result = await API.post('/api/auth/login', data);
    showNotification('Login successful!', 'success');
    
    // Store session and redirect
    localStorage.setItem('nimwema_user', JSON.stringify(result.user));
    setTimeout(() => {
      window.location.href = '/dashboard.html';
    }, 1000);
  } catch (error) {
    showNotification('Invalid credentials', 'error');
  }
}

// Check if user is logged in
function isLoggedIn() {
  return localStorage.getItem('nimwema_user') !== null;
}

// Get current user
function getCurrentUser() {
  const userStr = localStorage.getItem('nimwema_user');
  return userStr ? JSON.parse(userStr) : null;
}

// Logout
function logout() {
  localStorage.removeItem('nimwema_user');
  window.location.href = '/';
}

// Export functions for use in other scripts
window.Nimwema = {
  formatCurrency,
  formatPhoneNumber,
  validatePhoneNumber,
  showNotification,
  API,
  isLoggedIn,
  getCurrentUser,
  logout
};
// Load merchants from API
async function loadMerchants() {
    try {
        const response = await fetch('/api/merchants/approved');
        if (response.ok) {
            const merchants = await response.json();
            const merchantsGrid = document.getElementById('merchantsGrid');
            
            if (merchants.length > 0) {
                merchantsGrid.innerHTML = merchants.map(merchant => `
                    <div class="merchant-card">
                        <img src="${merchant.logo || generateMerchantLogo(merchant.businessName)}" 
                             alt="${merchant.businessName}" 
                             class="merchant-logo"
                             onerror="this.src='${generateMerchantLogo(merchant.businessName)}'">
                        <div class="merchant-name">${merchant.businessName}</div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading merchants:', error);
    }
}

// Generate SVG logo for merchant
function generateMerchantLogo(name) {
    const initials = name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect fill='%238BC34A' width='80' height='80'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='24' fill='%23111111'%3E${initials}%3C/text%3E%3C/svg%3E`;
}

// Load merchants on page load
if (document.getElementById('merchantsGrid')) {
    loadMerchants();
}

