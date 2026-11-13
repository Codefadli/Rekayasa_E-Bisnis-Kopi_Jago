// ============================================================
// CUSTOMER CART PAGE - JAGO COFFEE
// ============================================================

let cartItems = [];

// Navbar behavior
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu?.classList.toggle('active');
});

// Load cart
async function loadCart() {
    if (!token()) {
        window.location.href = '../login.html';
        return;
    }
    
    const loading = document.getElementById('cart-loading');
    const content = document.getElementById('cart-content');
    const empty = document.getElementById('cart-empty');
    const error = document.getElementById('cart-error');
    
    // Show loading
    loading?.classList.remove('hidden');
    content?.classList.add('hidden');
    empty?.classList.add('hidden');
    error?.classList.add('hidden');
    
    try {
        cartItems = await api('cart');
        console.log('[Cart] Loaded:', cartItems.length, 'items');
        
        loading?.classList.add('hidden');
        
        if (cartItems.length === 0) {
            empty?.classList.remove('hidden');
            return;
        }
        
        renderCart();
        content?.classList.remove('hidden');
    } catch (err) {
        console.error('[Cart] Load error:', err);
        loading?.classList.add('hidden');
        error?.classList.remove('hidden');
        const errorMsg = document.getElementById('cart-error-message');
        if (errorMsg) errorMsg.textContent = err.message || 'Terjadi kesalahan';
    }
}

function renderCart() {
    const content = document.getElementById('cart-content');
    if (!content) return;
    
    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    
    content.innerHTML = `
        <div class="cart-grid">
            <div class="cart-items">
                <h2 class="cart-items-title">Item Keranjang (${cartItems.length})</h2>
                ${cartItems.map(item => renderCartItem(item)).join('')}
            </div>
            
            <div class="cart-summary">
                <h3 class="cart-summary-title">Ringkasan Belanja</h3>
                <div class="summary-row">
                    <span>Subtotal (${cartItems.length} item)</span>
                    <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
                </div>
                <div class="summary-row total">
                    <span>Total</span>
                    <span>Rp ${subtotal.toLocaleString('id-ID')}</span>
                </div>
                <button class="checkout-btn" onclick="goToCheckout()">Lanjut ke Checkout</button>
            </div>
        </div>
    `;
    
    attachCartEvents();
}

function renderCartItem(item) {
    return `
        <div class="cart-item" data-menu-id="${item.menu_id}" data-size="${esc(item.size)}">
            <div class="cart-item-image">
                <img src="../${imageByName(item.name)}" alt="${esc(item.name)}">
            </div>
            <div class="cart-item-info">
                <h3 class="cart-item-name">${esc(item.name)}</h3>
                <p class="cart-item-size">${sizeLabel(item.size)}</p>
                <p class="cart-item-price">Rp ${Number(item.price).toLocaleString('id-ID')} × ${item.qty}</p>
            </div>
            <div class="cart-item-actions">
                <button class="cart-item-remove" onclick="removeCartItem(${item.menu_id}, '${esc(item.size)}')" aria-label="Hapus">
                    🗑️
                </button>
                <div class="qty-control">
                    <button class="qty-btn" onclick="updateQty(${item.menu_id}, '${esc(item.size)}', -1)" ${item.qty <= 1 ? 'disabled' : ''}>−</button>
                    <span class="qty-value">${item.qty}</span>
                    <button class="qty-btn" onclick="updateQty(${item.menu_id}, '${esc(item.size)}', 1)">+</button>
                </div>
            </div>
        </div>
    `;
}

function attachCartEvents() {
    // Events attached via onclick for simplicity
}

async function updateQty(menuId, size, delta) {
    const item = cartItems.find(i => Number(i.menu_id) === menuId && i.size === size);
    if (!item) return;
    
    const newQty = item.qty + delta;
    if (newQty < 1) return;
    
    try {
        await api('cart', {
            method: 'PUT',
            body: { menu_id: menuId, size: size, qty: newQty }
        });
        
        console.log('[Cart] Updated qty:', { menuId, size, newQty });
        await loadCart();
        await loadCartCount();
    } catch (err) {
        console.error('[Cart] Update error:', err);
        alert('Gagal mengubah jumlah: ' + err.message);
    }
}

async function removeCartItem(menuId, size) {
    if (!confirm('Hapus item ini dari keranjang?')) return;
    
    try {
        await api(`cart/${menuId}/${size}`, { method: 'DELETE' });
        console.log('[Cart] Removed:', { menuId, size });
        await loadCart();
        await loadCartCount();
    } catch (err) {
        console.error('[Cart] Remove error:', err);
        alert('Gagal menghapus item: ' + err.message);
    }
}

function goToCheckout() {
    window.location.href = '/customer/checkout.html';
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    showAccount();
    loadCartCount();
    loadCart();
    console.log('[Cart Page] Initialized');
});
