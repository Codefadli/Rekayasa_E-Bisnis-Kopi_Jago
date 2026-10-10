/**
 * SELLER CORE - JAGO COFFEE
 * Shared utilities for seller dashboard
 * DEMO MODE: Simplified for local demo access
 */

// ============================================================
// DEMO MODE CONFIGURATION
// ============================================================

const DEMO_MODE = true; // Set to false for production with real auth

// ============================================================
// SELLER AUTH CHECK
// ============================================================

const SellerAuth = {
    checkAuth() {
        if (DEMO_MODE) {
            // Demo mode: Allow direct access without JWT
            console.log('[Seller] Running in DEMO MODE - Auth bypassed for local testing');
            
            // Set demo credentials if not already set
            if (!KJAuth.getToken()) {
                const demoToken = 'demo_seller_token_' + Date.now();
                KJAuth.setToken(demoToken);
                KJAuth.setRole('seller');
                KJAuth.setUser({
                    id: 3,
                    name: 'Seller Demo',
                    email: 'seller@demo.local',
                    role: 'seller'
                });
            }
            
            return;
        }
        
        // Production mode: Real auth check
        if (!KJAuth.isAuthenticated()) {
            window.location.href = '../login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }
        
        // Check if user has seller role
        const role = KJAuth.getRole();
        if (role !== 'seller') {
            if (role === 'admin') {
                // Admin can access seller dashboard
                console.log('[SellerAuth] Admin accessing seller dashboard');
            } else {
                alert('Access Denied: Seller only');
                window.location.href = '../login.html';
                return;
            }
        }
    }
};

// ============================================================
// SELLER API (Extends KopiJagoAPI)
// ============================================================

const SellerAPI = {
    // Get orders assigned to this seller
    async getMyOrders(status = null) {
        try {
            const user = KJAuth.getUser();
            const params = new URLSearchParams();
            if (status) params.append('status', status);
            params.append('seller_id', user.id);
            
            const response = await fetch(`../backend/api/index.php?action=getOrders&${params}`, {
                headers: {
                    'Authorization': 'Bearer ' + KJAuth.getToken()
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch orders');
            return await response.json();
        } catch (error) {
            console.error('[SellerAPI] getMyOrders error:', error);
            throw error;
        }
    },
    
    // Update order status
    async updateOrderStatus(orderId, status) {
        try {
            const response = await fetch('../backend/api/index.php?action=updateOrderStatus', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + KJAuth.getToken()
                },
                body: JSON.stringify({ order_id: orderId, status })
            });
            
            if (!response.ok) throw new Error('Failed to update order');
            return await response.json();
        } catch (error) {
            console.error('[SellerAPI] updateOrderStatus error:', error);
            throw error;
        }
    },
    
    // Get seller profile
    async getProfile() {
        try {
            const response = await fetch('../backend/api/index.php?action=getMe', {
                headers: {
                    'Authorization': 'Bearer ' + KJAuth.getToken()
                }
            });
            
            if (!response.ok) throw new Error('Failed to fetch profile');
            return await response.json();
        } catch (error) {
            console.error('[SellerAPI] getProfile error:', error);
            throw error;
        }
    }
};

// ============================================================
// SELLER UI UTILITIES
// ============================================================

const SellerUI = {
    // Toggle mobile sidebar
    toggleSidebar() {
        document.querySelector('.seller-sidebar')?.classList.toggle('active');
    },
    
    // Format currency
    formatCurrency(amount) {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    },
    
    // Format date
    formatDate(dateString) {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },
    
    // Show notification
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
};

// Auto-run auth check on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => SellerAuth.checkAuth());
} else {
    SellerAuth.checkAuth();
}
