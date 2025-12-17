/**
 * Nimwema Layout System v1.0
 * 
 * Single source of truth for header, footer, sidebar, and mobile navigation.
 * Designed for easy migration to mobile apps (React Native, Flutter).
 * 
 * Usage:
 *   <div id="app-header"></div>
 *   <div id="app-mobile-nav"></div>
 *   <!-- your page content -->
 *   <div id="app-footer"></div>
 *   
 *   <script src="/js/layout.js"></script>
 *   <script>
 *     NimwemaLayout.init({ 
 *       sidebar: 'user',        // 'user', 'admin', 'merchant', or null
 *       activePage: 'dashboard' // Current page identifier
 *     });
 *   </script>
 */

(function() {
    'use strict';

    // ============================================
    // CONFIGURATION
    // ============================================
    
    const CONFIG = {
        STORAGE_KEYS: {
            USER: 'nimwema_user',
            TOKEN: 'nimwema_token',
            LANG: 'nimwema_lang'
        },
        DEFAULT_LANG: 'fr',
        COPYRIGHT_YEAR: new Date().getFullYear()
    };

    // ============================================
    // STATE
    // ============================================
    
    let mobileMenuOpen = false;
    let currentOptions = {};

    // ============================================
    // AUTH HELPERS
    // ============================================

    function getCurrentUser() {
        const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        if (userStr) {
            try {
                return JSON.parse(userStr);
            } catch (e) {
                console.error('[Layout] Error parsing user data:', e);
                return null;
            }
        }
        return null;
    }

    function isAuthenticated() {
        return getCurrentUser() !== null;
    }

    function logout() {
        // Call API logout
        fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        }).catch(err => console.warn('[Layout] Logout API error:', err));
        
        // Clear local storage
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.TOKEN);
        localStorage.removeItem('nimwema_guest');
        
        // Redirect to login
        window.location.href = '/login.html';
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

    function getCurrentLang() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.LANG) || CONFIG.DEFAULT_LANG;
    }

    // ============================================
    // HEADER COMPONENT
    // ============================================

    function renderHeader() {
        const container = document.getElementById('app-header');
        if (!container) return;

        const user = getCurrentUser();
        const isLoggedIn = user !== null;
        const displayName = user?.name || user?.email || 'Utilisateur';
        const currentLang = getCurrentLang();

        container.innerHTML = `
            <header class="header">
                <!-- Top Bar: Language Selector + Login/User -->
                <div class="header-top">
                    <div class="language-selector">
                        <button class="lang-btn ${currentLang === 'fr' ? 'active' : ''}" data-lang="fr" onclick="NimwemaLayout.setLanguage('fr')">FR</button>
                        <button class="lang-btn ${currentLang === 'ln' ? 'active' : ''}" data-lang="ln" onclick="NimwemaLayout.setLanguage('ln')">LN</button>
                        <button class="lang-btn ${currentLang === 'en' ? 'active' : ''}" data-lang="en" onclick="NimwemaLayout.setLanguage('en')">EN</button>
                    </div>
                    
                    ${isLoggedIn ? `
                        <!-- User Menu (logged in) -->
                        <div class="user-menu">
                            <span class="user-name" id="userName">${escapeHTML(displayName)}</span>
                            <button class="btn-logout" onclick="NimwemaLayout.logout()" data-i18n="logout">Déconnexion</button>
                        </div>
                    ` : `
                        <!-- Login Button (logged out) -->
                        <button class="login-btn" onclick="window.location.href='/login.html'">
                            <span data-i18n="login">Connexion</span> / <span data-i18n="welcome">Bienvenue</span>
                        </button>
                    `}
                </div>
                
                <!-- Main Header: Logo + Hamburger -->
                <div class="header-main">
                    <a href="/" class="logo">
                        NIM<span class="w">W</span>EMA
                    </a>
                    <button class="hamburger" id="hamburgerBtn" onclick="NimwemaLayout.toggleMobileMenu()" aria-label="Menu">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </header>
        `;
    }

    // ============================================
    // FOOTER COMPONENT
    // ============================================

    function renderFooter() {
        const container = document.getElementById('app-footer');
        if (!container) return;

        const isMinimal = currentOptions.sidebar !== null && currentOptions.sidebar !== undefined;
        const year = CONFIG.COPYRIGHT_YEAR;

        if (isMinimal) {
            // Minimal footer for dashboard pages
            container.innerHTML = `
                <footer class="footer footer-minimal">
                    <div class="container">
                        <div class="footer-bottom">
                            <p>&copy; ${year} Nimwema. <span data-i18n="all_rights">Tous droits réservés.</span></p>
                        </div>
                    </div>
                </footer>
            `;
        } else {
            // Full footer for public pages
            container.innerHTML = `
                <footer class="footer">
                    <div class="container">
                        <div class="footer-content">
                            <div class="footer-section">
                                <h4>Nimwema</h4>
                                <p class="text-small">La solidarité africaine, rendue simple.</p>
                            </div>
                            <div class="footer-section">
                                <h4 data-i18n="quick_links">Liens Rapides</h4>
                                <ul class="footer-links">
                                    <li><a href="/send.html" data-i18n="send_voucher">Envoyer un bon</a></li>
                                    <li><a href="/request.html" data-i18n="request_voucher">Demander un bon</a></li>
                                    <li><a href="/how-it-works.html" data-i18n="how_it_works">Comment ça marche</a></li>
                                    <li><a href="/about.html" data-i18n="about">À propos</a></li>
                                </ul>
                            </div>
                            <div class="footer-section">
                                <h4 data-i18n="support">Support</h4>
                                <ul class="footer-links">
                                    <li><a href="/contact.html" data-i18n="contact">Contact</a></li>
                                    <li><a href="/terms.html" data-i18n="terms">Termes et Conditions</a></li>
                                    <li><a href="/privacy.html" data-i18n="privacy">Politique de Confidentialité</a></li>
                                </ul>
                            </div>
                            <div class="footer-section">
                                <h4 data-i18n="contact">Contact</h4>
                                <p class="text-small">
                                    Email: info@nimwema.com<br>
                                    Kinshasa, RDC
                                </p>
                            </div>
                        </div>
                        <div class="footer-bottom">
                            <p>&copy; ${year} Nimwema. <span data-i18n="all_rights">Tous droits réservés.</span></p>
                        </div>
                    </div>
                </footer>
            `;
        }
    }

    // ============================================
    // MOBILE NAVIGATION COMPONENT
    // ============================================

    function renderMobileNav() {
        const container = document.getElementById('app-mobile-nav');
        if (!container) return;

        const user = getCurrentUser();
        const isLoggedIn = user !== null;
        const activePage = currentOptions.activePage || '';

        // Build account section based on login state
        let accountSection = '';
        if (isLoggedIn) {
            accountSection = `
                <div class="mobile-nav-divider"></div>
                <p class="mobile-nav-section-title">Mon Compte</p>
                <ul class="mobile-nav-links">
                    <li><a href="/dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">📊 Tableau de Bord</a></li>
                    <li><a href="/payment-instructions.html" class="${activePage === 'payment-instructions' ? 'active' : ''}">💳 Instructions de Paiement</a></li>
                </ul>
            `;
        } else {
            accountSection = `
                <div class="mobile-nav-divider"></div>
                <div class="mobile-nav-footer">
                    <a href="/login.html" class="btn btn-primary" style="width:100%; text-align:center;">Connexion</a>
                </div>
            `;
        }

        container.innerHTML = `
            <!-- Mobile Navigation Overlay -->
            <div class="mobile-nav-overlay" id="mobileNavOverlay" onclick="NimwemaLayout.closeMobileMenu()"></div>
            
            <!-- Mobile Navigation Menu -->
            <nav class="mobile-nav" id="mobileNav">
                <div class="mobile-nav-header">
                    <a href="/" class="logo">NIM<span class="w">W</span>EMA</a>
                    <button class="mobile-nav-close" onclick="NimwemaLayout.closeMobileMenu()" aria-label="Fermer">&times;</button>
                </div>
                <ul class="mobile-nav-links">
                    <li><a href="/" class="${activePage === 'home' ? 'active' : ''}"> <span data-i18n="home">Accueil</span></a></li>
                    <li><a href="/send.html" class="${activePage === 'send' ? 'active' : ''}"> <span data-i18n="send_voucher">Envoyer un bon</span></a></li>
                    <li><a href="/request.html" class="${activePage === 'request' ? 'active' : ''}"> <span data-i18n="request_voucher">Demander un bon</span></a></li>
                    <li><a href="/how-it-works.html" class="${activePage === 'how-it-works' ? 'active' : ''}"> <span data-i18n="how_it_works">Comment ça marche</span></a></li>
                    <li><a href="/about.html" class="${activePage === 'about' ? 'active' : ''}"> <span data-i18n="about">À propos</span></a></li>
                    <li><a href="/contact.html" class="${activePage === 'contact' ? 'active' : ''}"> <span data-i18n="contact">Contact</span></a></li>
                </ul>
                ${accountSection}
            </nav>
        `;
    }

    // ============================================
    // SIDEBAR COMPONENTS
    // ============================================

    function renderSidebar() {
        const container = document.getElementById('app-sidebar');
        if (!container || !currentOptions.sidebar) return;

        switch (currentOptions.sidebar) {
            case 'user':
                renderUserSidebar(container);
                break;
            case 'admin':
                renderAdminSidebar(container);
                break;
            case 'merchant':
                renderMerchantSidebar(container);
                break;
            default:
                console.warn('[Layout] Unknown sidebar type:', currentOptions.sidebar);
        }
    }

    function renderUserSidebar(container) {
        const activePage = currentOptions.activePage || '';
        const activeSection = currentOptions.activeSection || 'home';
        const isDashboard = activePage === 'dashboard';

        container.innerHTML = `
            <aside class="dashboard-sidebar" id="dashboardSidebar">
                <nav class="dashboard-nav">
                    <!-- Home -->
                    <a href="${isDashboard ? '#home' : '/dashboard.html'}" 
                       class="nav-item ${activePage === 'dashboard' && activeSection === 'home' ? 'active' : ''}" 
                       ${isDashboard ? 'onclick="showSection(\'home\'); return false;"' : ''}>
                        <span class="nav-icon">🏠</span>
                        <span class="nav-text">Accueil</span>
                    </a>
                    
                    <!-- Sent Vouchers -->
                    <a href="${isDashboard ? '#sent-vouchers' : '/dashboard.html#sent-vouchers'}" 
                       class="nav-item ${activeSection === 'sent-vouchers' ? 'active' : ''}"
                       ${isDashboard ? 'onclick="showSection(\'sent-vouchers\'); return false;"' : ''}>
                        <span class="nav-icon">📤</span>
                        <span class="nav-text">Bons envoyés</span>
                    </a>
                    
                    <!-- Requested Vouchers -->
                    <a href="${isDashboard ? '#requested-vouchers' : '/dashboard.html#requested-vouchers'}" 
                       class="nav-item ${activeSection === 'requested-vouchers' ? 'active' : ''}"
                       ${isDashboard ? 'onclick="showSection(\'requested-vouchers\'); return false;"' : ''}>
                        <span class="nav-icon">📥</span>
                        <span class="nav-text">Bons demandés</span>
                    </a>
                    
                    <!-- Recipients -->
                    <a href="${isDashboard ? '#recipients' : '/dashboard.html#recipients'}" 
                       class="nav-item ${activeSection === 'recipients' ? 'active' : ''}"
                       ${isDashboard ? 'onclick="showSection(\'recipients\'); return false;"' : ''}>
                        <span class="nav-icon">👥</span>
                        <span class="nav-text">Mes Destinataires</span>
                    </a>
                    
                    <!-- Senders -->
                    <a href="${isDashboard ? '#senders' : '/dashboard.html#senders'}" 
                       class="nav-item ${activeSection === 'senders' ? 'active' : ''}"
                       ${isDashboard ? 'onclick="showSection(\'senders\'); return false;"' : ''}>
                        <span class="nav-icon">👤</span>
                        <span class="nav-text">Mes Expéditeurs</span>
                    </a>
                    
                    <!-- Payment Instructions -->
                    <a href="/payment-instructions.html" class="nav-item ${activePage === 'payment-instructions' ? 'active' : ''}">
                        <span class="nav-icon">💳</span>
                        <span class="nav-text">Instructions de Paiement</span>
                    </a>
                    
                    <!-- Divider -->
                    <div class="nav-divider"></div>
                    
                    <!-- CTAs -->
                    <a href="/send.html" class="nav-item nav-item-primary">
                        <span class="nav-icon">➕</span>
                        <span class="nav-text">Envoyer un bon</span>
                    </a>
                    
                    <a href="/request.html" class="nav-item nav-item-secondary">
                        <span class="nav-icon">📝</span>
                        <span class="nav-text">Demander un bon</span>
                    </a>
                </nav>
            </aside>
        `;
    }

    function renderAdminSidebar(container) {
        const activeSection = currentOptions.activeSection || 'overview';

        container.innerHTML = `
            <aside class="dashboard-sidebar" id="dashboardSidebar">
                <nav class="dashboard-nav">
                    <a class="nav-item ${activeSection === 'overview' ? 'active' : ''}" onclick="showSection('overview')">
                        <span class="nav-icon">📊</span>
                        <span class="nav-text">Vue d'ensemble</span>
                    </a>
                    <a class="nav-item ${activeSection === 'pending' ? 'active' : ''}" onclick="showSection('pending')">
                        <span class="nav-icon">⏳</span>
                        <span class="nav-text">Commandes en attente</span>
                        <span class="nav-badge" id="pendingBadge">0</span>
                    </a>
                    <a class="nav-item ${activeSection === 'merchants' ? 'active' : ''}" onclick="showSection('merchants')">
                        <span class="nav-icon">🏪</span>
                        <span class="nav-text">Commerçants</span>
                    </a>
                    <a class="nav-item ${activeSection === 'users' ? 'active' : ''}" onclick="showSection('users')">
                        <span class="nav-icon">👥</span>
                        <span class="nav-text">Utilisateurs</span>
                    </a>
                    <a class="nav-item ${activeSection === 'transactions' ? 'active' : ''}" onclick="showSection('transactions')">
                        <span class="nav-icon">💰</span>
                        <span class="nav-text">Transactions</span>
                    </a>
                    
                    <div class="nav-divider"></div>
                    
                    <a class="nav-item ${activeSection === 'settings' ? 'active' : ''}" onclick="showSection('settings')">
                        <span class="nav-icon">⚙️</span>
                        <span class="nav-text">Paramètres</span>
                    </a>
                </nav>
            </aside>
        `;
    }

    function renderMerchantSidebar(container) {
        const activeSection = currentOptions.activeSection || 'overview';

        container.innerHTML = `
            <aside class="dashboard-sidebar" id="dashboardSidebar">
                <nav class="dashboard-nav">
                    <a class="nav-item ${activeSection === 'overview' ? 'active' : ''}" onclick="showSection('overview')">
                        <span class="nav-icon">📊</span>
                        <span class="nav-text">Vue d'ensemble</span>
                    </a>
                    <a class="nav-item ${activeSection === 'redeem' ? 'active' : ''}" onclick="showSection('redeem')">
                        <span class="nav-icon">🎟️</span>
                        <span class="nav-text">Racheter un bon</span>
                    </a>
                    <a class="nav-item ${activeSection === 'history' ? 'active' : ''}" onclick="showSection('history')">
                        <span class="nav-icon">📜</span>
                        <span class="nav-text">Historique</span>
                    </a>
                    <a class="nav-item ${activeSection === 'cashiers' ? 'active' : ''}" onclick="showSection('cashiers')">
                        <span class="nav-icon">👤</span>
                        <span class="nav-text">Caissiers</span>
                    </a>
                    
                    <div class="nav-divider"></div>
                    
                    <a class="nav-item ${activeSection === 'settings' ? 'active' : ''}" onclick="showSection('settings')">
                        <span class="nav-icon">⚙️</span>
                        <span class="nav-text">Paramètres</span>
                    </a>
                </nav>
            </aside>
        `;
    }

    // ============================================
    // MOBILE MENU CONTROLS
    // ============================================

    function toggleMobileMenu() {
        mobileMenuOpen = !mobileMenuOpen;
        updateMobileMenuState();
    }

    function closeMobileMenu() {
        mobileMenuOpen = false;
        updateMobileMenuState();
    }

    function updateMobileMenuState() {
        const mobileNav = document.getElementById('mobileNav');
        const overlay = document.getElementById('mobileNavOverlay');
        const hamburger = document.getElementById('hamburgerBtn');
        
        if (mobileMenuOpen) {
            mobileNav?.classList.add('active');
            overlay?.classList.add('active');
            hamburger?.classList.add('active');
            document.body.style.overflow = 'hidden';
        } else {
            mobileNav?.classList.remove('active');
            overlay?.classList.remove('active');
            hamburger?.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    // ============================================
    // LANGUAGE SELECTOR
    // ============================================

    function setLanguage(lang) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.LANG, lang);
        
        // Update active button
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        
        // Trigger i18n update if available
        if (window.i18n && typeof window.i18n.setLanguage === 'function') {
            window.i18n.setLanguage(lang);
        } else if (window.setLanguage && typeof window.setLanguage === 'function') {
            window.setLanguage(lang);
        }
    }

    // ============================================
    // SIDEBAR ACTIVE STATE UPDATE
    // ============================================

    function updateSidebarActive(sectionName) {
        if (!currentOptions.sidebar) return;
        
        currentOptions.activeSection = sectionName;
        
        // Update nav items
        document.querySelectorAll('.dashboard-nav .nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Find and activate the correct item
        const selector = `.dashboard-nav a[href*="${sectionName}"], .dashboard-nav a[onclick*="${sectionName}"]`;
        const activeItem = document.querySelector(selector);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    // ============================================
    // NOTIFICATION SYSTEM
    // ============================================

    function showNotification(message, type = 'info', duration = 4000) {
        // Remove existing notifications
        document.querySelectorAll('.nimwema-notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `nimwema-notification nimwema-notification-${type}`;
        notification.textContent = message;
        
        const colors = {
            success: '#2E7D32',
            error: '#D32F2F',
            warning: '#F57C00',
            info: '#1976D2'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 24px;
            border-radius: 8px;
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            border-left: 4px solid ${colors[type] || colors.info};
            font-family: 'Poppins', sans-serif;
            font-size: 14px;
            max-width: 350px;
            animation: nimwemaSlideIn 0.3s ease;
        `;
        
        // Add animation styles if not present
        if (!document.getElementById('nimwema-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'nimwema-notification-styles';
            style.textContent = `
                @keyframes nimwemaSlideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'nimwemaSlideIn 0.3s ease reverse';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }

    // ============================================
    // MAIN INITIALIZATION
    // ============================================

    function init(options = {}) {
        currentOptions = {
            sidebar: options.sidebar || null,
            activePage: options.activePage || '',
            activeSection: options.activeSection || 'home'
        };
        
        console.log('[Layout] Initializing with options:', currentOptions);
        
        // Render all components
        renderHeader();
        renderMobileNav();
        renderFooter();
        
        if (currentOptions.sidebar) {
            renderSidebar();
        }
        
        // Setup event listeners
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeMobileMenu();
            }
        });
        
        // Apply i18n if available
        if (window.i18n && typeof window.i18n.apply === 'function') {
            setTimeout(() => window.i18n.apply(), 0);
        }
        
        console.log('[Layout] Initialization complete');
    }

    // ============================================
    // PUBLIC API
    // ============================================

    window.NimwemaLayout = {
        // Core
        init,
        
        // Auth
        getCurrentUser,
        isAuthenticated,
        logout,
        
        // Mobile menu
        toggleMobileMenu,
        closeMobileMenu,
        
        // Language
        setLanguage,
        
        // Sidebar
        updateSidebarActive,
        
        // Notifications
        showNotification,
        
        // Re-render (for dynamic updates)
        refresh: function() {
            renderHeader();
            renderMobileNav();
            renderFooter();
            if (currentOptions.sidebar) {
                renderSidebar();
            }
        }
    };

})();
