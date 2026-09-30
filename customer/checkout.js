// Checkout Logic
// Shared utilities (esc, token, api) loaded from shared.js

let cartItems = [];
let outlets = [];
let selectedFulfillment = 'pickup';
let selectedOutlet = null;
let deliveryCoords = null;
let map = null;

// Haversine distance
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function loadCartAndOutlets() {
    if (!token()) {
        location.href = '../login.html';
        return;
    }
    
    try {
        [cartItems, outlets] = await Promise.all([
            api('cart'),
            api('outlets') // Backend endpoint perlu ditambah
        ]);
        
        if (cartItems.length === 0) {
            alert('Keranjang kosong');
            location.href = 'cart.html';
            return;
        }
        
        renderOutlets();
        renderSummary();
    } catch (error) {
        console.error('[Checkout] Load error:', error);
        alert('Gagal memuat data: ' + error.message);
    }
}

function selectFulfillment(type) {
    selectedFulfillment = type;
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    document.getElementById('pickup-section').style.display = type === 'pickup' ? 'block' : 'none';
    document.getElementById('delivery-section').style.display = type === 'delivery' ? 'block' : 'none';
    
    if (type === 'delivery' && !map) {
        initMap();
    }
    renderSummary();
}

function renderOutlets() {
    const list = document.getElementById('outlet-list');
    list.innerHTML = outlets.map(o => `
        <div class="outlet-card ${selectedOutlet?.id === o.id ? 'selected' : ''}" onclick="selectOutlet(${o.id})">
            <p class="outlet-name">${esc(o.outlet_name || 'Outlet Jago')}</p>
            <p class="outlet-info">📍 ${esc(o.outlet_address || 'Alamat belum diisi')}</p>
            <p class="outlet-info">📞 ${esc(o.outlet_phone || '-')}</p>
            <p class="outlet-info">🕐 ${esc(o.outlet_hours || 'Senin-Minggu 08:00-22:00')}</p>
        </div>
    `).join('');
    
    if (outlets.length > 0 && !selectedOutlet) {
        selectedOutlet = outlets[0];
    }
}

function selectOutlet(id) {
    selectedOutlet = outlets.find(o => o.id === id);
    renderOutlets();
    renderSummary();
}

function initMap() {
    map = L.map('map').setView([-6.9175, 107.6191], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    if (selectedOutlet && selectedOutlet.last_latitude) {
        L.marker([selectedOutlet.last_latitude, selectedOutlet.last_longitude])
            .addTo(map)
            .bindPopup(selectedOutlet.outlet_name || 'Outlet');
    }
}

function renderSummary() {
    const subtotal = cartItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
    let shippingCost = 0;
    let distanceKm = 0;
    
    if (selectedFulfillment === 'delivery' && deliveryCoords && selectedOutlet) {
        distanceKm = getDistance(
            selectedOutlet.last_latitude, 
            selectedOutlet.last_longitude,
            deliveryCoords.lat,
            deliveryCoords.lng
        );
        
        const maxKm = Number(selectedOutlet.max_delivery_km || 5);
        if (distanceKm > maxKm) {
            document.getElementById('delivery-error').textContent = 
                `Alamat di luar jangkauan ${maxKm} km. Pilih Pickup atau ubah alamat.`;
            document.getElementById('btn-checkout').disabled = true;
            return;
        } else {
            document.getElementById('delivery-error').textContent = '';
            document.getElementById('btn-checkout').disabled = false;
        }
        
        const feePerKm = Number(selectedOutlet.delivery_fee_per_km || 2000);
        shippingCost = Math.ceil(distanceKm * feePerKm);
        document.getElementById('distance-info').textContent = 
            `Jarak: ${distanceKm.toFixed(1)} km • Ongkir: Rp ${shippingCost.toLocaleString('id-ID')}`;
    }
    
    const total = subtotal + shippingCost;
    
    document.getElementById('order-summary').innerHTML = `
        ${cartItems.map(item => `
            <div class="summary-row">
                <span>${esc(item.name)} (${item.size}) x${item.qty}</span>
                <span>Rp ${Number(item.subtotal).toLocaleString('id-ID')}</span>
            </div>
        `).join('')}
        <div class="summary-row"><span>Subtotal</span><span>Rp ${subtotal.toLocaleString('id-ID')}</span></div>
        <div class="summary-row"><span>Ongkir</span><span>Rp ${shippingCost.toLocaleString('id-ID')}</span></div>
        <div class="summary-row total"><span>Total</span><span>Rp ${total.toLocaleString('id-ID')}</span></div>
    `;
}

document.getElementById('btn-checkout')?.addEventListener('click', async () => {
    if (!selectedOutlet) {
        alert('Pilih outlet terlebih dahulu');
        return;
    }
    
    if (selectedFulfillment === 'delivery' && !deliveryCoords) {
        alert('Masukkan alamat pengiriman');
        return;
    }
    
    const btn = document.getElementById('btn-checkout');
    btn.disabled = true;
    btn.textContent = 'Memproses...';
    
    try {
        const subtotal = cartItems.reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
        let shippingCost = 0;
        
        if (selectedFulfillment === 'delivery' && deliveryCoords) {
            const distanceKm = getDistance(
                selectedOutlet.last_latitude, 
                selectedOutlet.last_longitude,
                deliveryCoords.lat,
                deliveryCoords.lng
            );
            const feePerKm = Number(selectedOutlet.delivery_fee_per_km || 2000);
            shippingCost = Math.ceil(distanceKm * feePerKm);
        }
        
        const orderData = {
            fulfillment_type: selectedFulfillment,
            outlet_id: selectedOutlet.id,
            delivery_address: selectedFulfillment === 'delivery' ? document.getElementById('delivery-address').value : null,
            delivery_lat: deliveryCoords?.lat || null,
            delivery_lng: deliveryCoords?.lng || null,
            subtotal: subtotal,
            shipping_cost: shippingCost,
            total_amount: subtotal + shippingCost
        };
        
        const order = await api('orders', { method: 'POST', body: orderData });
        location.href = `payment.html?order_id=${order.id}`;
    } catch (error) {
        console.error('[Checkout] Create order error:', error);
        alert('Gagal membuat pesanan: ' + error.message);
        btn.disabled = false;
        btn.textContent = 'Lanjut ke Pembayaran';
    }
});

// Placeholder: load outlets dari backend (perlu endpoint baru)
// Sementara hardcode untuk testing
outlets = [
    {
        id: 3,
        outlet_name: 'Outlet Jago Bandung',
        outlet_address: '[PERLU KONFIRMASI] Jl. Placeholder Bandung',
        outlet_phone: '081234567890',
        outlet_hours: 'Senin-Minggu 08:00-22:00',
        last_latitude: -6.9175,
        last_longitude: 107.6191,
        max_delivery_km: 5,
        delivery_fee_per_km: 2000
    }
];

loadCartAndOutlets();
