/**
 * ADMIN PAYMENTS - JAGO COFFEE
 * Payment transaction monitoring via orders
 */

let allPayments = [];
let filteredPayments = [];
let currentFilter = 'all';

// ============================================================
// LOAD PAYMENTS
// ============================================================

async function loadPayments() {
    try {
        KJComponents.showLoading('payments-table-content');
        
        // Get orders with payment info
        const response = await kjRequest('orders', { method: 'GET' });
        const orders = response.data || [];
        
        // Extract payment information from orders
        allPayments = orders.map(order => ({
            order_id: order.id,
            order_number: order.order_number,
            customer: order.customer || 'Unknown',
            amount: parseFloat(order.total_amount || 0),
            payment_method: order.payment_method || 'N/A',
            payment_status: order.payment_status || 'pending',
            transaction_id: order.transaction_id || null,
            created_at: order.created_at,
            order_status: order.status
        }));
        
        console.log('[Payments] Loaded:', allPayments.length);
        
        filterPayments(currentFilter);
        
    } catch (error) {
        console.error('[Payments] Failed to load:', error);
        document.getElementById('payments-table-content').innerHTML = `
            <div class="admin-empty">
                <h3>Failed to Load Payments</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadPayments()">Retry</button>
            </div>
        `;
    }
}

// ============================================================
// FILTER PAYMENTS
// ============================================================

function filterPayments(filter) {
    currentFilter = filter;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Filter data
    if (filter === 'all') {
        filteredPayments = allPayments;
    } else {
        filteredPayments = allPayments.filter(p => p.payment_status === filter);
    }
    
    renderPaymentsTable();
    updatePaymentsCount();
}

// ============================================================
// RENDER PAYMENTS TABLE
// ============================================================

function renderPaymentsTable() {
    const container = document.getElementById('payments-table-content');
    
    if (filteredPayments.length === 0) {
        const message = currentFilter === 'all'
            ? 'No payment transactions found.'
            : `No transactions with status: ${currentFilter}.`;
        
        container.innerHTML = `
            <div class="admin-empty">
                <h3>No Transactions</h3>
                <p>${message}</p>
            </div>
        `;
        return;
    }
    
    // Sort by date descending
    const sorted = [...filteredPayments].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );
    
    const rows = sorted.map(payment => `
        <tr>
            <td>
                <strong>${escapeHtml(payment.order_number)}</strong><br>
                <span style="font-size: 12px; color: var(--jago-gray-700);">
                    ${payment.transaction_id || 'No transaction ID'}
                </span>
            </td>
            <td>${escapeHtml(payment.customer)}</td>
            <td><strong>${formatRupiah(payment.amount)}</strong></td>
            <td>${escapeHtml(payment.payment_method)}</td>
            <td>${getPaymentStatusBadge(payment.payment_status)}</td>
            <td>${statusBadge(payment.order_status)}</td>
            <td>${formatDate(payment.created_at)}</td>
            <td>
                <a href="orders.html#${payment.order_id}" class="btn btn-sm btn-ghost">View Order</a>
            </td>
        </tr>
    `).join('');
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Transaction / Order</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Payment Status</th>
                    <th>Order Status</th>
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
// PAYMENT STATUS BADGE
// ============================================================

function getPaymentStatusBadge(status) {
    const badges = {
        'settlement': '<span class="status-badge status-completed">✓ Success</span>',
        'pending': '<span class="status-badge status-pending">⏳ Pending</span>',
        'expire': '<span class="status-badge" style="background: var(--jago-gray-400);">Expired</span>',
        'cancel': '<span class="status-badge status-cancelled">✗ Cancelled</span>',
        'deny': '<span class="status-badge status-cancelled">✗ Denied</span>',
        'failure': '<span class="status-badge status-cancelled">✗ Failed</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

// ============================================================
// UPDATE COUNT
// ============================================================

function updatePaymentsCount() {
    const countEl = document.getElementById('payments-count');
    if (countEl) {
        const successCount = allPayments.filter(p => p.payment_status === 'settlement').length;
        const pendingCount = allPayments.filter(p => p.payment_status === 'pending').length;
        const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
        
        let text = `${filteredPayments.length} transaction${filteredPayments.length !== 1 ? 's' : ''}`;
        
        if (currentFilter === 'all') {
            text += ` (${successCount} success, ${pendingCount} pending, ${formatRupiah(totalAmount)} total)`;
        } else if (filteredPayments.length > 0) {
            text += ` — ${formatRupiah(totalAmount)} total`;
        }
        
        countEl.textContent = text;
    }
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
// AUTO REFRESH
// ============================================================

let refreshInterval;

function startAutoRefresh() {
    refreshInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
            loadPayments();
        }
    }, 60000); // Refresh every 60 seconds
}

function stopAutoRefresh() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
    }
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Payments] Initializing...');
    
    await loadPayments();
    startAutoRefresh();
    
    console.log('[Payments] Initialized');
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        loadPayments();
    }
});

window.addEventListener('beforeunload', () => {
    stopAutoRefresh();
});
