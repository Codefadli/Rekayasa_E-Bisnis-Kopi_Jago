// Checkout Logic - Payment flow: bank selection -> dummy VA -> digital receipt -> submit order
// Shared utilities (esc, token, api) loaded from shared.js

let cartItems = [];
let selectedPaymentMethod = null;   // 'bank_transfer' | 'qris'
let selectedBankCode = null;        // 'bca' | 'bni' | ...
let selectedBankName = null;
let vaNumber = null;
let receiptData = null;
let isSubmitting = false;

const BANKS = [
    { code: 'bca', name: 'BCA', color: '#0060a9' },
    { code: 'bni', name: 'BNI', color: '#f15a22' },
    { code: 'bri', name: 'BRI', color: '#00529c' },
    { code: 'mandiri', name: 'Mandiri', color: '#003d29' },
    { code: 'bsi', name: 'BSI', color: '#1a9e8f' },
    { code: 'seabank', name: 'SeaBank', color: '#f5821f' }
];

async function loadCartAndCheckout() {
    if (!token()) {
        location.href = '../login.html';
        return;
    }
    
    try {
        cartItems = await api('cart');
        
        if (cartItems.length === 0) {
            alert('Keranjang kosong');
            location.href = 'cart.html';
            return;
        }
        
        renderOrderItems();
        renderPaymentMethods();
        renderSummary();
    } catch (error) {
        console.error('[Checkout] Load error:', error);
        alert('Gagal memuat data: ' + error.message);
    }
}

function renderOrderItems() {
    const container = document.getElementById('order-items-container');
    if (!container) return;
    
    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    
    container.innerHTML = cartItems.map(item => `
        <div class="cart-item">
            <img src="${esc(getProductImage(item.name))}" alt="${esc(item.name)}" class="cart-item-image">
            <div class="cart-item-info">
                <h3 class="cart-item-name">${esc(item.name)}</h3>
                <p class="cart-item-size">${esc(getSizeLabel(item.size))} | ${esc(item.description || '')}</p>
                <div class="cart-item-qty">x${esc(item.qty)}</div>
                <div class="cart-item-price">Rp ${Number(item.subtotal).toLocaleString('id-ID')}</div>
            </div>
        </div>
    `).join('') + `
        <div class="summary-row">
            <span>Subtotal</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span>
        </div>
    `;
}

function getSelectedPaymentCode() {
    if (selectedPaymentMethod === 'bank_transfer') return selectedBankCode || 'bank_transfer';
    return selectedPaymentMethod;
}

function renderPaymentMethods() {
    const container = document.getElementById('payment-methods');
    if (!container) return;

    const methods = [
        { code: 'bank_transfer', icon: '🏦', name: 'Transfer Bank', desc: 'Transfer ke rekening bank (BCA, BNI, BRI, Mandiri, BSI, SeaBank)' },
        { code: 'qris', icon: '📱', name: 'QRIS', desc: 'Scan QR Code dengan aplikasi e-wallet atau banking' }
    ];

    const html = methods.map(m => `
        <button class="payment-btn ${selectedPaymentMethod === m.code ? 'v' : ''}"
                onclick="selectPaymentMethod('${m.code}')"
                type="button">
            <span class="payment-btn-icon">${esc(m.icon)}</span>
            <div class="payment-btn-info">
                <div class="payment-btn-name">${esc(m.name)}</div>
                <div class="payment-btn-desc">${esc(m.desc)}</div>
            </div>
            <span class="payment-btn-check">✓</span>
        </button>
    `).join('');

    container.innerHTML = html;

    const bankDetail = document.getElementById('bank-transfer-detail');
    if (bankDetail) {
        bankDetail.innerHTML = selectedPaymentMethod === 'bank_transfer' ? renderBankSelector() : '';
    }

    const qrisSection = document.getElementById('qris-section');
    if (qrisSection) {
        qrisSection.innerHTML = selectedPaymentMethod === 'qris'
            ? `<div class="qris-box">
                 <div class="qris-title">Scan untuk Membayar</div>
                 <img src="../qris.png" alt="QRIS" class="qris-image">
                 <div class="qris-note">Tunjukkan layar ini ke kasir atau scan melalui aplikasi e-wallet.</div>
                 <div class="qris-countdown" id="qris-countdown" style="margin:16px 0 0;padding:12px 14px;background:#fff4e5;border:1px solid #ffd8a8;border-radius:10px;font:500 13px Montserrat,sans-serif;color:#b26a00;display:flex;justify-content:space-between;align-items:center;gap:10px">
                     <span>⏱ Sisa waktu pembayaran: <strong id="qris-timer">02:00</strong></span>
                     <span style="font:400 11px 'Open Sans',sans-serif;opacity:.75">Auto-batalkan</span>
                 </div>
               </div>`
            : '';
        if (selectedPaymentMethod === 'qris') {
            startQrisCountdown();
        } else {
            stopQrisCountdown();
        }
}
}

