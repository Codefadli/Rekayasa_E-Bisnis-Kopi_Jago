/**
 * CUSTOMER HOME PAGE - JAGO COFFEE
 * Production-ready with new component library
 * NO alert(), proper loading, error states, toast notifications
 * Version: 2.0
 */

// ============================================================
// STATE MANAGEMENT
// ============================================================

let allMenuItems = [];
let wishlistIds = new Set();
let selectedCategory = 'all';

// ============================================================
// INITIALIZATION
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Home] Initializing...');
    
    // Setup smooth scroll
    setupSmoothScroll();
    
    // Load wishlist if authenticated
    if (KJAuth.isAuthenticated()) {
        await loadWishlist();
    }
    
    // Load menu
    await loadMenu();
});

// ============================================================
// SMOOTH SCROLL NAVIGATION
// ============================================================

function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
}

// ============================================================
// WISHLIST MANAGEMENT
// ============================================================

async function loadWishlist() {
    try {
        const items = await kjApi('wishlist');
        wishlistIds = new Set(items.map(i => Number(i.menu_id)));
        console.log('[Wishlist] Loaded:', wishlistIds.size, 'items');
    } catch (error) {
        console.error('[Wishlist] Load error:', error);
        // Don't show error toast for wishlist, it's not critical
    }
}

async function toggleWishlist(menuId, button) {
    if (!KJAuth.isAuthenticated()) {
        const confirmed = await KJModal.confirm(
            'Login diperlukan untuk menambahkan ke wishlist. Login sekarang?',
            'Login Required'
        );
        if (confirmed) {
            window.location.href = '/login.html';
        }
        return;
    }
    
    const isInWishlist = wishlistIds.has(menuId);
    
    try {
        if (isInWishlist) {
            await kjApi(`wishlist?menu_id=${menuId}`, { method: 'DELETE' });
            wishlistIds.delete(menuId);
            button.classList.remove('active');
            button.textContent = '♡';
            KJToast.info('Dihapus dari wishlist');
        } else {
            await kjApi('wishlist', { 
                method: 'POST', 
                body: JSON.stringify({ menu_id: menuId }) 
            });
            wishlistIds.add(menuId);
            button.classList.add('active');
            button.textContent = '♥';
            KJToast.success('Ditambahkan ke wishlist');
        }
    } catch (error) {
        console.error('[Wishlist] Toggle error:', error);
        KJToast.error('Gagal mengubah wishlist: ' + error.message);
    }
}

// ============================================================
// MENU LOADING
// ============================================================

async function loadMenu() {
    const kopiContainer = document.getElementById('products-kopi');
    const nonKopiContainer = document.getElementById('products-non-kopi');

    showLoading(kopiContainer);
    showLoading(nonKopiContainer);

    try {
        allMenuItems = await kjApi('menu');

        console.log('[Menu] Loaded:', allMenuItems.length, 'items');

        hideLoading(kopiContainer);
        hideLoading(nonKopiContainer);

        if (allMenuItems.length === 0) {
            showEmptyState(kopiContainer, {
                icon: '☕',
                title: 'Menu Tidak Tersedia',
                message: 'Saat ini belum ada menu yang tersedia. Silakan cek lagi nanti.'
            });
            return;
        }

        renderGroupedMenu();
    } catch (error) {
        console.error('[Menu] Load error:', error);

        hideLoading(kopiContainer);
        hideLoading(nonKopiContainer);

        showErrorState(kopiContainer, 'Gagal memuat menu: ' + error.message, loadMenu);
        KJToast.error('Gagal memuat menu');
    }
}

// ============================================================
// RENDER CATEGORIES
// ============================================================

function renderCategories() {
    const categories = ['all', ...new Set(allMenuItems.map(item => item.category))];
    const container = document.getElementById('category-filter');
    
    if (!container) return;
    
    container.innerHTML = categories.map(cat => `
        <button class="category-btn ${cat === selectedCategory ? 'active' : ''}" 
                data-category="${esc(cat)}">
            ${cat === 'all' ? 'Semua' : esc(cat)}
        </button>
    `).join('');
    
    // Attach click events
    container.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedCategory = btn.dataset.category;
            renderCategories();
            renderAllMenu();
        });
    });
}

// ============================================================
// DEDUPLIKASI THEMATIC IMAGE
// ============================================================
// Fungsi ini menghapus produk duplikat berdasarkan file gambarnya,
// sehingga 1 gambar = 1 nama produk (user request)
function dedupeByImage(items) {
    const seenImages = new Set();
    return items.filter(item => {
        const image = getProductImage(item.name);
        if (seenImages.has(image)) {
            return false; // gambar sudah pernah tampil, lewati produk ini
        }
        seenImages.add(image);
        return true;
    });
}

function renderGroupedMenu() {
    const kopiItems = dedupeByImage(allMenuItems.filter(item => item.category === 'Kopi'));
    const nonKopiItems = dedupeByImage(allMenuItems.filter(item => item.category === 'Non Kopi'));

    const kopiContainer = document.getElementById('products-kopi');
    const nonKopiContainer = document.getElementById('products-non-kopi');

    if (!kopiContainer || !nonKopiContainer) return;

    // Render Kopi
    if (kopiItems.length === 0) {
        kopiContainer.innerHTML = '<p class="text-center text-gray">Belum ada menu kopi</p>';
    } else {
        kopiContainer.innerHTML = kopiItems.map(item => renderProductCard(item)).join('');
    }

    // Render Non Kopi
    if (nonKopiItems.length === 0) {
        nonKopiContainer.innerHTML = '<p class="text-center text-gray">Belum ada menu non kopi</p>';
    } else {
        nonKopiContainer.innerHTML = nonKopiItems.map(item => renderProductCard(item)).join('');
    }

    attachCardEvents(kopiContainer);
    attachCardEvents(nonKopiContainer);
}

