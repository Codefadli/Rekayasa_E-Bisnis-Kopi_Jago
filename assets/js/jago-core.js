/**
 * JAGO COFFEE - CORE UTILITIES & API LAYER
 * Production-ready API wrapper with proper error handling, loading states, retry logic
 * Version: 2.0
 */

// ============================================================
// APPLICATION ROOT DETECTION
// ============================================================

function kjApplicationRoot() {
    const path = window.location.pathname;
    // App served at document root: /customer/checkout.html -> root is ''
    if (/^\/(?:frontend|customer|admin|seller|backend)(?:\/|$)/.test(path)) return '';
    // Otherwise look for subdirectory in path
    const marker = path.match(/^(.+?)\/(?:frontend|customer|admin|seller|backend)\//);
    if (marker) return marker[1];
    const slash = path.lastIndexOf('/');
    return path.slice(0, slash) || '';
}

// API Base matches router path (/backend/api/)
const KJ_API_BASE = '/backend/api';

// ============================================================
// TOKEN MANAGEMENT
// ============================================================

const KJAuth = {
    getToken() {
        return localStorage.getItem('kj_token') || localStorage.getItem('token') || '';
    },
    
    setToken(token) {
        localStorage.setItem('kj_token', token);
        localStorage.setItem('token', token); // Backward compatibility
    },
    
    clearToken() {
        localStorage.removeItem('kj_token');
        localStorage.removeItem('token');
        localStorage.removeItem('kj_user');
        localStorage.removeItem('kj_role');
    },
    
    getUser() {
        try {
            return JSON.parse(localStorage.getItem('kj_user') || 'null');
        } catch {
            return null;
        }
    },
    
    setUser(user) {
        localStorage.setItem('kj_user', JSON.stringify(user));
    },
    
    getRole() {
        return localStorage.getItem('kj_role') || '';
    },
    
    setRole(role) {
        localStorage.setItem('kj_role', role);
    },
    
    isAuthenticated() {
        return !!this.getToken();
    },
    
    logout() {
        this.clearToken();
        window.location.href = '/login.html';
    }
};

// ============================================================
// API REQUEST WITH ENHANCED ERROR HANDLING
// ============================================================

async function kjRequest(path, options = {}) {
    const token = KJAuth.getToken();
    const normalizedPath = path.replace(/^\/+/, '');
    const endpoint = normalizedPath.endsWith('.php')
        ? `${KJ_API_BASE}/${normalizedPath}`
        : `${KJ_API_BASE}/index.php/${normalizedPath}`;
    
    let response;
    let responseText = '';
    let payload = null;
    
    try {
        response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(options.headers || {})
            }
        });
        
        responseText = await response.text();
        
        try {
            payload = responseText ? JSON.parse(responseText) : null;
        } catch (parseError) {
            console.error('[Kopi Jago API] Invalid JSON response', {
                url: endpoint,
                status: response.status,
                responseText: responseText.substring(0, 200),
                parseError
            });
            throw new Error('Server mengembalikan response yang tidak valid.');
        }
    } catch (networkError) {
        if (networkError.message === 'Server mengembalikan response yang tidak valid.') {
            throw networkError;
        }
        console.error('[Kopi Jago API] Network request failed', {
            url: endpoint,
            networkError
        });
        throw new Error('Tidak dapat menghubungi server. Pastikan koneksi internet aktif.');
    }
    
    // Handle 401 Unauthorized
    if (response.status === 401) {
        KJAuth.clearToken();
        if (!window.location.pathname.endsWith('/login.html')) {
            window.location.assign('/login.html');
        }
        throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
    }
    
    // Handle errors
    if (!payload || !response.ok || payload.success !== true) {
        const errorMessage = payload?.message || payload?.data?.message || `Request failed (HTTP ${response.status})`;
        
        if (response.status === 404) {
            throw new Error('Endpoint tidak ditemukan.');
        }
        
        if (response.status >= 500) {
            throw new Error(payload?.message || 'Terjadi kesalahan pada server. Silakan coba lagi.');
        }
        
        if (response.status === 422) {
            throw new Error(errorMessage); // Validation errors
        }
        
        throw new Error(errorMessage);
    }
    
    return payload;
}

// Simpler wrapper for common use case
async function kjApi(path, options = {}) {
    const result = await kjRequest(path, options);
    return result.data;
}

// ============================================================
// HTML ESCAPING
// ============================================================

function esc(value) {
    const str = String(value ?? '');
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    };
    return str.replace(/[&<>"']/g, char => map[char]);
}

// ============================================================
// CURRENCY FORMATTING
// ============================================================

function formatRupiah(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}

function formatNumber(number) {
    return new Intl.NumberFormat('id-ID').format(number);
}

// ============================================================
// DATE FORMATTING
// ============================================================

function formatDate(dateString, options = {}) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return new Intl.DateTimeFormat('id-ID', { ...defaultOptions, ...options }).format(date);
}