// pindah timer ke global scope
let globalQrisCountdownTimer = null;

function startQrisCountdown() {
    stopQrisCountdown();
    const timerEl = document.getElementById('qris-timer');
    const countdownEl = document.getElementById('qris-countdown');
    if (!timerEl || !countdownEl) return;
    countdownEl.style.display = 'flex';
    let remaining = 120;
    const tick = () => {
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        timerEl.textContent = `${mins}:${secs}`;
        if (remaining <= 0) {
            clearInterval(globalQrisCountdownTimer);
            timerEl.textContent = '00:00';
            countdownEl.style.display = 'none';
            return;
        }
        remaining--;
    };
    tick();
    globalQrisCountdownTimer = setInterval(tick, 1000);
}

function stopQrisCountdown() {
    if (globalQrisCountdownTimer) {
        clearInterval(globalQrisCountdownTimer);
        let globalQrisCountdownTimer = null;
    }
    const countdownEl = document.getElementById('qris-countdown');
    if (countdownEl) countdownEl.style.display = 'none';
}

function renderBankSelector() {
    let html = `
        <div class="bank-detail-box">
            <div class="bank-detail-title">
                <span class="bank-transfer-icon">⇄</span> Transfer Bank <span class="bank-help">?</span>
            </div>
            <div class="bank-list">
    `;

    BANKS.forEach(b => {
        html += `
            <button class="bank-item ${selectedBankCode === b.code ? 'selected' : ''}"
                    onclick="selectBank('${b.code}','${esc(b.name)}')"
                    type="button">
                <span class="bank-item-logo" style="background:${b.color}">${esc(b.name.charAt(0))}</span>
                <span class="bank-item-name">${esc(b.name)}</span>
                <span class="bank-item-check">✓</span>
            </button>
        `;
    });

    html += `</div></div>`;
    return html;
}

function selectPaymentMethod(code) {
    selectedPaymentMethod = code;
    if (code !== 'bank_transfer') {
        selectedBankCode = null;
        selectedBankName = null;
    }
    renderPaymentMethods();
    updateReceiptButton();
}

function selectBank(code, name) {
    selectedBankCode = code;
    selectedBankName = name;
    renderPaymentMethods();
    updateReceiptButton();
}

function updateReceiptButton() {
    const btn = document.getElementById('btn-submit-order');
    if (btn) {
        btn.disabled = !selectedPaymentMethod || (selectedPaymentMethod === 'bank_transfer' && !selectedBankCode);
    }
}

function renderSummary() {
    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const total = subtotal; // Free delivery
    
    let html = '';
    cartItems.forEach(item => {
        html += '<div class="summary-row">';
        html += '<span>' + esc(item.name) + ' (' + esc(item.size) + ') x' + esc(item.qty) + '</span>';
        html += '<span>Rp ' + Number(item.subtotal).toLocaleString('id-ID') + '</span>';
        html += '</div>';
    });
    html += '<div class="summary-row"><span>Subtotal</span><span>Rp ' + subtotal.toLocaleString('id-ID') + '</span></div>';
    html += '<div class="summary-row total"><span>Total</span><span>Rp ' + total.toLocaleString('id-ID') + '</span></div>';
    
    document.getElementById('order-summary').innerHTML = html;
}

