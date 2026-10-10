/**
 * ADMIN MENU MANAGEMENT - JAGO COFFEE
 * Product CRUD with categories, pricing, sizes, availability
 */

let allMenuItems = [];
let allCategories = [];

// ============================================================
// LOAD MENU ITEMS
// ============================================================

async function loadMenu() {
    try {
        KJComponents.showLoading('menu-table-content');
        
        // Use fallback loader
        allMenuItems = await loadMenuWithFallback();
        
        console.log('[Menu] Loaded:', allMenuItems.length);
        
        renderMenuTable();
        updateMenuCount();
        
    } catch (error) {
        console.error('[Menu] Failed to load:', error);
        document.getElementById('menu-table-content').innerHTML = `
            <div class="admin-empty">
                <h3>Failed to Load Menu</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadMenu()">Retry</button>
            </div>
        `;
    }
}

// ============================================================
// RENDER MENU TABLE
// ============================================================

function renderMenuTable() {
    const container = document.getElementById('menu-table-content');
    
    if (allMenuItems.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                <h3>No Products</h3>
                <p>Add your first product to get started.</p>
                <button class="btn btn-primary" onclick="showAddProductModal()">Add Product</button>
            </div>
        `;
        return;
    }
    
    const rows = allMenuItems.map(item => `
        <tr>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${escapeHtml(item.category || 'N/A')}</td>
            <td>${formatRupiah(item.price)}</td>
            <td>
                <span class="status-badge ${item.is_available == 1 ? 'status-completed' : 'status-cancelled'}">
                    ${item.is_available == 1 ? 'Available' : 'Unavailable'}
                </span>
            </td>
            <td>
                ${item.is_featured == 1 ? '<span class="status-badge status-pending">⭐ Featured</span>' : ''}
            </td>
            <td>${item.stock || 0}</td>
            <td>
                <button class="btn btn-sm btn-ghost" onclick="editProduct(${item.id})" title="Edit">✏️</button>
                <button class="btn btn-sm btn-ghost" onclick="toggleAvailability(${item.id}, ${item.is_available})" title="Toggle availability">
                    ${item.is_available == 1 ? '🔴' : '🟢'}
                </button>
            </td>
        </tr>
    `).join('');
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Availability</th>
                    <th>Featured</th>
                    <th>Stock</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

// ============================================================
// UPDATE MENU COUNT
// ============================================================

function updateMenuCount() {
    const countEl = document.getElementById('menu-count');
    if (countEl) {
        countEl.textContent = `${allMenuItems.length} product${allMenuItems.length !== 1 ? 's' : ''}`;
    }
}

// ============================================================
// TOGGLE AVAILABILITY
// ============================================================

async function toggleAvailability(productId, currentAvailability) {
    const newAvailability = currentAvailability == 1 ? 0 : 1;
    const action = newAvailability == 1 ? 'available' : 'unavailable';
    
    if (!confirm(`Mark this product as ${action}?`)) {
        return;
    }
    
    try {
        const product = allMenuItems.find(p => p.id === productId);
        
        await kjRequest('admin/menu', {
            method: 'PATCH',
            body: JSON.stringify({
                id: productId,
                category_id: product.category_id,
                name: product.name,
                description: product.description,
                price: product.price,
                is_available: newAvailability,
                is_featured: product.is_featured,
                stock: product.stock
            })
        });
        
        KJToast.success(`Product marked as ${action}`);
        await loadMenu();
        
    } catch (error) {
        console.error('[Menu] Failed to toggle availability:', error);
        KJToast.error(error.message || 'Failed to update product');
    }
}

// ============================================================
// EDIT PRODUCT (placeholder)
// ============================================================

function editProduct(productId) {
    const product = allMenuItems.find(p => p.id === productId);
    if (!product) {
        KJToast.error('Product not found');
        return;
    }
    
    // TODO: Implement edit modal
    KJToast.info('Edit functionality: Coming soon. Product ID: ' + productId);
    console.log('[Menu] Edit product:', product);
}

// ============================================================
// ADD PRODUCT (placeholder)
// ============================================================

function showAddProductModal() {
    // TODO: Implement add modal
    KJToast.info('Add product functionality: Coming soon');
}

// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Menu] Initializing...');
    
    await loadMenu();
    
    console.log('[Menu] Initialized');
});
