// Payment Page Logic
// Shared utilities (esc, token, api) loaded from shared.js

let order = null;
let paymentMethods = {
    qris: { name: 'QRIS', icon: '📱' },
    bank_transfer: { 
        name: 'Transfer Bank', 
        icon: '🏦',
        banks: ['bca', 'bni', 'bri', 'mandiri', 'permata', 'cimb', 'bsi']
    },
    gopay: { name: 'GoPay', icon: '💳' },
    shopeepay: { name: 'ShopeePay', icon: '🛍️' }
};
let selectedMethod = 'qris';
let selectedBank = 'bca';

async function loadOrderDetails() {
    const orderId = new URLSearchParams(location.search).get('order_id');
    if (!orderId) {
        alert('Order ID tidak ditemukan');
        location.href = 'cart.html';
        return;
    }
    
    try {
        order = await api(`orders/${orderId}`);
        renderOrderSummary();
        renderPaymentMethods();
    } catch (error) {
        console.error('[Payment] Load error:', error);
        alert('Gagal memuat order: ' + error.message);
    }
}

function renderOrderSummary() {
    if (!order) return;
    
    document.getElementById('order-summary').innerHTML = `
        <div class="summary-header">
            <p class="order-number">Order #${esc(order.order_number)}</p>
            <p class="order-date">${new Date(order.created_at).toLocaleString('id-ID')}</p>
        </div>
        ${order.items.map(item => `
            <div class="summary-row">
                <span>${esc(item.name)} (${item.size}) × ${item.qty}</span>
                <span>Rp ${Number(item.subtotal).toLocaleString('id-ID')}</span>
            </div>
        `).join('')}
        <div class="summary-row"><span>Subtotal</span><span>Rp ${Number(order.subtotal).toLocaleString('id-ID')}</span></div>
        <div class="summary-row"><span>Ongkir</span><span>Rp ${Number(order.shipping_cost).toLocaleString('id-ID')}</span></div>
        <div class="summary-row total"><span>Total</span><span>Rp ${Number(order.total_amount).toLocaleString('id-ID')}</span></div>
    `;
}

function selectMethod(method) {
    selectedMethod = method;
    document.querySelectorAll('.method-card').forEach(card => {
        card.classList.toggle('selected', card.dataset.method === method);
    });
    
    const bankSelector = document.getElementById('bank-selector');
    bankSelector.style.display = method === 'bank_transfer' ? 'block' : 'none';
    
    document.getElementById('btn-pay').textContent = 
        method === 'qris' ? 'Tampilkan QR Code' :
        method === 'bank_transfer' ? 'Buat Nomor VA' :
        'Bayar Sekarang';
}

function selectBank(bank) {
    selectedBank = bank;
    document.querySelectorAll('.bank-btn').forEach(btn => {
        btn.classList.toggle('selected', btn.dataset.bank === bank);
    });
}

function renderPaymentMethods() {
    const container = document.getElementById('payment-methods');
    
    container.innerHTML = `
        <div class="method-card selected" data-method="qris" onclick="selectMethod('qris')">
            <span class="method-icon">📱</span>
            <span class="method-name">QRIS</span>
        </div>
        <div class="method-card" data-method="bank_transfer" onclick="selectMethod('bank_transfer')">
            <span class="method-icon">🏦</span>
            <span class="method-name">Transfer Bank</span>
        </div>
        <div class="method-card" data-method="gopay" onclick="selectMethod('gopay')">
            <span class="method-icon">💳</span>
            <span class="method-name">GoPay</span>
        </div>
        <div class="method-card" data-method="shopeepay" onclick="selectMethod('shopeepay')">
            <span class="method-icon">🛍️</span>
            <span class="method-name">ShopeePay</span>
        </div>
    `;
    
    document.getElementById('bank-selector').innerHTML = `
        <p class="form-label">Pilih Bank</p>
        <div class="bank-grid">
            ${paymentMethods.bank_transfer.banks.map(bank => `
                <button class="bank-btn ${bank === selectedBank ? 'selected' : ''}" 
                        data-bank="${bank}" 
                        onclick="selectBank('${bank}')">
                    ${bank.toUpperCase()}
                </button>
            `).join('')}
        </div>
    `;
}

async function initiatePayment() {
    if (!order) return;
    
    const btn = document.getElementById('btn-pay');
    btn.disabled = true;
    btn.textContent = 'Memproses...';
    
    try {
        const payload = {
            order_id: order.id,
            payment_method: selectedMethod,
            bank: selectedMethod === 'bank_transfer' ? selectedBank : null
        };
        
        const result = await api('payments/create', { method: 'POST', body: payload });
        
        if (result.snap_token) {
            // Midtrans Snap
            window.snap.pay(result.snap_token, {
                onSuccess: () => {
                    alert('Pembayaran berhasil!');
                    location.href = 'orders.html';
                },
                onPending: () => {
                    alert('Menunggu pembayaran. Cek halaman pesanan untuk detail.');
                    location.href = `order-detail.html?id=${order.id}`;
                },
                onError: () => {
                    alert('Pembayaran gagal. Silakan coba lagi.');
                    btn.disabled = false;
                    btn.textContent = 'Bayar Sekarang';
                }
            });
        } else if (result.va_number || result.qr_string) {
            // Render payment instructions
            showPaymentInstructions(result);
        }
    } catch (error) {
        console.error('[Payment] Create error:', error);
        alert('Gagal membuat pembayaran: ' + error.message);
        btn.disabled = false;
        btn.textContent = 'Bayar Sekarang';
    }
}

function showPaymentInstructions(data) {
    const container = document.getElementById('payment-instructions');
    container.style.display = 'block';
    
    if (data.qr_string) {
        container.innerHTML = `
            <div class="qr-container">
                <h3>Scan QR Code</h3>
                <img src="data:image/png;base64,${data.qr_string}" alt="QR Code" class="qr-image">
                <p class="amount">Rp ${Number(order.total_amount).toLocaleString('id-ID')}</p>
                <p class="expiry">Berlaku hingga: ${data.expiry_time}</p>
                <p class="note">Scan dengan aplikasi e-wallet atau mobile banking</p>
            </div>
        `;
    } else if (data.va_number) {
        container.innerHTML = `
            <div class="va-container">
                <h3>Transfer ke Virtual Account</h3>
                <p class="bank-name">${data.bank.toUpperCase()}</p>
                <div class="va-box">
                    <span class="va-number">${data.va_number}</span>
                    <button onclick="copyVA('${data.va_number}')" class="copy-btn">📋 Salin</button>
                </div>
                <p class="amount">Nominal: Rp ${Number(order.total_amount).toLocaleString('id-ID')}</p>
                <p class="expiry">Berlaku hingga: ${data.expiry_time}</p>
                <div class="instructions">
                    <p><strong>Cara Transfer:</strong></p>
                    <ol>
                        <li>Buka aplikasi mobile banking atau ATM</li>
                        <li>Pilih menu Transfer ke Virtual Account</li>
                        <li>Masukkan nomor VA di atas</li>
                        <li>Masukkan nominal (otomatis muncul)</li>
                        <li>Konfirmasi dan selesaikan transaksi</li>
                    </ol>
                </div>
            </div>
        `;
    }
}

function copyVA(number) {
    navigator.clipboard.writeText(number).then(() => {
        alert('Nomor VA disalin!');
    });
}

document.getElementById('btn-pay')?.addEventListener('click', initiatePayment);

loadOrderDetails();
