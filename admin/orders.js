/**
 * ADMIN ORDERS MANAGEMENT - JAGO COFFEE
 * Full order lifecycle management with real API integration
 */

let allOrders = [];
let currentFilter = 'all';
let selectedOrder = null;

// ============================================================
// LOAD ORDERS
// ============================================================

async function loadOrders() {
    try {
        KJComponents.showLoading('orders-table-content');
        
        const response = await kjRequest('orders', { method: 'GET' });
        allOrders = response.data || [];
        
        console.log('[Orders] Loaded:', allOrders.length);
        
        renderOrders();
        updateOrdersCount();
        
    } catch (error) {
        console.error('[Orders] Failed to load:', error);
        document.getElementById('orders-table-content').innerHTML = `
            <div class="admin-empty">
                <h3>Failed to Load Orders</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadOrders()">Retry</button>
            </div>
        `;
    }
}

// ============================================================
// RENDER ORDERS TABLE
// ============================================================

function renderOrders() {
    const filtered = currentFilter === 'all' 
        ? allOrders 
        : allOrders.filter(o => o.status === currentFilter);
    
    const container = document.getElementById('orders-table-content');
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                <h3>No Orders Found</h3>
                <p>No orders match the selected filter.</p>
            </div>
        `;
        return;
    }
    
    const rows = filtered.map(order => `
        <tr>
            <td><strong>${escapeHtml(order.order_number)}</strong></td>
            <td>${escapeHtml(order.customer || 'Unknown')}</td>
            <td>${order.fulfillment_type === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}</td>
            <td>${formatRupiah(order.total_amount)}</td>
            <td>${statusBadge(order.status)}</td>
            <td>${statusBadge(order.payment_status)}</td>
            <td>${formatDate(order.created_at)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewOrderDetail(${order.id})">View</button>
            </td>
        </tr>
    `).join('');
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Total</th>
                    <th>Order Status</th>
                    <th>Payment</th>
                    <th>Created</th>
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
// UPDATE ORDERS COUNT
// ============================================================

function updateOrdersCount() {
    const filtered = currentFilter === 'all' 
        ? allOrders 
        : allOrders.filter(o => o.status === currentFilter);
    
    const countEl = document.getElementById('orders-count');
    if (countEl) {
        countEl.textContent = `${filtered.length} order${filtered.length !== 1 ? 's' : ''}`;
    }
}

// ============================================================
// VIEW ORDER DETAIL
// ============================================================

async function viewOrderDetail(orderId) {
    try {
        const response = await kjRequest(`orders/${orderId}`, { method: 'GET' });
        selectedOrder = response.data;
        
        renderOrderModal(selectedOrder);
        
        document.getElementById('order-modal').classList.add('show');
        
    } catch (error) {
        console.error('[Orders] Failed to load detail:', error);
        KJToast.error('Failed to load order details');
    }
}

// ============================================================
// RENDER ORDER MODAL
// ============================================================

function renderOrderModal(order) {
    const items = order.items || [];
    const itemsHtml = items.map(item => `
        <div class="order-item-row">
            <div>
                <strong>${escapeHtml(item.name)}</strong>
                <span style="color: var(--jago-gray-700); font-size: 13px;">
                    ${item.size ? ` • ${item.size}` : ''} • ${item.qty}x
                </span>
            </div>
            <div><strong>${formatRupiah(item.price * item.qty)}</strong></div>
        </div>
    `).join('');
    
    const addressHtml = order.address_line ? `
        <div style="margin-top: 20px;">
            <h4 style="margin-bottom: 8px;">Delivery Address</h4>
            <p style="margin: 0; color: var(--jago-gray-700);">
                ${escapeHtml(order.recipient_name || '')}<br>
                ${escapeHtml(order.phone || '')}<br>
                ${escapeHtml(order.address_line || '')}<br>
                ${escapeHtml(order.city || '')}, ${escapeHtml(order.province || '')} ${escapeHtml(order.postal_code || '')}
            </p>
        </div>
    ` : '';
    
    const notesHtml = order.notes ? `
        <div style="margin-top: 20px;">
            <h4 style="margin-bottom: 8px;">Notes</h4>
            <p style="margin: 0; color: var(--jago-gray-700);">${escapeHtml(order.notes)}</p>
        </div>
    ` : '';
    
    // Determine available status transitions
    const statusTransitions = {
        'pending': ['confirmed', 'cancelled'],
        'confirmed': ['processing', 'cancelled'],
        'processing': ['ready'],
        'ready': ['on_delivery', 'completed'],
        'on_delivery': ['completed'],
        'completed': [],
        'cancelled': []
    };
    
    const availableStatuses = statusTransitions[order.status] || [];
    const statusButtons = availableStatuses.map(newStatus => `
        <button class="btn btn-primary" onclick="updateOrderStatus(${order.id}, '${newStatus}')">
            ${newStatus.replace(/_/g, ' ').toUpperCase()}
        </button>
    `).join('');
    
    const cancelButton = ['pending', 'confirmed'].includes(order.status) ? `
        <button class="btn btn-secondary" onclick="cancelOrder(${order.id})">Cancel Order</button>
    ` : '';
    
    document.getElementById('modal-content').innerHTML = `
        <div class="modal-header">
            <h2 style="margin: 0;">Order ${escapeHtml(order.order_number)}</h2>
            <button class="modal-close" onclick="closeOrderModal()">&times;</button>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
            <div>
                <strong style="display: block; color: var(--jago-gray-700); font-size: 13px; margin-bottom: 4px;">Customer</strong>
                <span>${escapeHtml(order.customer || 'Unknown')}</span>
            </div>
            <div>
                <strong style="display: block; color: var(--jago-gray-700); font-size: 13px; margin-bottom: 4px;">Order Status</strong>
                ${statusBadge(order.status)}
            </div>
            <div>
                <strong style="display: block; color: var(--jago-gray-700); font-size: 13px; margin-bottom: 4px;">Payment Status</strong>
                ${statusBadge(order.payment_status)}
            </div>
            <div>
                <strong style="display: block; color: var(--jago-gray-700); font-size: 13px; margin-bottom: 4px;">Type</strong>
                <span>${order.fulfillment_type === 'delivery' ? '🚚 Delivery' : '🏪 Pickup'}</span>
            </div>
        </div>
        
        <div class="order-items-list">
            <h4>Order Items</h4>
            ${itemsHtml}
        </div>
        
        <div style="margin-top: 24px; padding-top: 16px; border-top: 2px solid var(--jago-gray-200);">
            <div class="order-item-row">
                <strong>Subtotal</strong>
                <span>${formatRupiah(order.subtotal)}</span>
            </div>
            ${order.discount_amount > 0 ? `
                <div class="order-item-row">
                    <strong>Discount</strong>
                    <span>-${formatRupiah(order.discount_amount)}</span>
                </div>
            ` : ''}
            <div class="order-item-row">
                <strong>Shipping</strong>
                <span>${formatRupiah(order.shipping_cost || 0)}</span>
            </div>
            <div class="order-item-row" style="border-top: 2px solid var(--jago-gray-200); padding-top: 12px;">
                <strong style="font-size: 18px;">Total</strong>
                <strong style="font-size: 18px; color: var(--jago-red);">${formatRupiah(order.total_amount)}</strong>
            </div>
        </div>
        
        ${addressHtml}
        ${notesHtml}
        
        <div style="margin-top: 16px; font-size: 13px; color: var(--jago-gray-700);">
            <strong>Created:</strong> ${formatDate(order.created_at)}<br>
            <strong>Last Updated:</strong> ${formatDate(order.updated_at)}
        </div>
        
        ${statusButtons || cancelButton ? `
            <div class="status-actions">
                <h4 style="width: 100%; margin-bottom: 12px;">Update Order Status</h4>
                ${statusButtons}
                ${cancelButton}
            </div>
        ` : ''}
    `;
}

// ============================================================
// UPDATE ORDER STATUS
// ============================================================

async function updateOrderStatus(orderId, newStatus) {
    if (!confirm(`Update order status to "${newStatus.replace(/_/g, ' ')}"?`)) {
        return;
    }
    
    try {
        await kjRequest(`orders/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newStatus })
        });
        
        KJToast.success('Order status updated successfully');
        
        // Reload orders and refresh modal
        await loadOrders();
        await viewOrderDetail(orderId);
        
    } catch (error) {
        console.error('[Orders] Failed to update status:', error);
        KJToast.error(error.message || 'Failed to update order status');
    }
}

