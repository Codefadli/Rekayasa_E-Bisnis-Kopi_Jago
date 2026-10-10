/**
 * ADMIN INVENTORY MANAGEMENT - JAGO COFFEE
 * Stock monitoring, low stock alerts, stock adjustments
 */

let allInventory = [];
let filteredInventory = [];
let currentFilter = 'all';
let selectedProduct = null;

const LOW_STOCK_THRESHOLD = 10;
const OUT_OF_STOCK = 0;

// ============================================================
// LOAD INVENTORY
// ============================================================

async function loadInventory() {
    try {
        KJComponents.showLoading('inventory-table-content');
        
        // Use fallback loader
        const inventoryData = await loadInventoryWithFallback();
        allInventory = inventoryData.map(item => ({
            ...item,
            stock: parseInt(item.current_stock) || 0,
            status: getStockStatus(parseInt(item.current_stock) || 0)
        }));
        
        console.log('[Inventory] Loaded:', allInventory.length);
        
        filterInventory(currentFilter);
        
    } catch (error) {
        console.error('[Inventory] Failed to load:', error);
        document.getElementById('inventory-table-content').innerHTML = `
            <div class="admin-empty">
                <h3>Failed to Load Inventory</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadInventory()">Retry</button>
            </div>
        `;
    }
}

// ============================================================
// STOCK STATUS HELPER
// ============================================================

function getStockStatus(stock) {
    if (stock <= OUT_OF_STOCK) return 'out';
    if (stock <= LOW_STOCK_THRESHOLD) return 'low';
    return 'ok';
}

function getStockStatusLabel(status) {
    const labels = {
        'out': 'Out of Stock',
        'low': 'Low Stock',
        'ok': 'In Stock'
    };
    return labels[status] || 'Unknown';
}

function getStockIndicatorClass(status) {
    return `stock-indicator stock-${status}`;
}

// ============================================================
// FILTER INVENTORY
// ============================================================

function filterInventory(filter) {
    currentFilter = filter;
    
    // Update filter button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Filter data
    if (filter === 'all') {
        filteredInventory = allInventory;
    } else {
        filteredInventory = allInventory.filter(item => item.status === filter);
    }
    
    renderInventoryTable();
    updateInventoryCount();
}

// ============================================================
// RENDER INVENTORY TABLE
// ============================================================

