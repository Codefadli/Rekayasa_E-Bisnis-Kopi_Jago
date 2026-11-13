// Shared utilities for all customer pages
const token = () => localStorage.getItem('kj_token') || localStorage.getItem('token') || '';

async function api(path, options = {}) {
    return (await kjRequest(path, options)).data;
}

function showAccount() {
    const user = JSON.parse(localStorage.getItem('jago_user') || localStorage.getItem('kj_user') || 'null');
    const area = document.getElementById('account-area');
    if (!area) return;
    
    area.innerHTML = token()
        ? `<span>Halo, ${esc(user?.name || 'Customer')}</span><a href="profile.html">Profile</a><button id="logout">Logout</button>`
        : '<a href="../login.html">Login</a><a class="primary" href="../login.html#register">Daftar</a>';
    
    document.getElementById('logout')?.addEventListener('click', async () => {
        try { await kjRequest('auth/logout', {method:'POST'}); } catch (_) {}
        localStorage.clear();
        location.href = '../login.html';
    });
}

async function loadCartCount() {
    const badge = document.getElementById('cart-badge');
    if (!badge) {
        console.warn('[Shared] cart-badge element not found');
        return;
    }
    
    if (!token()) {
        badge.textContent = '(0)';
        return;
    }
    
    try {
        const items = await api('cart');
        const count = items.reduce((sum, item) => sum + Number(item.qty), 0);
        badge.textContent = `(${count})`;
        console.log('[Shared] Cart count updated:', count);
    } catch (error) {
        console.error('[Shared] Load cart count error:', error);
        badge.textContent = '(0)';
    }
}

// Image mapping for all product pages
// Mapping keys must match EXACTLY the menu_items.name values from the API
const imageByName = {
    // --- Kopi ---
    'Kopi Jago Signature':   '../kopsu%20jago.jfif',        // kopsu jago.jfif
    'Kopi Susu Vanilla':     '../kopsu%20jago.jfif',        // fallback kopi susu
    'Kopi Susu':             '../kopsu%20jago.jfif',        // kopi susu klasik
    'Americano':             '../americano%20koja.jfif',     // americano koja.jfif
    'Jago Americano':        '../americano%20koja.jfif',
    'Chocolate Latte':       '../jago%20coklat.jfif',        // jago coklat.jfif
    'Chocolate':             '../jago%20coklat.jfif',
    'Jago Chocolate':        '../jago%20coklat.jfif',
    'Red Velvet Latte':      '../jago%20coklat.jfif',
    'Pink Coco':             '../pink%20coco.jfif',          // pink coco.jfif
    'Pink Latte':            '../pink%20coco.jfif',
    'Hazelnut Latte':        '../mont%20blanck%20kopi.jfif', // mont blanck kopi.jfif
    'Mont Blanc Shake':      '../mont%20blanck%20kopi.jfif',
    'Matcha Green Tea Latte':'../macha%20latte.jfif',        // macha latte.jfif
    'Matcha Latte':          '../macha%20latte.jfif',
    'Citrus Cold Brew':      '../citrus%20cold.jfif',        // citrus cold.jfif
    'Kopi Susu Jago':        '../kopsu%20jago.jfif',         // kopsu jago.jfif
    'Salted Caramel Latte':  '../Salted%20Caramel%20Latte.png',
};

const sizeLabel = {'small':'Small','medium':'Medium','large':'Large'};

// Helper to get size label

// API wrapper: kjRequest returns {success, message, data}
// The async api() extracts .data; the sync api() below delegates to kjApi

// Update cart badge
async function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    
    if (!token()) {
        badge.textContent = '(0)';
        return;
    }
    
    try {
        const items = await kjApi('cart');
        const count = items.reduce((sum, item) => sum + Number(item.qty), 0);
        badge.textContent = `(${count})`;
    } catch (error) {
        console.error('[Shared] Cart badge error:', error);
        badge.textContent = '(0)';
    }
}

// Component helpers (for cart.js and others)
function showLoading(container, text = 'Memuat...') {
    if (!container) return;
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>${esc(text)}</p></div>`;
}

function hideLoading(container) {
    if (!container) return;
    const loading = container.querySelector('.loading-state');
    if (loading) loading.remove();
}

function showEmptyState(container, options = {}) {
    if (!container) return;
    const { icon = '📦', title = 'Tidak Ada Data', message = '', actionText = '', onAction = null } = options;
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">${icon}</div>
            <h3>${esc(title)}</h3>
            ${message ? `<p>${esc(message)}</p>` : ''}
            ${actionText && onAction ? `<button class="btn btn-primary" onclick="(${onAction.toString()})()">${esc(actionText)}</button>` : ''}
        </div>
    `;
}

function showErrorState(container, message, retryFn = null) {
    if (!container) return;
    container.innerHTML = `
        <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h3>Terjadi Kesalahan</h3>
            <p>${esc(message)}</p>
            ${retryFn ? `<button class="btn btn-secondary" onclick="(${retryFn.toString()})()">Coba Lagi</button>` : ''}
        </div>
    `;
}