function buildReceipt(order) {
    const now = new Date();
    const receiptId = 'KJ' + now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + '-' + Math.floor(100000 + Math.random() * 900000);
    const paymentLabel = receiptData.paymentMethod === 'qris'
        ? 'QRIS (Scan & Bayar)'
        : (receiptData.bankName || receiptData.paymentMethod);

    // Auto-success animation for bank payment
    const successAnim = selectedPaymentMethod === 'bank_transfer' && receiptData.vaNumber
        ? `
            <div class="receipt-check-anim">
                <div class="receipt-check-circle"></div>
            </div>
            <div class="receipt-success-title">✅ Pembayaran Berhasil</div>
            <div class="receipt-success-sub">Berhasil membayar ${esc(selectedBankName || receiptData.bankName)} via VA ${receiptData.vaNumber}</div>
        `
        : '';

    // Use order items from API response if available (more accurate)
    const orderItems = (order.items && order.items.length > 0)
        ? order.items.map(item => ({
            name: item.name,
            size: item.size || '-',
            qty: item.qty,
            price: item.price,
            subtotal: Number(item.price) * Number(item.qty)
        }))
        : cartItems.map(item => ({
            name: item.name,
            size: item.size,
            qty: item.qty,
            subtotal: item.subtotal
        }));

    const subtotal = orderItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const shipping = 0; // Free delivery
    const total = Number(order.total_amount || order.total || subtotal + shipping);

    return {
        receiptId,
        orderId: order.id || order.order_id,
        orderNumber: order.order_number,
        paymentMethod: paymentLabel,
        vaNumber: receiptData.vaNumber || null,
        total,
        items: orderItems,
        date: now.toLocaleString('id-ID'),
        successAnimHTML: successAnim,
        fulfillmentType: order.fulfillment_type || 'pickup',
        orderStatus: order.status || 'pending',
        paymentStatus: order.payment_status || 'pending',
        paymentMethodRaw: order.payment_method || 'bri',
        expiresAt: order.created_at ? new Date(order.created_at).getTime() + 120000 : null
    };
}