function renderInventoryTable() {
    const container = document.getElementById('inventory-table-content');
    
    if (filteredInventory.length === 0) {
        const message = currentFilter === 'all' 
            ? 'No inventory items found.' 
            : `No items with ${getStockStatusLabel(currentFilter).toLowerCase()}.`;
        
        container.innerHTML = `
            <div class="admin-empty">
                <h3>No Items</h3>
                <p>${message}</p>
            </div>
        `;
        return;
    }
    
    // Sort: out of stock first, then low stock, then by stock ascending
    const sorted = [...filteredInventory].sort((a, b) => {
        if (a.status !== b.status) {
            const order = { 'out': 0, 'low': 1, 'ok': 2 };
            return order[a.status] - order[b.status];
        }
        return a.stock - b.stock;
    });
    
    const rows = sorted.map(item => `
        <tr class="${item.status === 'out' ? 'highlight-danger' : item.status === 'low' ? 'highlight-warning' : ''}">
            <td>
                <span class="${getStockIndicatorClass(item.status)}"></span>
                <strong>${escapeHtml(item.name)}</strong>
            </td>
            <td>${escapeHtml(item.category || 'N/A')}</td>
            <td>
                <strong style="color: ${item.status === 'out' ? 'var(--jago-red)' : item.status === 'low' ? 'var(--jago-orange)' : 'var(--jago-green)'}">
                    ${item.stock}
                </strong>
            </td>
            <td>${getStockStatusLabel(item.status)}</td>
            <td>${formatRupiah(item.price)}</td>
            <td>
                <span class="status-badge ${item.is_available == 1 ? 'status-completed' : 'status-cancelled'}">
                    ${item.is_available == 1 ? 'Available' : 'Unavailable'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openAdjustModal(${item.id})">Adjust</button>
            </td>
        </tr>
    `).join('');
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Price</th>
                    <th>Availability</th>
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
// UPDATE INVENTORY COUNT
// ============================================================

function updateInventoryCount() {
    const countEl = document.getElementById('inventory-count');
    if (countEl) {
        const lowStockCount = allInventory.filter(i => i.status === 'low').length;
        const outStockCount = allInventory.filter(i => i.status === 'out').length;
        
        let text = `${filteredInventory.length} item${filteredInventory.length !== 1 ? 's' : ''}`;
        
        if (currentFilter === 'all' && (lowStockCount > 0 || outStockCount > 0)) {
            text += ` (${outStockCount} out, ${lowStockCount} low)`;
        }
        
        countEl.textContent = text;
    }
}

// ============================================================
// OPEN ADJUST STOCK MODAL
// ============================================================

function openAdjustModal(productId) {
    selectedProduct = allInventory.find(p => p.id === productId);
    if (!selectedProduct) {
        KJToast.error('Product not found');
        return;
    }
    
    document.getElementById('modal-product-name').textContent = selectedProduct.name;
    document.getElementById('current-stock').value = selectedProduct.stock;
    document.getElementById('adjustment-type').value = 'add';
    document.getElementById('adjustment-amount').value = '';
    document.getElementById('adjustment-reason').value = '';
    
    updateAdjustmentLabel();
    
    document.getElementById('adjust-stock-modal').classList.add('show');
}

// ============================================================
// CLOSE ADJUST MODAL
// ============================================================

function closeAdjustModal() {
    document.getElementById('adjust-stock-modal').classList.remove('show');
    selectedProduct = null;
}

// ============================================================
// UPDATE ADJUSTMENT LABEL
// ============================================================

function updateAdjustmentLabel() {
    const type = document.getElementById('adjustment-type').value;
    const label = document.getElementById('adjustment-amount-label');
    
    const labels = {
        'add': 'Amount to Add',
        'remove': 'Amount to Remove',
        'set': 'New Stock Level'
    };
    
    label.textContent = labels[type] || 'Amount';
}

// ============================================================
// SUBMIT STOCK ADJUSTMENT
// ============================================================

async function submitStockAdjustment(event) {
    event.preventDefault();
    
    if (!selectedProduct) {
        KJToast.error('No product selected');
        return;
    }
    
    const type = document.getElementById('adjustment-type').value;
    const amount = parseInt(document.getElementById('adjustment-amount').value);
    const reason = document.getElementById('adjustment-reason').value;
    const currentStock = selectedProduct.stock;
    
    let newStock;
    
    switch(type) {
        case 'add':
            newStock = currentStock + amount;
            break;
        case 'remove':
            newStock = Math.max(0, currentStock - amount);
            break;
        case 'set':
            newStock = amount;
            break;
        default:
            KJToast.error('Invalid adjustment type');
            return;
    }
    
    try {
        // Update via API
        await kjRequest('admin/menu', {
            method: 'PATCH',
            body: JSON.stringify({
                id: selectedProduct.id,
                category_id: selectedProduct.category_id,
                name: selectedProduct.name,
                description: selectedProduct.description,
                price: selectedProduct.price,
                is_available: selectedProduct.is_available,
                is_featured: selectedProduct.is_featured,
                stock: newStock
            })
        });
        
        KJToast.success(`Stock updated: ${currentStock} → ${newStock}`);
        
        closeAdjustModal();
        await loadInventory();
        
    } catch (error) {
        console.error('[Inventory] Failed to adjust stock:', error);
        KJToast.error(error.message || 'Failed to update stock');
    }
}

// ============================================================
// MODAL CLOSE ON OUTSIDE CLICK
// ============================================================

document.addEventListener('click', (e) => {
    const modal = document.getElementById('adjust-stock-modal');
    if (e.target === modal) {
        closeAdjustModal();
    }
});

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
    console.log('[Inventory] Initializing...');
    
    await loadInventory();
    
    console.log('[Inventory] Initialized');
});