// ============================================================
// PRODUCT CARD RENDERER
// ============================================================

function renderProductCard(item) {
    const inWishlist = wishlistIds.has(Number(item.id));
    const image = getProductImage(item.name);
    const stock = Number(item.stock) || 0;
    const isAvailable = Number(item.is_available) === 1 && stock > 0;
    
    // Get sizes if available
    const sizes = item.sizes || [];
    const hasMultipleSizes = sizes.length > 1;
    
    // Default price (medium or first available)
    const mediumSize = sizes.find(s => s.size === 'medium');
    const defaultPrice = mediumSize ? mediumSize.price : (sizes[0]?.price || item.price || 0);
    
    return `
        <div class="product-card ${!isAvailable ? 'product-unavailable' : ''}" data-product-id="${item.id}">
            <div class="product-image-container">
                <img src="${esc(image)}" alt="${esc(item.name)}" class="product-image">
                ${!isAvailable ? '<div class="product-badge product-badge-unavailable">Habis</div>' : ''}
                ${KJAuth.isAuthenticated() ? `
                    <button class="product-wishlist ${inWishlist ? 'active' : ''}" 
                            data-menu-id="${item.id}"
                            aria-label="Add to wishlist">
                        ${inWishlist ? '♥' : '♡'}
                    </button>
                ` : ''}
            </div>
            <div class="product-info">
                <h3 class="product-name">${esc(item.name)}</h3>
                ${item.description ? `<p class="product-description">${esc(item.description)}</p>` : ''}
                <div class="product-footer">
                    <div class="product-price-section">
                        ${hasMultipleSizes ? '<span class="product-price-from">Mulai dari</span>' : ''}
                        <span class="product-price">${formatRupiah(defaultPrice)}</span>
                    </div>
                    ${isAvailable ? `
                        <button class="btn btn-primary btn-sm product-add-btn" 
                                data-menu-id="${item.id}"
                                data-menu-name="${esc(item.name)}"
                                data-has-sizes="${hasMultipleSizes}">
                            <span>+</span> Keranjang
                        </button>
                    ` : `
                        <button class="btn btn-secondary btn-sm" disabled>
                            Tidak Tersedia
                        </button>
                    `}
                </div>
            </div>
        </div>
    `;
}

// ============================================================
// ATTACH EVENT HANDLERS
// ============================================================

function attachCardEvents(container) {
    // Wishlist buttons
    container.querySelectorAll('.product-wishlist').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const menuId = Number(btn.dataset.menuId);
            toggleWishlist(menuId, btn);
        });
    });
    
    // Add to cart buttons
    container.querySelectorAll('.product-add-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const menuId = Number(btn.dataset.menuId);
            const menuName = btn.dataset.menuName;
            const hasSizes = btn.dataset.hasSizes === 'true';
            
            if (hasSizes) {
                await showSizeSelector(menuId, menuName);
            } else {
                await addToCart(menuId, 'medium', 1);
            }
        });
    });
}

// ============================================================
// SIZE SELECTOR MODAL
// ============================================================

async function showSizeSelector(menuId, menuName) {
    const item = allMenuItems.find(i => Number(i.id) === menuId);
    if (!item || !item.sizes) return;
    
    const sizes = item.sizes;
    
    KJModal.show({
        title: menuName,
        size: 'small',
        html: `
            <div style="padding: 8px 0;">
                <p style="margin-bottom: 16px; color: var(--jago-gray-700);">Pilih ukuran:</p>
                ${sizes.map(size => `
                    <button class="btn btn-secondary" 
                            style="width: 100%; margin-bottom: 8px; justify-content: space-between;"
                            onclick="window.selectSize(${menuId}, '${size.size}', '${esc(menuName)}')">
                        <span>${getSizeLabel(size.size)}</span>
                        <span>${formatRupiah(size.price)}</span>
                    </button>
                `).join('')}
            </div>
        `,
        showConfirm: false,
        showCancel: false,
        showClose: true
    });
}

// Global function for size selection (called from modal)
window.selectSize = async function(menuId, size, menuName) {
    KJModal.close();
    await addToCart(menuId, size, 1);
};

// ============================================================
// ADD TO CART
// ============================================================

async function addToCart(menuId, size, quantity) {
    if (!KJAuth.isAuthenticated()) {
        const confirmed = await KJModal.confirm(
            'Login diperlukan untuk menambahkan ke keranjang. Login sekarang?',
            'Login Required'
        );
        if (confirmed) {
            window.location.href = '../login.html';
        }
        return;
    }
    
    try {
        await kjApi('cart', {
            method: 'POST',
            body: JSON.stringify({
                menu_id: menuId,
                size: size,
                qty: quantity
            })
        });
        
        KJToast.success('Ditambahkan ke keranjang');
        
        // Update cart badge
        await updateCartBadge();
    } catch (error) {
        console.error('[Cart] Add error:', error);
        KJToast.error('Gagal menambahkan ke keranjang: ' + error.message);
    }
}

console.log('[Home] Script loaded');