function showDigitalReceipt(receipt) {
    const itemsHtml = receipt.items.map(item => `
        <div class="receipt-item">
            <div class="receipt-item-info">
                <span class="receipt-item-name">${esc(item.name)} ${item.size !== '-' ? '(' + esc(item.size) + ')' : ''}</span>
                <span class="receipt-item-meta">${esc(item.qty)} x Rp ${Number(item.price || 0).toLocaleString('id-ID')}</span>
            </div>
            <span class="receipt-item-price">Rp ${Number(item.subtotal).toLocaleString('id-ID')}</span>
        </div>
    `).join('');

    const subtotalTotal = receipt.items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    const totalAmount = receipt.total || subtotalTotal;

    const statusLabels = {
        pending: { label: 'Menunggu Pembayaran', class: 'pending' },
        processing: { label: 'Diproses', class: 'processing' },
        completed: { label: 'Selesai', class: 'completed' },
        cancelled: { label: 'Dibatalkan', class: 'cancelled' }
    };
    const orderStatus = statusLabels[receipt.orderStatus] || { label: receipt.orderStatus, class: 'pending' };
    const paymentStatusLabels = {
        pending: 'Belum Dibayar',
        paid: 'Lunas',
        failed: 'Gagal',
        refunded: 'Dikembalikan'
    };
    const paymentStatusLabel = paymentStatusLabels[receipt.paymentStatus] || receipt.paymentStatus;

    // QRIS countdown: 2 menit auto-cancel jika belum dibayar
    let qrisCountdownHTML = '';
    let qrisTimeoutId = null;
    if (receipt.paymentMethod === 'qris' && receipt.paymentStatus === 'pending' && receipt.expiresAt) {
        const now = new Date();
        const expires = new Date(receipt.expiresAt);
        const remaining = Math.max(0, Math.ceil((expires - now) / 1000 / 60));
        if (remaining > 0) {
            qrisCountdownHTML = `
                <div class="qris-countdown" id="qris-countdown-${receipt.id}" style="margin:16px 0; padding:12px; background:#fff4e5; border-radius:8px; font:500 12px Montserrat,sans-serif; color:#b26a00;">
                    <span>Sisa waktu pembayaran: <strong id="qris-timer-${receipt.id}">${remaining} menit</strong></span>
                    <span style="float:right; font:400 11px 'Open Sans',sans-serif; opacity:.8;">Auto-batalkan jika habis</span>
                </div>
            `;
            const expiresMs = expires.getTime();
            const timerEl = document.getElementById('qris-timer-' + receipt.id);
            const tick = () => {
                const nowMs = Date.now();
                const diff = expiresMs - nowMs;
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                if (diff <= 0) {
                    if (timerEl) timerEl.textContent = '0 menit';
                    clearInterval(qrisTimeoutId);
                    cancelQrisOrder(receipt.id);
                    return;
                }
                if (timerEl) timerEl.textContent = mins + ' menit ' + secs + ' detik';
            };
            tick();
            qrisTimeoutId = setInterval(tick, 1000);
        } else {
            qrisCountdownHTML = `
                <div class="qris-countdown" id="qris-countdown-${receipt.id}" style="margin:16px 0; padding:12px; background:#fdecea; border-radius:8px; font:500 12px Montserrat,sans-serif; color:#c62828;">
                    <span>Waktu pembayaran telah habis - Order <strong>Dibatalkan</strong></span>
                </div>
            `;
            cancelQrisOrder(receipt.id);
        }
    }

    const receiptHtml = `
        <div class="receipt-modal">
            <div class="receipt-header">
                <div class="receipt-brand">KOPI JAGO</div>
                <div class="receipt-tagline">Minuman favorit, diantar dengan jago.</div>
            </div>

            ${qrisCountdownHTML}

            <div class="receipt-meta-grid">
                <div class="receipt-meta-row">
                    <span class="receipt-meta-label">No. Pesanan</span>
                    <span class="receipt-meta-value">${esc(receipt.orderNumber || receipt.orderId)}</span>
                </div>
                <div class="receipt-meta-row">
                    <span class="receipt-meta-label">Tanggal</span>
                    <span class="receipt-meta-value">${esc(receipt.date)}</span>
                </div>
                <div class="receipt-meta-row">
                    <span class="receipt-meta-label">Tipe</span>
                    <span class="receipt-meta-value">${receipt.fulfillmentType === 'delivery' ? 'Delivery' : 'Pickup'}</span>
                </div>
                <div class="receipt-meta-row">
                    <span class="receipt-meta-label">Status Pesanan</span>
                    <span class="receipt-badge receipt-badge-${orderStatus.class}">${esc(orderStatus.label)}</span>
                </div>
                <div class="receipt-meta-row">
                    <span class="receipt-meta-label">Metode Bayar</span>
                    <span class="receipt-meta-value">${esc(receipt.paymentMethodRaw || receipt.paymentMethod)}</span>
                </div>
            </div>

            <div class="receipt-divider"></div>

            <div class="receipt-items">${itemsHtml}</div>

            <div class="receipt-divider"></div>

            <div class="receipt-summary">
                <div class="receipt-summary-row">
                    <span>Subtotal</span>
                    <strong>Rp ${subtotalTotal.toLocaleString('id-ID')}</strong>
                </div>
                <div class="receipt-summary-row">
                    <span>Ongkir</span>
                    <strong>GRATIS</strong>
                </div>
                <div class="receipt-summary-row receipt-total-row">
                    <span>TOTAL</span>
                    <strong>Rp ${totalAmount.toLocaleString('id-ID')}</strong>
                </div>
            </div>

            <div class="receipt-foot">
                Terima kasih telah memesan di Kopi Jago.<br>
                Struk ini dibuat otomatis oleh sistem.
            </div>
        </div>
    `;

    KJModal.show({
        title: 'Struk Digital',
        size: 'medium',
        html: receiptHtml,
        showConfirm: false,
        cancelText: 'Tutup'
    });
}

