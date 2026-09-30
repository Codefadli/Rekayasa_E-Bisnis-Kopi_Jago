// === HOME PAGE (app.js) ===
// Shared utilities (esc, token, api, showAccount, loadCartCount, sizeLabel, imageByName) loaded from shared.js

let allItems = [];
let wishlistIds = new Set();
let selectedCategory = 'all';

// api(), showAccount(), loadCartCount() from shared.js

// === HOME-SPECIFIC: NAVBAR BEHAVIOR ===
const navbar = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('nav-links');

// Scroll effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 100) navbar?.classList.add('scrolled');
    else navbar?.classList.remove('scrolled');
    
    // Active link
    const sections = document.querySelectorAll('section[id]');
    sections.forEach(section => {
        const top = section.offsetTop - 100;
        const height = section.offsetHeight;
        const id = section.getAttribute('id');
        if (window.scrollY >= top && window.scrollY < top + height) {
            document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
            document.querySelector(`.nav-link[href="#${id}"]`)?.classList.add('active');
        }
    });
});

// Hamburger
hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks?.classList.toggle('active');
});

// Smooth scroll
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
        const href = link.getAttribute('href');
        if (href === '#') return;
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
            target.scrollIntoView({behavior:'smooth'});
            if (navLinks?.classList.contains('active')) {
                hamburger?.classList.remove('active');
                navLinks?.classList.remove('active');
            }
        }
    });
});

async function loadWishlist() {
    if (!token()) return;
    try {
        const items = await api('wishlist');
        wishlistIds = new Set(items.map(i => Number(i.menu_id)));
        console.log('[Wishlist] Loaded IDs:', Array.from(wishlistIds));
    } catch (error) {
        console.error('[Wishlist] Load error:', error);
    }
}

// === MENU ===
async function loadMenu() {
    const status = document.getElementById('menu-status');
    try {
        allItems = await api('menu');
        renderFeatured();
        renderCategories();
        renderMenu();
    } catch (error) {
        if (status) status.textContent = 'Menu sedang tidak dapat dimuat.';
    }
}

function renderFeatured() {
    const featured = allItems.filter(i => Number(i.is_featured) === 1);
    const grid = document.getElementById('featured-grid');
    if (!grid) return;
    grid.innerHTML = featured.map(item => renderCard(item)).join('');
    attachCardEvents(grid);
}

function renderCategories() {
    const categories = ['all', ...new Set(allItems.map(i => i.category))];
    const filter = document.getElementById('category-filter');
    if (!filter) return;
    filter.innerHTML = categories.map(cat => 
        `<button class="${cat === selectedCategory ? 'active' : ''}" data-category="${esc(cat)}">
            ${cat === 'all' ? 'Semua' : esc(cat)}
        </button>`
    ).join('');
    filter.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
            selectedCategory = btn.dataset.category;
            renderCategories();
            renderMenu();
        });
    });
}

function renderMenu() {
    const filtered = selectedCategory === 'all' 
        ? allItems 
        : allItems.filter(i => i.category === selectedCategory);
    const grid = document.getElementById('menu-grid');
    if (!grid) return;
    grid.innerHTML = filtered.map(item => renderCard(item)).join('');
    attachCardEvents(grid);
}

function renderCard(item) {
    const sizes = item.sizes || [
        {size:'small', price: Math.round(item.price * 0.8)},
        {size:'medium', price: item.price},
        {size:'large', price: Math.round(item.price * 1.3)}
    ];
    const defaultSize = sizes.find(s => s.size === 'medium') || sizes[0];
    const inWishlist = wishlistIds.has(Number(item.id));
    
    return `<article class="drink-card" data-menu-id="${Number(item.id)}">
        <div class="drink-image">
            <img src="${imageByName[item.name] || '../kopsu%20jago.jfif'}" alt="${esc(item.name)}">
        </div>
        <div class="drink-body">
            <h3>${esc(item.name)}</h3>
            <p class="drink-category">${esc(item.category || 'Minuman')}</p>
            ${item.description ? `<p class="drink-desc">${esc(item.description)}</p>` : ''}
            <div class="size-selector">
                <label class="size-label">Ukuran:</label>
                <div class="size-options">
                    ${sizes.map((s, idx) => 
                        `<button class="size-btn ${idx === 1 ? 'active' : ''}" data-size="${s.size}" data-price="${s.price}">
                            ${sizeLabel[s.size]}<br><small>Rp ${Number(s.price).toLocaleString('id-ID')}</small>
                        </button>`
                    ).join('')}
                </div>
            </div>
            <div class="drink-bottom">
                <span class="drink-price" data-default-price="${defaultSize.price}">Rp ${Number(defaultSize.price).toLocaleString('id-ID')}</span>
                <div class="drink-actions">
                    <button class="wishlist-btn ${inWishlist ? 'active' : ''}" data-menu-id="${Number(item.id)}" title="Wishlist">♥</button>
                    <button class="drink-button" data-menu-id="${Number(item.id)}">Tambah</button>
                </div>
            </div>
        </div>
    </article>`;
}

function attachCardEvents(container) {
    // Size selection
    container.querySelectorAll('.size-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const card = this.closest('.drink-card');
            card.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const price = Number(this.dataset.price);
            card.querySelector('.drink-price').textContent = `Rp ${price.toLocaleString('id-ID')}`;
        });
    });

    // Add to cart
    container.querySelectorAll('.drink-button').forEach(btn => {
        btn.addEventListener('click', () => addToCart(btn));
    });

    // Wishlist
    container.querySelectorAll('.wishlist-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleWishlist(btn));
    });
}

async function addToCart(button) {
    if (!token()) { location.href = '../login.html'; return; }
    const card = button.closest('.drink-card');
    const menuId = Number(button.dataset.menuId);
    const selectedSize = card.querySelector('.size-btn.active');
    const size = selectedSize?.dataset.size || 'medium';
    
    button.disabled = true;
    const originalText = button.textContent;
    try {
        await api('cart', {
            method:'POST', 
            body:JSON.stringify({menu_id: menuId, size: size, qty: 1})
        });
        button.textContent = '✓ Ditambahkan';
        await loadCartCount();
        console.log('[Cart] Added:', {menuId, size});
    } catch (error) {
        console.error('[Cart] Error:', error);
        const status = document.getElementById('menu-status');
        if (status) status.textContent = error.message;
        button.textContent = '✗ Gagal';
    } finally {
        setTimeout(() => {
            button.disabled = false;
            button.textContent = originalText;
        }, 1400);
    }
}

async function toggleWishlist(button) {
    if (!token()) { location.href = '../login.html'; return; }
    const menuId = Number(button.dataset.menuId);
    const isActive = button.classList.contains('active');
    
    try {
        if (isActive) {
            await api(`wishlist?menu_id=${menuId}`, {method:'DELETE'});
            wishlistIds.delete(menuId);
            button.classList.remove('active');
            console.log('[Wishlist] Removed:', menuId);
        } else {
            await api('wishlist', {method:'POST', body:JSON.stringify({menu_id: menuId})});
            wishlistIds.add(menuId);
            button.classList.add('active');
            console.log('[Wishlist] Added:', menuId);
        }
    } catch (error) {
        console.error('[Wishlist] Error:', error);
        const status = document.getElementById('menu-status');
        if (status) status.textContent = error.message;
    }
}

// === INIT ===
showAccount();
loadCartCount();
loadWishlist();
loadMenu();
