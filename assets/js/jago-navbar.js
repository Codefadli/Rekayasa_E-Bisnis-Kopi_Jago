/**
 * JAGO COFFEE - UNIFIED NAVBAR COMPONENT
 * Handles scroll behavior, mobile menu, cart badge, account display
 * Version: 2.0
 */

class JagoNavbar {
    constructor(options = {}) {
        this.navbar = document.getElementById('navbar');
        if (!this.navbar) {
            console.warn('[JagoNavbar] Navbar element not found');
            return;
        }
        
        this.options = {
            scrollThreshold: 50,
            activeClass: 'scrolled',
            ...options
        };
        
        this.hamburger = document.getElementById('hamburger');
        this.navMenu = document.getElementById('nav-menu');
        this.accountArea = document.getElementById('account-area');
        this.cartBadge = document.getElementById('cart-badge');
        
        this.init();
    }
    
    init() {
        this.setupScrollBehavior();
        this.setupMobileMenu();
        this.updateAccountDisplay();
        this.updateCartBadge();
        this.highlightActivePage();
    }
    
    setupScrollBehavior() {
        let lastScroll = 0;
        
        const handleScroll = throttle(() => {
            const currentScroll = window.pageYOffset;
            
            // Add/remove scrolled class based on threshold
            if (currentScroll > this.options.scrollThreshold) {
                this.navbar.classList.add(this.options.activeClass);
            } else {
                this.navbar.classList.remove(this.options.activeClass);
            }
            
            lastScroll = currentScroll;
        }, 100);
        
        window.addEventListener('scroll', handleScroll, { passive: true });
    }
    
    setupMobileMenu() {
        if (!this.hamburger || !this.navMenu) return;
        
        this.hamburger.addEventListener('click', () => {
            this.hamburger.classList.toggle('active');
            this.navMenu.classList.toggle('active');
        });
        
        // Close menu when clicking nav links
        const navLinks = this.navMenu.querySelectorAll('.navbar-link');
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.hamburger.classList.remove('active');
                this.navMenu.classList.remove('active');
            });
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.navbar.contains(e.target)) {
                this.hamburger.classList.remove('active');
                this.navMenu.classList.remove('active');
            }
        });
    }
    
    updateAccountDisplay() {
        if (!this.accountArea) return;
        
        const user = KJAuth.getUser();
        
        if (KJAuth.isAuthenticated() && user) {
            this.accountArea.innerHTML = `
                <div class="navbar-user">
                    <span>Halo, ${esc(user.name || 'Customer')}</span>
                </div>
                <button id="navbar-logout" class="navbar-logout">Logout</button>
            `;
            
            // Attach logout handler
            const logoutBtn = document.getElementById('navbar-logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', async () => {
                    const confirmed = await confirmAction(
                        'Apakah Anda yakin ingin logout?',
                        'Konfirmasi Logout'
                    );
                    
                    if (confirmed) {
                        try {
                            await kjRequest('auth/logout', { method: 'POST' });
                        } catch (error) {
                            console.error('[Navbar] Logout error:', error);
                        }
                        
                        KJAuth.logout();
                    }
                });
            }
        } else {
            const root = kjApplicationRoot();
            this.accountArea.innerHTML = `
                <a href="${root}/login.html" class="navbar-link">Login</a>
                <a href="${root}/login.html#register" class="btn btn-ghost">Daftar</a>
            `;
        }
    }
    
    async updateCartBadge() {
        if (!this.cartBadge) return;
        
        if (!KJAuth.isAuthenticated()) {
            this.cartBadge.textContent = '(0)';
            return;
        }
        
        try {
            const items = await kjApi('cart');
            const count = items.reduce((sum, item) => sum + Number(item.qty), 0);
            this.cartBadge.textContent = `(${count})`;
        } catch (error) {
            console.error('[Navbar] Cart badge error:', error);
            this.cartBadge.textContent = '(0)';
        }
    }
    
    highlightActivePage() {
        const currentPath = window.location.pathname;
        const links = this.navbar.querySelectorAll('.navbar-link');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            
            // Remove existing active class
            link.classList.remove('active');
            
            // Check if link matches current page
            if (href && currentPath.includes(href.split('#')[0].split('?')[0])) {
                link.classList.add('active');
            }
            
            // Handle hash links (e.g., home.html#menu)
            if (href && href.includes('#')) {
                const [path, hash] = href.split('#');
                if (currentPath.includes(path) && window.location.hash === `#${hash}`) {
                    link.classList.add('active');
                }
            }
        });
    }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.jagoNavbar = new JagoNavbar();
    });
} else {
    window.jagoNavbar = new JagoNavbar();
}

console.log('[Jago Navbar] Loaded successfully');