function showReceiptSection(receipt) {
    showDigitalReceipt(receipt);
}

function cancelQrisOrder(orderId) {
    // Kirim request ke backend untuk membatalkan order QRIS
    kjRequest(`orders/cancel-qris/${orderId}`).then(result => {
        if (result.success) {
            KJToast.success('Order Dibatalkan: ' + result.message);
            // Refresh orders page after a delay
            setTimeout(() => window.location.reload(), 1500);
        } else {
            KJToast.error('Gagal membatalkan order: ' + result.message);
        }
    }).catch(() => {
        KJToast.error('Gagal menghubungi server');
    });
}

function copyVaNumber(va) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(va);
        alert('Nomor VA disalin: ' + va);
    } else {
        alert('Nomor VA: ' + va);
    }
}

function generateVaNumber(bankCode) {
    // Dummy VA number: bank prefix + unique suffix
    const prefixMap = {
        bca: '3901',
        bni: '8808',
        bri: '8810',
        mandiri: '8950',
        bsi: '7000',
        seabank: '9099'
    };
    const prefix = prefixMap[bankCode] || '8810';
    const suffix = Math.floor(1000000000 + Math.random() * 9000000000);
    const va = prefix + String(suffix);
    vaNumber = va;
    receiptData = { paymentMethod: bankCode, bankName: selectedBankName, vaNumber: va };
    return va;
}

async function submitOrder() {
    if (isSubmitting) return;

    if (!selectedPaymentMethod) {
        alert('Pilih metode pembayaran terlebih dahulu');
        return;
    }

    if (selectedPaymentMethod === 'bank_transfer' && !selectedBankCode) {
        alert('Pilih salah satu bank untuk transfer');
        return;
    }

    const orderBtn = document.getElementById('btn-submit-order');
    if (orderBtn) orderBtn.disabled = true;
    isSubmitting = true;

    const paymentCode = getSelectedPaymentCode();
    const vaNumberForOrder = selectedPaymentMethod === 'bank_transfer' ? generateVaNumber(selectedBankCode) : null;

    try {
        // Use kjRequest directly to get full {success, message, data} response
        const response = await kjRequest('orders', {
            method: 'POST',
            body: JSON.stringify({
                payment_method: paymentCode,
                fulfillment_type: 'pickup'
            })
        });

        if (response && response.success && response.data) {
            const order = response.data;

            if (selectedPaymentMethod === 'bank_transfer') {
                receiptData = {
                    paymentMethod: 'bank_transfer',
                    bankName: selectedBankName,
                    vaNumber: vaNumberForOrder
                };
            } else {
                receiptData = { paymentMethod: 'qris', vaNumber: null };
            }

            const receipt = buildReceipt(order);
            showReceiptSection(receipt);

            const receiptSection = document.getElementById('receipt-section');
            if (receiptSection) receiptSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Refresh cart badge after checkout
            if (typeof loadCartCount === 'function') {
                loadCartCount();
            }
        } else {
            alert('Gagal membuat pesanan: ' + (response.message || 'Unknown error'));
            if (orderBtn) orderBtn.disabled = false;
            isSubmitting = false;
        }
    } catch (error) {
        console.error('[Checkout] Submit error:', error);
        alert('Gagal memproses pesanan: ' + error.message);
        if (orderBtn) orderBtn.disabled = false;
        isSubmitting = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    showAccount();
    if (typeof loadCartCount === 'function') loadCartCount();
    loadCartAndCheckout();

    const btn = document.getElementById('btn-submit-order');
    if (btn) {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            submitOrder();
        });
    }
});