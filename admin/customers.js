/**
 * ADMIN CUSTOMERS MANAGEMENT - JAGO COFFEE
 * Customer listing, search, and order history
 */

let allCustomers = [];
let allOrders = [];
let filteredCustomers = [];

// ============================================================
// LOAD CUSTOMERS (from orders data)
// ============================================================

async function loadCustomers() {
    try {
        KJComponents.showLoading('customers-table-content');
        
        // Backend doesn't have dedicated /admin/customers endpoint
        // Workaround: derive customer list from orders
        const ordersResponse = await kjRequest('orders', { method: 'GET' });
        allOrders = ordersResponse.data || [];
        
        // Extract unique customers from orders
        const customerMap = new Map();
        allOrders.forEach(order => {
            if (!customerMap.has(order.user_id)) {
                customerMap.set(order.user_id, {
                    id: order.user_id,
                    name: order.customer || 'Unknown',
                    email: order.customer_email || 'N/A',
                    phone: order.address_phone || 'N/A',
                    total_orders: 0,
                    total_spent: 0,
                    last_order: order.created_at
                });
            }
            
            const customer = customerMap.get(order.user_id);
            customer.total_orders++;
            if (order.status === 'completed') {
                customer.total_spent += parseFloat(order.total_amount || 0);
            }
            
            // Track most recent order
            if (new Date(order.created_at) > new Date(customer.last_order)) {
                customer.last_order = order.created_at;
            }
        });
        
        allCustomers = Array.from(customerMap.values());
        filteredCustomers = allCustomers;
        
        console.log('[Customers] Loaded:', allCustomers.length);
        
        renderCustomers();
        updateCustomersCount();
        
    } catch (error) {
        console.error('[Customers] Failed to load:', error);
        document.getElementById('customers-table-content').innerHTML = `
            <div class="admin-empty">
                <h3>Failed to Load Customers</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadCustomers()">Retry</button>
            </div>
        `;
    }
}

// ============================================================
// SEARCH CUSTOMERS
// ============================================================

function performSearch() {
    const query = document.getElementById('search-input').value.toLowerCase().trim();
    
    if (!query) {
        filteredCustomers = allCustomers;
    } else {
        filteredCustomers = allCustomers.filter(c => 
            c.name.toLowerCase().includes(query) ||
            c.email.toLowerCase().includes(query) ||
            c.phone.toLowerCase().includes(query)
        );
    }
    
    renderCustomers();
    updateCustomersCount();
}

// Setup enter key search
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
});

// ============================================================
// RENDER CUSTOMERS TABLE
// ============================================================

