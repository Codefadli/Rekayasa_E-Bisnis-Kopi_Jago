/**
 * ADMIN DASHBOARD - JAGO COFFEE
 * Real-time metrics and recent orders display
 */

let allOrders = [];
let dashboardRefreshInterval = null;

// ============================================================
// LOAD DASHBOARD DATA
// ============================================================

async function loadDashboardData() {
    try {
        // Fetch orders
        const ordersResponse = await kjRequest('orders', { method: 'GET' });
        allOrders = ordersResponse.data || [];
        
        // Calculate metrics
        const today = new Date().toISOString().split('T')[0];
        const todayOrders = allOrders.filter(o => o.created_at.startsWith(today));
        const pendingOrders = allOrders.filter(o => o.status === 'pending');
        const completedToday = todayOrders.filter(o => o.status === 'completed');
        
        const revenueToday = completedToday.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
        
        // Update stats
        document.getElementById('stat-orders-today').textContent = todayOrders.length;
        document.getElementById('stat-pending').textContent = pendingOrders.length;
        document.getElementById('stat-revenue').textContent = formatRupiah(revenueToday);
        
        // Update recent orders table
        renderRecentOrders(allOrders.slice(0, 10));
        
        console.log('[Dashboard] Data loaded:', {
            total: allOrders.length,
            today: todayOrders.length,
            pending: pendingOrders.length,
            revenue: revenueToday
        });
        
    } catch (error) {
        console.error('[Dashboard] Failed to load data:', error);
        KJToast.error('Failed to load dashboard data');
    }
}

// ============================================================
// LOAD CUSTOMER COUNT
// ============================================================

async function loadCustomerCount() {
    try {
        // Note: Backend doesn't have a dedicated /admin/customers endpoint yet
        // We'll infer from orders for now
        const uniqueCustomers = new Set(allOrders.map(o => o.user_id)).size;
        document.getElementById('stat-customers').textContent = uniqueCustomers;
    } catch (error) {
        console.warn('[Dashboard] Failed to load customer count:', error);
    }
}

// ============================================================
// RENDER RECENT ORDERS TABLE
// ============================================================

function renderRecentOrders(orders) {
    const container = document.getElementById('recent-orders-table');
    
    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                <h3>No Orders Yet</h3>
                <p>Orders will appear here once customers start placing them.</p>
            </div>
        `;
        return;
    }
    
    const rows = orders.map(order => `
        <tr>
            <td><strong>${escapeHtml(order.order_number)}</strong></td>
            <td>${escapeHtml(order.customer || 'Unknown')}</td>
            <td>${formatRupiah(order.total_amount)}</td>
            <td>${statusBadge(order.status)}</td>
            <td>${statusBadge(order.payment_status)}</td>
            <td>${formatDate(order.created_at)}</td>
            <td>
                <a href="orders.html?id=${order.id}" class="btn btn-sm btn-ghost">View</a>
            </td>
        </tr>
    `).join('');
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Order Status</th>
                    <th>Payment</th>
                    <th>Date</th>
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
    return String(text).replace(/[&<>"']/g, m => map[m]);
}

// ============================================================
// AUTO REFRESH
// ============================================================

function startAutoRefresh() {
    // Refresh every 30 seconds
    dashboardRefreshInterval = setInterval(() => {
        loadDashboardData();
        console.log('[Dashboard] Auto-refresh triggered');
    }, 30000);
}

function stopAutoRefresh() {
    if (dashboardRefreshInterval) {
        clearInterval(dashboardRefreshInterval);
        dashboardRefreshInterval = null;
    }
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Dashboard] Initializing...');
    
    // Load initial data
    await loadDashboardData();
    await loadCustomerCount();
    
    // Start auto-refresh
    startAutoRefresh();
    
    // Stop refresh when page is hidden (save bandwidth)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            stopAutoRefresh();
        } else {
            startAutoRefresh();
        }
    });
    
    console.log('[Dashboard] Initialized');
});