// ============================================================
// CANCEL ORDER
// ============================================================

async function cancelOrder(orderId) {
    if (!confirm('Cancel this order? Stock will be restored.')) {
        return;
    }
    
    try {
        await kjRequest(`orders/${orderId}/cancel`, {
            method: 'PATCH'
        });
        
        KJToast.success('Order cancelled successfully');
        
        // Reload orders and refresh modal
        await loadOrders();
        await viewOrderDetail(orderId);
        
    } catch (error) {
        console.error('[Orders] Failed to cancel:', error);
        KJToast.error(error.message || 'Failed to cancel order');
    }
}

// ============================================================
// CLOSE MODAL
// ============================================================

function closeOrderModal() {
    document.getElementById('order-modal').classList.remove('show');
    selectedOrder = null;
}

// ============================================================
// FILTER BUTTONS
// ============================================================

function initFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Re-render
            renderOrders();
            updateOrdersCount();
        });
    });
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
// MODAL CLOSE ON OUTSIDE CLICK
// ============================================================

document.addEventListener('click', (e) => {
    const modal = document.getElementById('order-modal');
    if (e.target === modal) {
        closeOrderModal();
    }
});

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Orders] Initializing...');
    
    initFilterButtons();
    await loadOrders();
    
    // Auto-refresh every 30 seconds
    setInterval(() => {
        if (!document.getElementById('order-modal').classList.contains('show')) {
            loadOrders();
        }
    }, 30000);
    
    console.log('[Orders] Initialized');
});
