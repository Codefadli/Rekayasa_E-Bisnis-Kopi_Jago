/**
 * CUSTOMER CART PAGE - JAGO COFFEE
 * Production-ready with new component library
 * NO alert(), NO confirm(), proper UX
 * Version: 2.0
 */

// ============================================================
// STATE MANAGEMENT
// ============================================================

let cartItems = [];

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Cart] Initializing...');
    
    // Check authentication
    if (!KJAuth.isAuthenticated()) {
        const confirmed = await KJModal.confirm(
            'Login diperlukan untuk melihat keranjang. Login sekarang?',
            'Login Required'
        );
        if (confirmed) {
            window.location.href = '../login.html';
        } else {
            window.location.href = 'home.html';
        }
        return;
    }
    
    // Load cart
    await loadCart();
});

// ============================================================
// LOAD CART
// ============================================================

async function loadCart() {
    const container = document.getElementById('cart-container');
    if (!container) return;
    
    // Show loading
    showLoading(container, 'Memuat keranjang...');
    
    try {
        cartItems = await kjApi('cart');
        
        console.log('[Cart] Loaded:', cartItems.length, 'items');
        
        hideLoading(container);
        
        if (cartItems.length === 0) {
            showEmptyCart(container);
            return;
        }
        
        renderCart(container);
    } catch (error) {
        console.error('[Cart] Load error:', error);
        hideLoading(container);
        showErrorState(container, 'Gagal memuat keranjang: ' + error.message, loadCart);
        KJToast.error('Gagal memuat keranjang');
    }
}

// ============================================================
// SHOW EMPTY CART
// ============================================================

function showEmptyCart(container) {
    showEmptyState(container, {
        icon: '🛒',
        title: 'Keranjang Kosong',
        message: 'Belum ada produk di keranjang Anda. Yuk mulai belanja!',
        actionText: 'Lihat Menu',
        onAction: () => {
            window.location.href = 'home.html#menu';
        }
    });
}

// ============================================================
// RENDER CART
// ============================================================

