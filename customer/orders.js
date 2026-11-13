/**
 * ORDERS PAGE - JAGO COFFEE
 * Production-ready
 */

let allOrders = [];
let currentStatus = 'all';

const STATUS_CONFIG = {
    pending: { label: 'Menunggu Pembayaran', color: 'warning' },
    confirmed: { label: 'Dikonfirmasi', color: 'info' },
    processing: { label: 'Diproses', color: 'info' },
    ready: { label: 'Siap', color: 'info' },
    on_delivery: { label: 'Dikirim', color: 'info' },
    completed: { label: 'Selesai', color: 'success' },
    cancelled: { label: 'Dibatalkan', color: 'error' }
};

const PAYMENT_STATUS_LABEL = {
    pending: 'Belum Dibayar',
    paid: 'Lunas',
    failed: 'Gagal',
    refunded: 'Dikembalikan'
};

const PAYMENT_METHOD_LABEL = {
    cash: 'Tunai (COD)',
    qris: 'QRIS',
    bank_transfer: 'Transfer Bank',
    ewallet: 'E-Wallet'
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

/**
 * Filter order berdasarkan tab:
 *  - all              : semua pesanan
 *  - payment_process  : belum lunas & belum dibatalkan (menunggu pembayaran)
 *  - completed        : status selesai
 *  - cancelled        : status dibatalkan
 *  - history          : riwayat pembelian (sudah dibayar)
 */
function filterByTab(status) {
    switch (status) {
        case 'payment_process':
            return allOrders.filter(o =>
                o.status !== 'cancelled' &&
                o.status !== 'completed' &&
                o.payment_status !== 'paid'
            );
        case 'completed':
            return allOrders.filter(o => o.payment_status === 'paid');
        case 'cancelled':
            return allOrders.filter(o => o.status === 'cancelled');
        case 'history':
            return allOrders.filter(o => o.payment_status === 'paid');
        case 'all':
        default:
            return allOrders;
    }
}

const EMPTY_MESSAGE = {
    all: 'Anda belum memiliki pesanan.',
    payment_process: 'Tidak ada pesanan yang menunggu pembayaran.',
    completed: 'Belum ada pesanan yang selesai.',
    cancelled: 'Tidak ada pesanan yang dibatalkan.',
    history: 'Belum ada riwayat pembelian. Riwayat muncul setelah pembayaran lunas.'
};

function renderOrders() {
    const container = document.getElementById('orders-container');
    const filtered = filterByTab(currentStatus);

    if (filtered.length === 0) {
        showEmptyState(container, {
            icon: '📦',
            title: 'Tidak Ada Pesanan',
            message: EMPTY_MESSAGE[currentStatus] || 'Tidak ada pesanan.',
            actionText: 'Lihat Menu',
            onAction: () => window.location.href = 'home.html#menu'
        });
        return;
    }

    container.innerHTML = filtered.map(order => {
        const statusCfg = STATUS_CONFIG[order.status] || { label: order.status, color: 'neutral' };
        const items = order.items || [];
        const visibleItems = items.slice(0, 3);
        const remaining = items.length - visibleItems.length;

        return `
        <div class="order-card">
            <div class="order-header">
                <div>
                    <h3 class="order-number">${esc(order.order_number)}</h3>
                    <p class="order-date">${formatDate(order.created_at)}</p>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px">
                    <span class="kj-badge kj-badge-${statusCfg.color}">${esc(statusCfg.label)}</span>
                    <span style="font:600 11px var(--font-body);color:var(--jago-gray-700);text-transform:uppercase;letter-spacing:.04em">
                        ${esc(PAYMENT_STATUS_LABEL[order.payment_status] || order.payment_status || '-')}
                    </span>
                </div>
            </div>

            <div class="order-items">
                ${visibleItems.map(item => `
                    <div class="order-item">
                        <img src="${esc(getProductImage(item.name))}" alt="${esc(item.name)}" class="order-item-image">
                        <div class="order-item-info">
                            <p class="order-item-name">${esc(item.name)}</p>
                            <p class="order-item-detail">${item.qty}x ${formatRupiah(item.price)}</p>
                        </div>
                    </div>
                `).join('')}
                ${remaining > 0 ? `<p style="font-size: 12px; color: var(--jago-gray-700); margin-top: 8px;">+${remaining} item lainnya</p>` : ''}
            </div>

            <div class="order-footer">
                <div class="order-total">Total: ${formatRupiah(order.total_amount)}</div>
                <div class="order-actions">
                    ${order.status === 'on_delivery' || order.status === 'ready' ? `<a href="tracking.html?order_id=${order.id}" class="btn btn-primary btn-sm">Lacak</a>` : ''}
                    <button class="btn btn-secondary btn-sm" onclick="viewDetail(${order.id})">Lihat Struk</button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

/**
 * Struk digital — mencerminkan kondisi transaksi sesungguhnya
 * (status pesanan, status pembayaran, metode bayar, rincian biaya, waktu).
 */
async function viewDetail(orderId) {
    try {
        const order = await kjApi(`orders/${orderId}`);
        const statusCfg = STATUS_CONFIG[order.status] || { label: order.status, color: 'neutral' };
        const items = order.items || [];
        const subtotal = Number(order.subtotal || 0);
        const discount = Number(order.discount_amount || 0);
        const shipping = Number(order.shipping_cost || 0);
        const total = Number(order.total_amount || 0);

        const itemsHtml = items.map(item => `
            <div class="receipt-item">
                <div class="receipt-item-info">
                    <span class="receipt-item-name">${esc(item.name)}</span>
                    <span class="receipt-item-meta">${item.qty} x ${formatRupiah(item.price)}</span>
                </div>
                <div class="receipt-item-price">${formatRupiah(Number(item.price) * Number(item.qty))}</div>
            </div>
        `).join('');

        KJModal.show({
            title: 'Struk Digital',
            size: 'medium',
            html: `
                <div class="receipt-modal">
                    <div class="receipt-header">
                        <div class="receipt-brand">KOPI JAGO</div>
                        <div class="receipt-tagline">Minuman favorit, diantar dengan jago.</div>
                    </div>

                    <div class="receipt-meta-grid">
                        <div class="receipt-meta-row">
                            <span class="receipt-meta-label">No. Pesanan</span>
                            <span class="receipt-meta-value">${esc(order.order_number)}</span>
                        </div>
                        <div class="receipt-meta-row">
                            <span class="receipt-meta-label">Tanggal</span>
                            <span class="receipt-meta-value">${formatDate(order.created_at)}</span>
                        </div>
                        <div class="receipt-meta-row">
                            <span class="receipt-meta-label">Tipe</span>
                            <span class="receipt-meta-value">${esc(order.fulfillment_type === 'delivery' ? 'Delivery' : 'Pickup')}</span>
                        </div>
                        <div class="receipt-meta-row">
                            <span class="receipt-meta-label">Status Pesanan</span>
                            <span class="receipt-badge receipt-badge-${statusCfg.color}">${esc(statusCfg.label)}</span>
                        </div>
                        <div class="receipt-meta-row">
                            <span class="receipt-meta-label">Metode Bayar</span>
                            <span class="receipt-meta-value">${esc(PAYMENT_METHOD_LABEL[order.payment_method] || order.payment_method || '-')}</span>
                        </div>
                    </div>

                    <div class="receipt-divider"></div>

                    <div class="receipt-items">${itemsHtml}</div>

                    <div class="receipt-divider"></div>

                    <div class="receipt-summary">
                        <div class="receipt-summary-row">
                            <span>Subtotal</span>
                            <strong>${formatRupiah(subtotal)}</strong>
                        </div>
                        ${discount > 0 ? `<div class="receipt-summary-row"><span>Diskon</span><strong>-${formatRupiah(discount)}</strong></div>` : ''}
                        <div class="receipt-summary-row">
                            <span>Ongkir</span>
                            <strong>${shipping > 0 ? formatRupiah(shipping) : 'GRATIS'}</strong>
                        </div>
                        <div class="receipt-summary-row receipt-total-row">
                            <span>TOTAL</span>
                            <strong>${formatRupiah(total)}</strong>
                        </div>
                    </div>

                    <div class="receipt-foot">
                        Terima kasih telah memesan di Kopi Jago.<br>
                        Struk ini dibuat otomatis oleh sistem.
                    </div>
                </div>
            `,
            showConfirm: false,
            cancelText: 'Tutup'
        });
    } catch (error) {
        KJToast.error('Gagal memuat struk: ' + error.message);
    }
}

window.viewDetail = viewDetail;
console.log('[Orders] Loaded');