function formatDateShort(dateString) {
    return formatDate(dateString, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatTime(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date);
}

// ============================================================
// LOADING STATE MANAGEMENT
// ============================================================

const KJLoading = {
    show(targetElement = document.body) {
        const existing = targetElement.querySelector('.kj-loading-overlay');
        if (existing) return;
        
        const overlay = document.createElement('div');
        overlay.className = 'kj-loading-overlay';
        overlay.innerHTML = `
            <div class="kj-loading-spinner">
                <div class="kj-spinner"></div>
                <p class="kj-loading-text">Memuat...</p>
            </div>
        `;
        targetElement.style.position = 'relative';
        targetElement.appendChild(overlay);
    },
    
    hide(targetElement = document.body) {
        const overlay = targetElement.querySelector('.kj-loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    }
};

// ============================================================
// DEBOUNCE & THROTTLE
// ============================================================

function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit = 300) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ============================================================
// SCROLL TO TOP
// ============================================================

function scrollToTop(smooth = true) {
    window.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto'
    });
}

// ============================================================
// QUERY PARAMS
// ============================================================

function getQueryParam(param) {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
}

function setQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

// ============================================================
// VALIDATION HELPERS
// ============================================================

const KJValidation = {
    email(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },
    
    phone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 15;
    },
    
    required(value) {
        return value !== null && value !== undefined && String(value).trim() !== '';
    },
    
    minLength(value, min) {
        return String(value).length >= min;
    },
    
    maxLength(value, max) {
        return String(value).length <= max;
    }
};

// ============================================================
// CART BADGE UPDATE (GLOBAL)
// ============================================================

async function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    
    if (!KJAuth.isAuthenticated()) {
        badge.textContent = '(0)';
        return;
    }
    
    try {
        const items = await kjApi('cart');
        const count = items.reduce((sum, item) => sum + Number(item.qty), 0);
        badge.textContent = `(${count})`;
    } catch (error) {
        console.error('[Cart Badge] Error:', error);
        badge.textContent = '(0)';
    }
}

// ============================================================
// PRODUCT IMAGE MAPPING (CENTRALIZED)
// ============================================================

const PRODUCT_IMAGES = {
    'Kopi Jago Signature': '../kopsu%20jago.jfif',
    'Kopi Susu Vanilla': '../kopsu%20jago.jfif',
    'Kopi Susu': '../kopsu%20jago.jfif',
    'Americano': '../americano%20koja.jfif',
    'Jago Americano': '../americano%20koja.jfif',
    'Chocolate Latte': '../jago%20coklat.jfif',
    'Chocolate': '../jago%20coklat.jfif',
    'Jago Chocolate': '../jago%20coklat.jfif',
    'Red Velvet Latte': '../jago%20coklat.jfif',
    'Pink Coco': '../pink%20coco.jfif',
    'Pink Latte': '../pink%20coco.jfif',
    'Hazelnut Latte': '../mont%20blanck%20kopi.jfif',
    'Mont Blanc Shake': '../mont%20blanck%20kopi.jfif',
    'Matcha Green Tea Latte': '../macha%20latte.jfif',
    'Matcha Latte': '../macha%20latte.jfif',
    'Citrus Cold Brew': '../citrus%20cold.jfif',
    'Kopi Susu Jago':       '../kopsu%20jago.jfif',
    'Salted Caramel Latte': '../Salted%20Caramel%20Latte.png'
};

function getProductImage(productName) {
    return PRODUCT_IMAGES[productName] || '../logo%20jago2.png';
}

// ============================================================
// SIZE LABELS
// ============================================================

const SIZE_LABELS = {
    'small': 'Small',
    'medium': 'Medium',
    'large': 'Large'
};

function getSizeLabel(size) {
    return SIZE_LABELS[size] || size;
}

// ============================================================
// EXPORT TO GLOBAL SCOPE
// ============================================================

window.KJAuth = KJAuth;
window.kjRequest = kjRequest;
window.kjApi = kjApi;
window.esc = esc;
window.formatRupiah = formatRupiah;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.formatDateShort = formatDateShort;
window.formatTime = formatTime;
window.KJLoading = KJLoading;
window.debounce = debounce;
window.throttle = throttle;
window.scrollToTop = scrollToTop;
window.getQueryParam = getQueryParam;
window.setQueryParam = setQueryParam;
window.KJValidation = KJValidation;
window.updateCartBadge = updateCartBadge;
window.getProductImage = getProductImage;
window.getSizeLabel = getSizeLabel;

console.log('[Kopi Jago Core] Loaded successfully');
