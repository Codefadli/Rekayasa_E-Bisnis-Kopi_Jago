/**
 * ORDERS PAGE - JAGO COFFEE
 * Production-ready
 */

let allOrders = [];
let currentStatus = 'all';

const STATUS_CONFIG = {
    pending: { label: 'Pending', color: 'warning' },
    confirmed: { label: 'Dikonfirmasi', color: 'info' },
    processing: { label: 'Diproses', color: 'info' },
    ready: { label: 'Siap', color: 'info' },
    on_delivery: { label: 'Dikirim', color: 'info' },
    completed: { label: 'Selesai', color: 'success' },
    cancelled: { label: 'Dibatalkan', color: 'error' }
};

document.addEventListener('DOMContentLoaded', async () => {
    if (!KJAuth.isAuthenticated()) {
        const ok = await KJModal.confirm('Login diperlukan. Login sekarang?', 'Login Required');
        if (ok) window.location.href = '../login.html';
        else window.location.href = 'home.html';
        return;
    }
    
    setupTabs();
    await loadOrders();
});

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentStatus = btn.dataset.status;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderOrders();
        });
    });
}

async function loadOrders() {
    const container = document.getElementById('orders-container');
    showLoading(container);
    
    try {
        allOrders = await kjApi('orders');
        console.log('[Orders] Loaded:', allOrders.length);
        hideLoading(container);
        renderOrders();
    } catch (error) {
        console.error('[Orders] Error:', error);
        hideLoading(container);
        showErrorState(container, 'Gagal memuat pesanan: ' + error.message, loadOrders);
    }
}

function renderOrders() {
    const container = document.getElementById('orders-container');
    const filtered = currentStatus === 'all' ? allOrders : allOrders.filter(o => o.status === currentStatus);
    
    if (filtered.length === 0) {
        showEmptyState(container, {
            icon: '📦',
            title: 'Tidak Ada Pesanan',
            message: currentStatus === 'all' ? 'Anda belum memiliki pesanan.' : `Tidak ada pesanan dengan status "${STATUS_CONFIG[currentStatus]?.label || currentStatus}".`,
            actionText: 'Lihat Menu',
            onAction: () => window.location.href = 'home.html#menu'
        });
        return;
    }
    
    container.innerHTML = filtered.map(order => `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <h3 class="order-number">${esc(order.order_number)}</h3>
                    <p class="order-date">${formatDate(order.created_at)}</p>
                </div>
                <span class="kj-badge kj-badge-${STATUS_CONFIG[order.status]?.color || 'neutral'}">
                    ${esc(STATUS_CONFIG[order.status]?.label || order.status)}
                </span>
            </div>
            
            <div class="order-items">
                ${(order.items || []).slice(0, 3).map(item => `
                    <div class="order-item">
                        <img src="${esc(getProductImage(item.name))}" alt="${esc(item.name)}" class="order-item-image">
                        <div class="order-item-info">
                            <p class="order-item-name">${esc(item.name)}</p>
                            <p class="order-item-detail">${item.qty}x ${formatRupiah(item.price)}</p>
                        </div>
                    </div>
                `).join('')}
                ${(order.items || []).length > 3 ? `<p style="font-size: 12px; color: var(--jago-gray-700); margin-top: 8px;">+${(order.items || []).length - 3} item lainnya</p>` : ''}
            </div>
            
            <div class="order-footer">
                <div class="order-total">Total: ${formatRupiah(order.total_amount)}</div>
                <div class="order-actions">
                    ${order.status === 'on_delivery' || order.status === 'ready' ? `<a href="tracking.html?order_id=${order.id}" class="btn btn-primary btn-sm">Lacak</a>` : ''}
                    <button class="btn btn-secondary btn-sm" onclick="viewDetail(${order.id})">Detail</button>
                </div>
            </div>
        </div>
    `).join('');
}

async function viewDetail(orderId) {
    try {
        const order = await kjApi(`orders/${orderId}`);
        KJModal.show({
            title: order.order_number,
            size: 'medium',
            html: `
                <div style="padding: 8px 0;">
                    <p><strong>Status:</strong> <span class="kj-badge kj-badge-${STATUS_CONFIG[order.status]?.color}">${STATUS_CONFIG[order.status]?.label}</span></p>
                    <p><strong>Tanggal:</strong> ${formatDate(order.created_at)}</p>
                    <p><strong>Tipe:</strong> ${order.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup'}</p>
                    ${order.address_line ? `<p><strong>Alamat:</strong> ${esc(order.address_line)}, ${esc(order.city)}</p>` : ''}
                    <hr style="margin: 16px 0; border: none; border-top: 1px solid var(--jago-gray-200);">
                    <h4 style="margin: 16px 0 8px;">Items:</h4>
                    ${(order.items || []).map(item => `<p>• ${esc(item.name)} (${item.qty}x) - ${formatRupiah(item.price * item.qty)}</p>`).join('')}
                    <hr style="margin: 16px 0;">
                    <p><strong>Subtotal:</strong> ${formatRupiah(order.subtotal)}</p>
                    <p><strong>Diskon:</strong> ${formatRupiah(order.discount_amount)}</p>
                    <p><strong>Ongkir:</strong> ${formatRupiah(order.shipping_cost)}</p>
                    <p style="font-size: 18px; font-weight: 700; color: var(--jago-red);"><strong>Total:</strong> ${formatRupiah(order.total_amount)}</p>
                </div>
            `,
            showConfirm: false,
            cancelText: 'Tutup'
        });
    } catch (error) {
        KJToast.error('Gagal memuat detail: ' + error.message);
    }
}

window.viewDetail = viewDetail;
console.log('[Orders] Loaded');
