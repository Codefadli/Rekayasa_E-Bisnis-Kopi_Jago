// ============================================================
// CUSTOMER HOMEPAGE - JAGO COFFEE
// Navbar, smooth scroll, menu loading with existing API
// ============================================================

// Global state
let allMenuItems = [];
let wishlistIds = new Set();
let selectedCategory = 'all';

// === NAVBAR BEHAVIOR ===
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navMenu = document.getElementById('nav-menu');

// Scroll effect - transparent to red
window.addEventListener('scroll', () => {
    if (window.scrollY > 100) {
        navbar?.classList.add('scrolled');
    } else {
        navbar?.classList.remove('scrolled');
    }
    
    // Active link based on scroll position
    updateActiveNavLink();
});

// Hamburger toggle
hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navMenu?.classList.toggle('active');
});

// Close mobile menu on link click
document.querySelectorAll('.navbar-link').forEach(link => {
    link.addEventListener('click', () => {
        hamburger?.classList.remove('active');
        navMenu?.classList.remove('active');
    });
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#') return;
        
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            
            // Close mobile menu
            if (navMenu?.classList.contains('active')) {
                hamburger?.classList.remove('active');
                navMenu?.classList.remove('active');
            }
        }
    });
});

// Update active nav link based on scroll position
function updateActiveNavLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollPos = window.scrollY + 120;
    
    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        
        if (scrollPos >= top && scrollPos < top + height) {
            document.querySelectorAll('.navbar-link').forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${id}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

// === WISHLIST ===
async function loadWishlist() {
    if (!token()) return;
    
    try {
        const items = await api('wishlist');
        wishlistIds = new Set(items.map(i => Number(i.menu_id)));
        console.log('[Wishlist] Loaded:', wishlistIds.size, 'items');
    } catch (error) {
        console.error('[Wishlist] Load error:', error);
    }
}

async function toggleWishlist(menuId, button) {
    if (!token()) {
        alert('Login terlebih dahulu untuk menambahkan ke wishlist');
        window.location.href = '../login.html';
        return;
    }
    
    const isInWishlist = wishlistIds.has(menuId);
    
    try {
        if (isInWishlist) {
            await api(`wishlist/${menuId}`, { method: 'DELETE' });
            wishlistIds.delete(menuId);
            button.classList.remove('active');
            button.textContent = '♡';
            console.log('[Wishlist] Removed:', menuId);
        } else {
            await api('wishlist', { method: 'POST', body: { menu_id: menuId } });
            wishlistIds.add(menuId);
            button.classList.add('active');
            button.textContent = '♥';
            console.log('[Wishlist] Added:', menuId);
        }
    } catch (error) {
        console.error('[Wishlist] Toggle error:', error);
        alert('Gagal mengubah wishlist: ' + error.message);
    }
}

// === MENU LOADING ===
async function loadMenu() {
    const status = document.getElementById('menu-status');
    
    try {
        status.textContent = 'Memuat menu...';
        allMenuItems = await api('menu');
        
        console.log('[Menu] Loaded:', allMenuItems.length, 'items');
        
        if (allMenuItems.length === 0) {
            status.textContent = '';
            showEmptyState();
            return;
        }
        
        status.textContent = '';
        renderFeaturedMenu();
        renderCategories();
        renderAllMenu();
    } catch (error) {
        console.error('[Menu] Load error:', error);
        status.textContent = '';
        showErrorState(error.message);
    }
}

function renderFeaturedMenu() {
    const featured = allMenuItems.filter(item => Number(item.is_featured) === 1);
    const grid = document.getElementById('featured-menu');
    
    if (!grid) return;
    
    if (featured.length === 0) {
        grid.innerHTML = '<p class="text-center text-gray">Belum ada menu favorit</p>';
        return;
    }
    
    grid.innerHTML = featured.map(item => renderProductCard(item)).join('');
    attachCardEvents(grid);
}

function renderCategories() {
    const categories = ['all', ...new Set(allMenuItems.map(item => item.category))];
    const filter = document.getElementById('category-filter');
    
    if (!filter) return;
    
    filter.innerHTML = categories.map(cat => `
        <button class="category-btn ${cat === selectedCategory ? 'active' : ''}" 
                data-category="${esc(cat)}">
            ${cat === 'all' ? 'Semua' : esc(cat)}
        </button>
    `).join('');
    
    // Attach click events
    filter.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedCategory = btn.dataset.category;
            renderCategories();
            renderAllMenu();
        });
    });
}

