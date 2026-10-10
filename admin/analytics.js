/**
 * ADMIN ANALYTICS - JAGO COFFEE
 * Business insights with Chart.js visualizations
 */

let allOrders = [];
let currentPeriod = 7;
let charts = {};

// ============================================================
// LOAD ANALYTICS DATA
// ============================================================

async function loadAnalytics() {
    try {
        KJComponents.showLoading('summary-stats');
        
        const response = await kjRequest('orders', { method: 'GET' });
        allOrders = response.data || [];
        
        console.log('[Analytics] Loaded:', allOrders.length);
        
        renderAnalytics();
        
    } catch (error) {
        console.error('[Analytics] Failed to load:', error);
        document.getElementById('summary-stats').innerHTML = `
            <div class="admin-empty">
                <h3>Failed to Load Analytics</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadAnalytics()">Retry</button>
            </div>
        `;
    }
}

// ============================================================
// CHANGE PERIOD
// ============================================================

function changePeriod(days) {
    currentPeriod = days;
    
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.period) === days);
    });
    
    renderAnalytics();
}

// ============================================================
// RENDER ANALYTICS
// ============================================================

function renderAnalytics() {
    const filteredOrders = filterOrdersByPeriod(allOrders, currentPeriod);
    
    renderSummaryStats(filteredOrders);
    renderRevenueChart(filteredOrders);
    renderOrdersChart(filteredOrders);
    renderProductsChart(filteredOrders);
    renderStatusChart(filteredOrders);
}

// ============================================================
// FILTER ORDERS BY PERIOD
// ============================================================

function filterOrdersByPeriod(orders, days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return orders.filter(o => new Date(o.created_at) >= cutoff);
}

// ============================================================
// SUMMARY STATS
// ============================================================

function renderSummaryStats(orders) {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    
    const customers = new Set(orders.map(o => o.user_id));
    
    document.getElementById('summary-stats').innerHTML = `
        <div class="admin-stat-card">
            <div class="stat-value">${formatRupiah(totalRevenue)}</div>
            <div class="stat-label">Total Revenue (${currentPeriod}d)</div>
        </div>
        <div class="admin-stat-card">
            <div class="stat-value">${orders.length}</div>
            <div class="stat-label">Total Orders</div>
        </div>
        <div class="admin-stat-card">
            <div class="stat-value">${formatRupiah(avgOrderValue)}</div>
            <div class="stat-label">Avg Order Value</div>
        </div>
        <div class="admin-stat-card">
            <div class="stat-value">${customers.size}</div>
            <div class="stat-label">Unique Customers</div>
        </div>
    `;
}

// ============================================================
// REVENUE CHART
// ============================================================

function renderRevenueChart(orders) {
    const dailyRevenue = groupByDay(orders.filter(o => o.status === 'completed'), currentPeriod);
    
    const ctx = document.getElementById('revenue-chart');
    if (charts.revenue) charts.revenue.destroy();
    
    charts.revenue = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyRevenue.labels,
            datasets: [{
                label: 'Revenue',
                data: dailyRevenue.values,
                borderColor: '#DC2626',
                backgroundColor: 'rgba(220, 38, 38, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: value => formatRupiah(value, true)
                    }
                }
            }
        }
    });
}

// ============================================================
// ORDERS CHART
// ============================================================

function renderOrdersChart(orders) {
    const dailyOrders = groupByDay(orders, currentPeriod, true);
    
    const ctx = document.getElementById('orders-chart');
    if (charts.orders) charts.orders.destroy();
    
    charts.orders = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dailyOrders.labels,
            datasets: [{
                label: 'Orders',
                data: dailyOrders.values,
                backgroundColor: '#DC2626'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// ============================================================
// PRODUCTS CHART
// ============================================================

function renderProductsChart(orders) {
    const productCounts = {};
    
    orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const name = item.name || 'Unknown';
                productCounts[name] = (productCounts[name] || 0) + parseInt(item.quantity || 1);
            });
        }
    });
    
    const sorted = Object.entries(productCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const ctx = document.getElementById('products-chart');
    if (charts.products) charts.products.destroy();
    
    charts.products = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(([name]) => name.length > 20 ? name.substring(0, 20) + '...' : name),
            datasets: [{
                label: 'Quantity Sold',
                data: sorted.map(([, count]) => count),
                backgroundColor: '#F59E0B'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// ============================================================
// STATUS CHART
// ============================================================

function renderStatusChart(orders) {
    const statusCounts = {};
    orders.forEach(o => {
        const status = o.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    const ctx = document.getElementById('status-chart');
    if (charts.status) charts.status.destroy();
    
    const colors = {
        'completed': '#10B981',
        'pending': '#F59E0B',
        'confirmed': '#3B82F6',
        'processing': '#8B5CF6',
        'cancelled': '#DC2626'
    };
    
    charts.status = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts),
                backgroundColor: Object.keys(statusCounts).map(s => colors[s] || '#6B7280')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// ============================================================
// GROUP BY DAY
// ============================================================

function groupByDay(orders, days, countOnly = false) {
    const result = {};
    const today = new Date();
    
    // Initialize all days
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const key = date.toISOString().split('T')[0];
        result[key] = 0;
    }
    
    // Aggregate data
    orders.forEach(order => {
        const date = order.created_at.split(' ')[0]; // YYYY-MM-DD
        if (result.hasOwnProperty(date)) {
            if (countOnly) {
                result[date]++;
            } else {
                result[date] += parseFloat(order.total_amount || 0);
            }
        }
    });
    
    return {
        labels: Object.keys(result).map(d => {
            const date = new Date(d);
            return `${date.getDate()}/${date.getMonth() + 1}`;
        }),
        values: Object.values(result)
    };
}

// ============================================================
// FORMAT RUPIAH (SHORT)
// ============================================================

function formatRupiah(amount, short = false) {
    if (short && amount >= 1000000) {
        return 'Rp' + (amount / 1000000).toFixed(1) + 'M';
    }
    if (short && amount >= 1000) {
        return 'Rp' + (amount / 1000).toFixed(1) + 'K';
    }
    return 'Rp' + new Intl.NumberFormat('id-ID').format(Math.round(amount));
}

// ============================================================
// INIT
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Analytics] Initializing...');
    
    await loadAnalytics();
    
    console.log('[Analytics] Initialized');
});
