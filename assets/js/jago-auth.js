/**
 * AUTH UTILITIES - JAGO COFFEE
 * Enhanced authentication with role-based redirect
 */

const KJAuth = {
    saveAuth(token, role, user) {
        localStorage.setItem('kj_token', token);
        localStorage.setItem('kj_role', role);
        localStorage.setItem('kj_user', JSON.stringify(user));
    },

    getToken() {
        return localStorage.getItem('kj_token');
    },

    getRole() {
        return localStorage.getItem('kj_role');
    },

    getUser() {
        const userJson = localStorage.getItem('kj_user');
        return userJson ? JSON.parse(userJson) : null;
    },

    isAuthenticated() {
        return !!this.getToken();
    },

    hasRole(role) {
        return this.getRole() === role;
    },

    clearAuth() {
        localStorage.removeItem('kj_token');
        localStorage.removeItem('kj_role');
        localStorage.removeItem('kj_user');
    },

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

    requireAdmin() {
        if (!this.isAuthenticated()) {
            window.location.href = '/customer/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        
        if (!this.hasRole('admin')) {
            alert('Access Denied: Admin only');
            this.redirectByRole();
            return false;
        }
        
        return true;
    },

    requireSeller() {
        if (!this.isAuthenticated()) {
            window.location.href = '/customer/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return false;
        }
        
        if (!this.hasRole('seller')) {
            alert('Access Denied: Seller only');
            this.redirectByRole();
            return false;
        }
        
        return true;
    }
};

if (typeof window !== 'undefined') {
    window.KJAuth = KJAuth;
}