function renderAllMenu() {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;
    
    const filtered = selectedCategory === 'all' 
        ? allMenuItems 
        : allMenuItems.filter(item => item.category === selectedCategory);
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p class="text-center text-gray">Tidak ada menu dalam kategori ini</p>';
        return;
    }
    
    grid.innerHTML = filtered.map(item => renderProductCard(item)).join('');
    attachCardEvents(grid);
}

function renderProductCard(item) {
    const sizes = item.sizes || [];
    const defaultSize = sizes.length > 0 ? sizes[Math.floor(sizes.length / 2)] : null;
    const price = defaultSize ? defaultSize.price : item.price;
    const isInWishlist = wishlistIds.has(Number(item.id));
    
    return `
        <div class="product-card" data-menu-id="${item.id}">
            <div class="product-image">
                <img src="../${imageByName(item.name)}" alt="${esc(item.name)}" loading="lazy">
            </div>
            <div class="product-body">
                <div class="product-header">
                    <h3 class="product-name">${esc(item.name)}</h3>
                    <button class="product-wishlist ${isInWishlist ? 'active' : ''}" 
                            data-menu-id="${item.id}"
                            aria-label="Toggle wishlist">
                        ${isInWishlist ? '♥' : '♡'}
                    </button>
                </div>
                <p class="product-category">${esc(item.category || 'Menu')}</p>
                ${item.description ? `<p class="product-description">${esc(item.description)}</p>` : ''}
                
                ${sizes.length > 0 ? `
                    <div class="size-selector">
                        <label class="size-label">Ukuran</label>
                        <div class="size-options">
                            ${sizes.map((size, idx) => `
                                <button class="size-btn ${idx === Math.floor(sizes.length / 2) ? 'active' : ''}" 
                                        data-size="${esc(size.size)}"
                                        data-price="${size.price}">
                                    ${sizeLabel(size.size)}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="product-footer">
                    <span class="product-price">Rp ${Number(price).toLocaleString('id-ID')}</span>
                    <button class="product-add-btn" data-menu-id="${item.id}">
                        Tambah
                    </button>
                </div>
            </div>
        </div>
    `;
}

function attachCardEvents(container) {
    // Size selector
    container.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.product-card');
            card.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update price
            const priceEl = card.querySelector('.product-price');
            const price = Number(btn.dataset.price);
            priceEl.textContent = `Rp ${price.toLocaleString('id-ID')}`;
        });
    });
    
    // Wishlist toggle
    container.querySelectorAll('.product-wishlist').forEach(btn => {
        btn.addEventListener('click', () => {
            const menuId = Number(btn.dataset.menuId);
            toggleWishlist(menuId, btn);
        });
    });
    
    // Add to cart
    container.querySelectorAll('.product-add-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const menuId = Number(btn.dataset.menuId);
            const card = btn.closest('.product-card');
            const activeSize = card.querySelector('.size-btn.active');
            const size = activeSize ? activeSize.dataset.size : 'medium';
            
            await addToCart(menuId, size, btn);
        });
    });
}

async function addToCart(menuId, size, button) {
    if (!token()) {
        alert('Login terlebih dahulu untuk menambahkan ke keranjang');
        window.location.href = '../login.html';
        return;
    }
    
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = '...';
    
    try {
        await api('cart', {
            method: 'POST',
            body: { menu_id: menuId, size: size, qty: 1 }
        });
        
        button.textContent = '✓ Ditambahkan';
        console.log('[Cart] Added:', { menuId, size });
        
        // Update cart badge
        await loadCartCount();
        
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 1400);
    } catch (error) {
        console.error('[Cart] Add error:', error);
        alert('Gagal menambahkan ke keranjang: ' + error.message);
        button.textContent = originalText;
        button.disabled = false;
    }
}

function showEmptyState() {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="empty-state">
            <h3>Menu Belum Tersedia</h3>
            <p>Saat ini belum ada menu yang dapat ditampilkan. Silakan coba lagi nanti.</p>
        </div>
    `;
}

function showErrorState(message) {
    const grid = document.getElementById('menu-grid');
    if (!grid) return;
    
    grid.innerHTML = `
        <div class="error-state">
            <h3>Gagal Memuat Menu</h3>
            <p>${esc(message)}</p>
            <button class="btn btn-primary" onclick="loadMenu()">Coba Lagi</button>
        </div>
    `;
}

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    // Load account info
    showAccount();
    
    // Load cart count
    if (token()) {
        loadCartCount();
        loadWishlist();
    }
    
    // Load menu
    loadMenu();
    
    console.log('[Homepage] Initialized');
});