function renderCart(container) {
    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const itemCount = cartItems.reduce((sum, item) => sum + Number(item.qty), 0);
    
    container.innerHTML = `
        <div class="cart-grid">
            <!-- Cart Items -->
            <div class="cart-items">
                <h2 class="cart-items-title">Item Keranjang (${itemCount})</h2>
                ${cartItems.map(item => renderCartItem(item)).join('')}
            </div>
            
            <!-- Cart Summary -->
            <div class="cart-summary-sticky">
                <div class="cart-summary">
                    <h3 class="cart-summary-title">Ringkasan Belanja</h3>
                    
                    <div class="summary-section">
                        <div class="summary-row">
                            <span>Subtotal (${itemCount} item)</span>
                            <span>${formatRupiah(subtotal)}</span>
                        </div>
                        <div class="summary-row">
                            <span>Ongkir</span>
                            <span class="text-green">GRATIS</span>
                        </div>
                    </div>
                    
                    <div class="kj-divider"></div>
                    
                    <div class="summary-row total">
                        <span>Total</span>
                        <span>${formatRupiah(subtotal)}</span>
                    </div>
                    
                    <button class="btn btn-primary btn-block checkout-btn" onclick="goToCheckout()">
                        Lanjut ke Checkout
                    </button>
                    
                    <a href="home.html#menu" class="btn btn-secondary btn-block">
                        Lanjut Belanja
                    </a>
                </div>
                
                <!-- Promo Info -->
                <div class="promo-info">
                    <div class="promo-icon">🎉</div>
                    <div class="promo-text">
                        <strong>Free Delivery!</strong>
                        <p>Tidak ada biaya pengiriman untuk semua pesanan.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Update cart badge
    updateCartBadge();
}

// ============================================================
// RENDER CART ITEM
// ============================================================

function renderCartItem(item) {
    const image = getProductImage(item.name);
    const itemTotal = Number(item.subtotal || 0);
    
    return `
        <div class="cart-item" data-menu-id="${item.menu_id}" data-size="${esc(item.size)}">
            <div class="cart-item-image">
                <img src="${esc(image)}" alt="${esc(item.name)}" loading="lazy">
            </div>
            
            <div class="cart-item-details">
                <h3 class="cart-item-name">${esc(item.name)}</h3>
                <p class="cart-item-size">${getSizeLabel(item.size)}</p>
                <p class="cart-item-price">${formatRupiah(item.price)} × ${item.qty}</p>
            </div>
            
            <div class="cart-item-actions">
                <!-- Quantity Controls -->
                <div class="qty-control">
                    <button class="qty-btn" 
                            onclick="updateQuantity(${item.menu_id}, '${esc(item.size)}', ${Number(item.qty) - 1})"
                            ${Number(item.qty) <= 1 ? 'disabled' : ''}
                            aria-label="Kurangi jumlah">
                        −
                    </button>
                    <span class="qty-value">${item.qty}</span>
                    <button class="qty-btn" 
                            onclick="updateQuantity(${item.menu_id}, '${esc(item.size)}', ${Number(item.qty) + 1})"
                            ${Number(item.qty) >= 99 ? 'disabled' : ''}
                            aria-label="Tambah jumlah">
                        +
                    </button>
                </div>
                
                <!-- Item Total -->
                <div class="cart-item-total">
                    ${formatRupiah(itemTotal)}
                </div>
                
                <!-- Remove Button -->
                <button class="cart-item-remove" 
                        onclick="removeItem(${item.menu_id}, '${esc(item.size)}', '${esc(item.name)}')"
                        aria-label="Hapus item">
                    🗑️
                </button>
            </div>
        </div>
    `;
}

// ============================================================
// UPDATE QUANTITY
// ============================================================

async function updateQuantity(menuId, size, newQty) {
    if (newQty < 1 || newQty > 99) return;
    
    // Find item
    const item = cartItems.find(i => Number(i.menu_id) === menuId && i.size === size);
    if (!item) return;
    
    // Optimistic update
    item.qty = newQty;
    item.subtotal = item.price * newQty;
    
    // Re-render immediately for responsiveness
    const container = document.getElementById('cart-container');
    renderCart(container);
    
    try {
        await kjApi('cart', {
            method: 'POST',
            body: JSON.stringify({
                menu_id: menuId,
                size: size,
                qty: newQty
            })
        });
        
        console.log('[Cart] Updated quantity:', { menuId, size, newQty });
        
        // Reload to get accurate data from server
        await loadCart();
    } catch (error) {
        console.error('[Cart] Update error:', error);
        KJToast.error('Gagal mengubah jumlah: ' + error.message);
        
        // Reload to revert optimistic update
        await loadCart();
    }
}

// ============================================================
// REMOVE ITEM
// ============================================================

async function removeItem(menuId, size, itemName) {
    const confirmed = await KJModal.confirm(
        `Hapus "${itemName}" dari keranjang?`,
        'Konfirmasi Hapus'
    );
    
    if (!confirmed) return;
    
    try {
        await kjApi(`cart?menu_id=${menuId}&size=${size}`, {
            method: 'DELETE'
        });
        
        console.log('[Cart] Removed item:', { menuId, size });
        
        KJToast.success('Item dihapus dari keranjang');
        
        // Reload cart
        await loadCart();
    } catch (error) {
        console.error('[Cart] Remove error:', error);
        KJToast.error('Gagal menghapus item: ' + error.message);
    }
}

// ============================================================
// GO TO CHECKOUT
// ============================================================

function goToCheckout() {
    if (cartItems.length === 0) {
        KJToast.warning('Keranjang masih kosong');
        return;
    }
    
    window.location.href = 'checkout.html';
}

// Make functions globally accessible
window.updateQuantity = updateQuantity;
window.removeItem = removeItem;
window.goToCheckout = goToCheckout;

console.log('[Cart] Script loaded');
