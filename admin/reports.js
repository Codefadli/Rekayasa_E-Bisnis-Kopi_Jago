/**
 * ADMIN REPORTS - JAGO COFFEE
 * Generate and export business reports
 */

let reportData = null;
let currentReportType = null;

// ============================================================
// INITIALIZE DATE INPUTS
// ============================================================

function initializeDateInputs() {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    document.getElementById('end-date').valueAsDate = today;
    document.getElementById('start-date').valueAsDate = lastMonth;
}

// ============================================================
// GENERATE REPORT
// ============================================================

async function generateReport() {
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const reportType = document.getElementById('report-type').value;
    
    if (!startDate || !endDate) {
        KJToast.error('Please select date range');
        return;
    }
    
    await generateReportByType(reportType, startDate, endDate);
}

// ============================================================
// QUICK GENERATE (LAST 30 DAYS)
// ============================================================

async function generateQuickReport(type) {
    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    
    const startDate = lastMonth.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    
    await generateReportByType(type, startDate, endDate);
}

// ============================================================
// GENERATE REPORT BY TYPE
// ============================================================

async function generateReportByType(type, startDate, endDate) {
    try {
        currentReportType = type;
        KJComponents.showLoading('report-content');
        document.getElementById('report-preview').style.display = 'block';
        
        // Fetch orders data
        const response = await kjRequest('orders', { method: 'GET' });
        const allOrders = response.data || [];
        
        // Filter by date range
        const filteredOrders = allOrders.filter(o => {
            const orderDate = o.created_at.split(' ')[0];
            return orderDate >= startDate && orderDate <= endDate;
        });
        
        switch(type) {
            case 'sales':
                reportData = generateSalesReport(filteredOrders);
                renderSalesReport(reportData, startDate, endDate);
                break;
            case 'orders':
                reportData = generateOrdersReport(filteredOrders);
                renderOrdersReport(reportData, startDate, endDate);
                break;
            case 'products':
                reportData = generateProductsReport(filteredOrders);
                renderProductsReport(reportData, startDate, endDate);
                break;
            case 'customers':
                reportData = generateCustomersReport(filteredOrders);
                renderCustomersReport(reportData, startDate, endDate);
                break;
        }
        
    } catch (error) {
        console.error('[Reports] Failed to generate:', error);
        document.getElementById('report-content').innerHTML = `
            <div class="admin-empty">
                <h3>Failed to Generate Report</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// ============================================================
// SALES REPORT
// ============================================================

function generateSalesReport(orders) {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const totalRevenue = completedOrders.reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0);
    const avgOrderValue = completedOrders.length > 0 ? totalRevenue / completedOrders.length : 0;
    
    return {
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        totalRevenue,
        avgOrderValue,
        orders: completedOrders
    };
}

function renderSalesReport(data, startDate, endDate) {
    document.getElementById('preview-title').textContent = `Sales Report (${startDate} to ${endDate})`;
    
    document.getElementById('report-content').innerHTML = `
        <div style="padding: 24px; background: white; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div>
                    <div style="font: 600 12px var(--font-body); color: var(--jago-gray-700); margin-bottom: 8px;">TOTAL REVENUE</div>
                    <div style="font: 700 24px var(--font-display); color: var(--jago-red);">${formatRupiah(data.totalRevenue)}</div>
                </div>
                <div>
                    <div style="font: 600 12px var(--font-body); color: var(--jago-gray-700); margin-bottom: 8px;">COMPLETED ORDERS</div>
                    <div style="font: 700 24px var(--font-display); color: var(--jago-green);">${data.completedOrders}</div>
                </div>
                <div>
                    <div style="font: 600 12px var(--font-body); color: var(--jago-gray-700); margin-bottom: 8px;">AVG ORDER VALUE</div>
                    <div style="font: 700 24px var(--font-display); color: var(--jago-blue);">${formatRupiah(data.avgOrderValue)}</div>
                </div>
            </div>
        </div>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order Number</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Payment</th>
                </tr>
            </thead>
            <tbody>
                ${data.orders.map(o => `
                    <tr>
                        <td>${escapeHtml(o.order_number)}</td>
                        <td>${escapeHtml(o.customer || 'Unknown')}</td>
                        <td>${formatDate(o.created_at)}</td>
                        <td><strong>${formatRupiah(o.total_amount)}</strong></td>
                        <td>${escapeHtml(o.payment_method || 'N/A')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============================================================
// ORDERS REPORT
// ============================================================

function generateOrdersReport(orders) {
    const statusCounts = {};
    orders.forEach(o => {
        const status = o.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    return { orders, statusCounts };
}

function renderOrdersReport(data, startDate, endDate) {
    document.getElementById('preview-title').textContent = `Orders Report (${startDate} to ${endDate})`;
    
    const statusHtml = Object.entries(data.statusCounts).map(([status, count]) => `
        <div>
            <div style="font: 600 12px var(--font-body); color: var(--jago-gray-700); margin-bottom: 8px;">${status.toUpperCase()}</div>
            <div style="font: 700 24px var(--font-display);">${count}</div>
        </div>
    `).join('');
    
    document.getElementById('report-content').innerHTML = `
        <div style="padding: 24px; background: white; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px;">
                ${statusHtml}
            </div>
        </div>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order Number</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Payment Status</th>
                </tr>
            </thead>
            <tbody>
                ${data.orders.map(o => `
                    <tr>
                        <td>${escapeHtml(o.order_number)}</td>
                        <td>${escapeHtml(o.customer || 'Unknown')}</td>
                        <td>${formatDate(o.created_at)}</td>
                        <td>${formatRupiah(o.total_amount)}</td>
                        <td>${statusBadge(o.status)}</td>
                        <td>${escapeHtml(o.payment_status || 'N/A')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============================================================
// PRODUCTS REPORT
// ============================================================

function generateProductsReport(orders) {
    const productStats = {};
    
    orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
                const name = item.name || 'Unknown';
                if (!productStats[name]) {
                    productStats[name] = { quantity: 0, revenue: 0 };
                }
                productStats[name].quantity += parseInt(item.quantity || 1);
                productStats[name].revenue += parseFloat(item.price || 0) * parseInt(item.quantity || 1);
            });
        }
    });
    
    const products = Object.entries(productStats).map(([name, stats]) => ({
        name,
        quantity: stats.quantity,
        revenue: stats.revenue
    })).sort((a, b) => b.quantity - a.quantity);
    
    return { products };
}

function renderProductsReport(data, startDate, endDate) {
    document.getElementById('preview-title').textContent = `Products Report (${startDate} to ${endDate})`;
    
    const totalQuantity = data.products.reduce((sum, p) => sum + p.quantity, 0);
    const totalRevenue = data.products.reduce((sum, p) => sum + p.revenue, 0);
    
    document.getElementById('report-content').innerHTML = `
        <div style="padding: 24px; background: white; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div>
                    <div style="font: 600 12px var(--font-body); color: var(--jago-gray-700); margin-bottom: 8px;">TOTAL PRODUCTS</div>
                    <div style="font: 700 24px var(--font-display);">${data.products.length}</div>
                </div>
                <div>
                    <div style="font: 600 12px var(--font-body); color: var(--jago-gray-700); margin-bottom: 8px;">TOTAL SOLD</div>
                    <div style="font: 700 24px var(--font-display); color: var(--jago-green);">${totalQuantity}</div>
                </div>
                <div>
                    <div style="font: 600 12px var(--font-body); color: var(--jago-gray-700); margin-bottom: 8px;">TOTAL REVENUE</div>
                    <div style="font: 700 24px var(--font-display); color: var(--jago-red);">${formatRupiah(totalRevenue)}</div>
                </div>
            </div>
        </div>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th>Product Name</th>
                    <th>Quantity Sold</th>
                    <th>Revenue</th>
                </tr>
            </thead>
            <tbody>
                ${data.products.map(p => `
                    <tr>
                        <td><strong>${escapeHtml(p.name)}</strong></td>
                        <td>${p.quantity}</td>
                        <td><strong>${formatRupiah(p.revenue)}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============================================================
// CUSTOMERS REPORT
// ============================================================

function generateCustomersReport(orders) {
    const customerStats = {};
    
    orders.forEach(order => {
        const userId = order.user_id;
        const customer = order.customer || 'Unknown';
        
        if (!customerStats[userId]) {
            customerStats[userId] = {
                name: customer,
                orders: 0,
                spent: 0
            };
        }
        
        customerStats[userId].orders++;
        if (order.status === 'completed') {
            customerStats[userId].spent += parseFloat(order.total_amount || 0);
        }
    });
    
    const customers = Object.values(customerStats).sort((a, b) => b.spent - a.spent);
    
    return { customers };
}

function renderCustomersReport(data, startDate, endDate) {
    document.getElementById('preview-title').textContent = `Customers Report (${startDate} to ${endDate})`;
    
    const totalSpent = data.customers.reduce((sum, c) => sum + c.spent, 0);
    const totalOrders = data.customers.reduce((sum, c) => sum + c.orders, 0);
    
    document.getElementById('report-content').innerHTML = `
        <div style="padding: 24px; background: white; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div>
                    <div style="font: 600 12px var(--font-body); color: var(--jago-gray-700); margin-bottom: 8px;">TOTAL CUSTOMERS</div>
                    <div style="font: 700 24px var(--font-display);">${data.customers.length}</div>
                </div>
                <div>
                    <div style="font: 600 12px var(--font-body); color: var(--jago-gray-700); margin-bottom: 8px;">TOTAL ORDERS</div>
                    <div style="font: 700 24px var(--font-display);">${totalOrders}</div>
                </div>
                <div>
                    <div style="font: 600 12px var(--font-body); color: var(--jago-gray-700); margin-bottom: 8px;">TOTAL SPENT</div>
                    <div style="font: 700 24px var(--font-display); color: var(--jago-red);">${formatRupiah(totalSpent)}</div>
                </div>
            </div>
        </div>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th>Customer Name</th>
                    <th>Total Orders</th>
                    <th>Total Spent</th>
                </tr>
            </thead>
            <tbody>
                ${data.customers.map(c => `
                    <tr>
                        <td><strong>${escapeHtml(c.name)}</strong></td>
                        <td>${c.orders}</td>
                        <td><strong>${formatRupiah(c.spent)}</strong></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============================================================
// EXPORT CSV
// ============================================================

function exportCSV() {
    if (!reportData || !currentReportType) {
        KJToast.error('No report to export');
        return;
    }
    
    let csvContent = '';
    const filename = `${currentReportType}-report-${new Date().toISOString().split('T')[0]}.csv`;
    
    // Generate CSV based on report type
    switch(currentReportType) {
        case 'sales':
            csvContent = 'Order Number,Customer,Date,Amount,Payment Method\n';
            reportData.orders.forEach(o => {
                csvContent += `"${o.order_number}","${o.customer || 'Unknown'}","${o.created_at}","${o.total_amount}","${o.payment_method || 'N/A'}"\n`;
            });
            break;
        case 'orders':
            csvContent = 'Order Number,Customer,Date,Amount,Status,Payment Status\n';
            reportData.orders.forEach(o => {
                csvContent += `"${o.order_number}","${o.customer || 'Unknown'}","${o.created_at}","${o.total_amount}","${o.status}","${o.payment_status || 'N/A'}"\n`;
            });
            break;
        case 'products':
            csvContent = 'Product Name,Quantity Sold,Revenue\n';
            reportData.products.forEach(p => {
                csvContent += `"${p.name}","${p.quantity}","${p.revenue}"\n`;
            });
            break;
        case 'customers':
            csvContent = 'Customer Name,Total Orders,Total Spent\n';
            reportData.customers.forEach(c => {
                csvContent += `"${c.name}","${c.orders}","${c.spent}"\n`;
            });
            break;
    }
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    
    KJToast.success('Report exported successfully');
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

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Reports] Initializing...');
    
    initializeDateInputs();
    
    console.log('[Reports] Initialized');
});
