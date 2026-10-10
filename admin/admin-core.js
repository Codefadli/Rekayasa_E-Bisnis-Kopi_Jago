/**
 * ADMIN CORE - JAGO COFFEE
 * Shared admin utilities, auth checking, sidebar behavior
 * DEMO MODE: Simplified for local demo access
 */

// ============================================================
// DEMO MODE CONFIGURATION
// ============================================================

const DEMO_MODE = true; // Set to false for production with real auth

// ============================================================
// ADMIN AUTH GUARD
// ============================================================

function adminAuthGuard() {
    if (DEMO_MODE) {
        // Demo mode: Allow direct access without JWT
        console.log('[Admin] Running in DEMO MODE - Auth bypassed for local testing');
        
        // Set demo credentials if not already set
        if (!KJAuth.getToken()) {
            const demoToken = 'demo_admin_token_' + Date.now();
            KJAuth.setToken(demoToken);
            KJAuth.setRole('admin');
            KJAuth.setUser({
                id: 1,
                name: 'Admin Demo',
                email: 'admin@demo.local',
                role: 'admin'
            });
        }
        
        return true;
    }
    
    // Production mode: Real auth check
    const token = KJAuth.getToken();
    const role = KJAuth.getRole();
    
    if (!token || role !== 'admin') {
        alert('Access denied. Admin login required.');
        window.location.href = '../login.html';
        return false;
    }
    
    return true;
}

// ============================================================
// SIDEBAR BEHAVIOR
// ============================================================

function initSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('admin-sidebar');
    
    if (toggle && sidebar) {
        toggle.addEventListener('click', () => {
            sidebar.classList.toggle('sidebar-open');
        });
        
        // Close sidebar on mobile when clicking outside
        if (window.innerWidth <= 1024) {
            document.addEventListener('click', (e) => {
                if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
                    sidebar.classList.remove('sidebar-open');
                }
            });
        }
    }
}

// ============================================================
// ACTIVE NAV ITEM
// ============================================================

function setActiveNavItem(page) {
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });
}

// ============================================================
// UPDATE ADMIN NAME IN HEADER
// ============================================================

function updateAdminName() {
    const nameEl = document.getElementById('admin-name');
    if (nameEl) {
        // Always display "Admin" for demo mode
        nameEl.textContent = 'Admin';
    }
}

// ============================================================
// ADMIN LOGOUT
// ============================================================

function initAdminLogout() {
    const logoutBtn = document.getElementById('admin-logout');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            if (DEMO_MODE) {
                // Demo mode: Just clear local storage
                KJAuth.clearToken();
                alert('Logout berhasil (Demo Mode)');
                window.location.href = '../login.html';
                return;
            }
            
            // Production mode: Call logout API
            try {
                await kjRequest('auth/logout', { method: 'POST' });
            } catch (e) {
                console.warn('[Admin] Logout API error:', e);
            }
            
            KJAuth.clearToken();
            alert('Logged out successfully');
            
            setTimeout(() => {
                window.location.href = '../login.html';
            }, 500);
        });
    }
}

// ============================================================
// FETCH PENDING ORDERS COUNT
// ============================================================

async function updatePendingOrdersBadge() {
    try {
        const orders = await kjApi('orders');
        const pending = orders.filter(o => o.status === 'pending').length;
        
        const badge = document.getElementById('pending-orders-badge');
        if (badge) {
            badge.textContent = pending;
            badge.style.display = pending > 0 ? 'inline-block' : 'none';
        }
    } catch (e) {
        console.warn('[Admin] Failed to fetch pending orders:', e);
        // Silent fail in demo mode
    }
}

// ============================================================
// FETCH LOW STOCK COUNT
// ============================================================

async function updateLowStockBadge() {
    try {
        const items = await kjApi('menu');
        const lowStock = items.filter(item => item.stock < 10).length;
        
        const badge = document.getElementById('low-stock-badge');
        if (badge) {
            badge.textContent = lowStock;
            badge.style.display = lowStock > 0 ? 'inline-block' : 'none';
        }
    } catch (e) {
        console.warn('[Admin] Failed to fetch low stock:', e);
        // Silent fail in demo mode
    }
}

// ============================================================
// FORMAT CURRENCY
// ============================================================

function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================================
// STATUS BADGE GENERATOR
// ============================================================

function statusBadge(status) {
    const label = status.replace(/_/g, ' ');
    return `<span class="status-badge status-${status}">${label}</span>`;
}

// ============================================================
// ADMIN INIT
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    // Guard: redirect if not admin
    if (!adminAuthGuard()) return;
    
    // Initialize UI
    initSidebar();
    updateAdminName();  // Always show "Admin"
    initAdminLogout();
    
    // Update badges
    updatePendingOrdersBadge();
    updateLowStockBadge();
    
    // Refresh badges every 30 seconds
    setInterval(() => {
        updatePendingOrdersBadge();
        updateLowStockBadge();
    }, 30000);
    
    console.log('[Admin] Core initialized');
});
