/**
 * AUTH UTILITIES - JAGO COFFEE
 * Enhanced authentication with role-based redirect
 */

const KJAuth = {
    /**
     * Save authentication data to localStorage
     */
    saveAuth(token, role, user) {
        localStorage.setItem('kj_token', token);
        localStorage.setItem('kj_role', role);
        localStorage.setItem('kj_user', JSON.stringify(user));
    },

    /**
     * Get current token
     */
    getToken() {
        return localStorage.getItem('kj_token');
    },

    /**
     * Get current role
     */
    getRole() {
        return localStorage.getItem('kj_role');
    },

    /**
     * Get current user
     */
    getUser() {
        const userJson = localStorage.getItem('kj_user');
        return userJson ? JSON.parse(userJson) : null;
    },

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        return !!this.getToken();
    },

    /**
     * Check if user has specific role
     */
    hasRole(role) {
        return this.getRole() === role;
    },

    /**
     * Clear authentication data
     */
    clearAuth() {
        localStorage.removeItem('kj_token');
        localStorage.removeItem('kj_role');
        localStorage.removeItem('kj_user');
    },

    /**
     * Redirect based on role
     */
    redirectByRole() {
        const role = this.getRole();
        
        switch(role) {
            case 'admin':
                window.location.href = '/admin/dashboard.html';
                break;
            case 'seller':
                window.location.href = '/seller/dashboard.html';
                break;
            case 'customer':
                window.location.href = '/customer/home.html';
                break;
            default:
                window.location.href = '/customer/login.html';
        }
    },

    /**
     * Check access for admin pages
     */
    requireAdmin() {
        if (!this.isAuthenticated()) {
            window.location.href = '/customer/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        
        if (!this.hasRole('admin')) {
            alert('Access Denied: Admin privileges required');
            this.redirectByRole();
            return false;
        }
        
        return true;
    },

    /**
     * Check access for seller pages
     */
    requireSeller() {
        if (!this.isAuthenticated()) {
            window.location.href = '/customer/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        
        if (!this.hasRole('seller')) {
            alert('Access Denied: Seller privileges required');
            this.redirectByRole();
            return false;
        }
        
        return true;
    },

    /**
     * Check access for customer pages
     */
    requireCustomer() {
        if (!this.isAuthenticated()) {
            window.location.href = '/customer/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        
        return true;
    }
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.KJAuth = KJAuth;
}