function renderCustomers() {
    const container = document.getElementById('customers-table-content');
    
    if (filteredCustomers.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                <h3>No Customers Found</h3>
                <p>${document.getElementById('search-input').value ? 'Try a different search term.' : 'No customer data available yet.'}</p>
            </div>
        `;
        return;
    }
    
    // Sort by total spent (descending)
    const sorted = [...filteredCustomers].sort((a, b) => b.total_spent - a.total_spent);
    
    const rows = sorted.map(customer => `
        <tr>
            <td><strong>${escapeHtml(customer.name)}</strong></td>
            <td>${escapeHtml(customer.email)}</td>
            <td>${escapeHtml(customer.phone)}</td>
            <td>${customer.total_orders}</td>
            <td><strong>${formatRupiah(customer.total_spent)}</strong></td>
            <td>${formatDate(customer.last_order)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewCustomerDetail(${customer.id})">View</button>
            </td>
        </tr>
    `).join('');
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Total Orders</th>
                    <th>Total Spent</th>
                    <th>Last Order</th>
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
// UPDATE CUSTOMERS COUNT
// ============================================================

function updateCustomersCount() {
    const countEl = document.getElementById('customers-count');
    if (countEl) {
        countEl.textContent = `${filteredCustomers.length} customer${filteredCustomers.length !== 1 ? 's' : ''}`;
    }
}

// ============================================================
// VIEW CUSTOMER DETAIL
// ============================================================

function viewCustomerDetail(customerId) {
    const customer = allCustomers.find(c => c.id === customerId);
    if (!customer) {
        KJToast.error('Customer not found');
        return;
    }
    
    // Get customer orders
    const customerOrders = allOrders.filter(o => o.user_id === customerId);
    
    renderCustomerModal(customer, customerOrders);
    
    document.getElementById('customer-modal').classList.add('show');
}

// ============================================================
// RENDER CUSTOMER MODAL
// ============================================================

function renderCustomerModal(customer, orders) {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const pendingOrders = orders.filter(o => ['pending', 'confirmed', 'processing'].includes(o.status));
    const cancelledOrders = orders.filter(o => o.status === 'cancelled');
    
    const ordersHtml = orders.length > 0 ? orders.slice(0, 10).map(order => `
        <div class="order-item-row">
            <div>
                <strong>${escapeHtml(order.order_number)}</strong><br>
                <span style="color: var(--jago-gray-700); font-size: 13px;">
                    ${formatDate(order.created_at)}
                </span>
            </div>
            <div style="text-align: right;">
                ${statusBadge(order.status)}<br>
                <strong style="margin-top: 4px; display: inline-block;">${formatRupiah(order.total_amount)}</strong>
            </div>
        </div>
    `).join('') : '<p style="color: var(--jago-gray-700); text-align: center; padding: 20px;">No orders yet</p>';
    
    document.getElementById('modal-content').innerHTML = `
        <div class="modal-header">
            <h2 style="margin: 0;">${escapeHtml(customer.name)}</h2>
            <button class="modal-close" onclick="closeCustomerModal()">&times;</button>
        </div>
        
        <div class="customer-info-grid">
            <div class="info-item">
                <label>Email</label>
                <div class="value">${escapeHtml(customer.email)}</div>
            </div>
            <div class="info-item">
                <label>Phone</label>
                <div class="value">${escapeHtml(customer.phone)}</div>
            </div>
            <div class="info-item">
                <label>Customer ID</label>
                <div class="value">#${customer.id}</div>
            </div>
            <div class="info-item">
                <label>Last Order</label>
                <div class="value">${formatDate(customer.last_order)}</div>
            </div>
        </div>
        
        <div class="section-divider"></div>
        
        <h3 style="margin-bottom: 16px;">Order Statistics</h3>
        <div class="customer-info-grid">
            <div class="info-item">
                <label>Total Orders</label>
                <div class="value" style="font-size: 24px; font-weight: 700; color: var(--jago-blue);">${customer.total_orders}</div>
            </div>
            <div class="info-item">
                <label>Completed</label>
                <div class="value" style="font-size: 24px; font-weight: 700; color: var(--jago-green);">${completedOrders.length}</div>
            </div>
            <div class="info-item">
                <label>Pending/Processing</label>
                <div class="value" style="font-size: 24px; font-weight: 700; color: var(--jago-orange);">${pendingOrders.length}</div>
            </div>
            <div class="info-item">
                <label>Total Spent</label>
                <div class="value" style="font-size: 24px; font-weight: 700; color: var(--jago-red);">${formatRupiah(customer.total_spent)}</div>
            </div>
        </div>
        
        <div class="section-divider"></div>
        
        <h3 style="margin-bottom: 16px;">Recent Orders (Last 10)</h3>
        <div class="order-items-list">
            ${ordersHtml}
        </div>
        
        ${orders.length > 10 ? `<p style="text-align: center; margin-top: 16px; color: var(--jago-gray-700); font-size: 13px;">Showing 10 of ${orders.length} orders</p>` : ''}
        
        <div style="margin-top: 24px; text-align: center;">
            <a href="orders.html" class="btn btn-primary">View All Orders</a>
        </div>
    `;
}

// ============================================================
// CLOSE MODAL
// ============================================================

function closeCustomerModal() {
    document.getElementById('customer-modal').classList.remove('show');
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
    const modal = document.getElementById('customer-modal');
    if (e.target === modal) {
        closeCustomerModal();
    }
});

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Customers] Initializing...');
    
    await loadCustomers();
    
    console.log('[Customers] Initialized');
});
