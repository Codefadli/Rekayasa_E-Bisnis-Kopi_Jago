// Checkout Logic
// Shared utilities (esc, token, api) loaded from shared.js

let cartItems = [];
let outlets = [];
let selectedFulfillment = 'pickup';
let selectedOutlet = null;
let deliveryCoords = null;
let map = null;
let selectedTiming = 'now';
let selectedDate = null;
let selectedSlot = null;
let scheduleData = [];

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
        // Load cart
        cartItems = await api('cart');
        
        if (cartItems.length === 0) {
            alert('Keranjang kosong');
            location.href = 'cart.html';
            return;
        }
        
        // Try to load outlets from API, fallback to demo data
        try {
            outlets = await api('outlets');
            if (!outlets || outlets.length === 0) {
                throw new Error('No outlets available');
            }
        } catch (outletError) {
            console.warn('[Checkout] Using demo outlet data:', outletError);
            // Demo outlets for testing
            outlets = [
                {
                    id: 3,
                    outlet_name: 'Jago Bandung Pusat',
                    outlet_address: 'Jl. Braga No. 15, Bandung',
                    outlet_phone: '0812-3456-7890',
                    outlet_hours: 'Senin-Minggu 08:00-22:00',
                    last_latitude: -6.9175,
                    last_longitude: 107.6191,
                    max_delivery_km: 5,
                    delivery_fee_per_km: 0, // Free delivery
                    status: 'available'
                },
                {
                    id: 4,
                    outlet_name: 'Jago Dago',
                    outlet_address: 'Jl. Ir. H. Djuanda No. 100, Bandung',
                    outlet_phone: '0812-3456-7891',
                    outlet_hours: 'Senin-Minggu 08:00-22:00',
                    last_latitude: -6.8700,
                    last_longitude: 107.6140,
                    max_delivery_km: 5,
                    delivery_fee_per_km: 0,
                    status: 'available'
                },
                {
                    id: 5,
                    outlet_name: 'Jago Pasteur',
                    outlet_address: 'Jl. Dr. Djunjunan No. 50, Bandung',
                    outlet_phone: '0812-3456-7892',
                    outlet_hours: 'Senin-Minggu 08:00-22:00',
                    last_latitude: -6.8950,
                    last_longitude: 107.5760,
                    max_delivery_km: 5,
                    delivery_fee_per_km: 0,
                    status: 'available'
                }
            ];
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
    if (!list) {
        console.warn('[Checkout] outlet-list element not found');
        return;
    }
    
    list.innerHTML = outlets.map(o => `
        <div class="outlet-card ${selectedOutlet?.id === o.id ? 'selected' : ''}" onclick="selectOutlet(${o.id})">
            <p class="outlet-name">${esc(o.outlet_name || 'Outlet Jago')}</p>
            <p class="outlet-info">📍 ${esc(o.outlet_address || 'Alamat belum diisi')}</p>
            <p class="outlet-info">📞 ${esc(o.outlet_phone || '-')}</p>
            <p class="outlet-info">🕐 ${esc(o.outlet_hours || 'Senin-Minggu 08:00-22:00')}</p>
        </div>
    `).join('');
    
    // Auto-select first outlet if none selected
    if (outlets.length > 0 && !selectedOutlet) {
        console.log('[Checkout] Auto-selecting first outlet:', outlets[0]);
        selectedOutlet = outlets[0];
        renderOutlets(); // Re-render to show selection
        renderSummary();
    }
}

function selectOutlet(id) {
    selectedOutlet = outlets.find(o => o.id === id);
    renderOutlets();
    renderSummary();
    
    // Load schedule if timing is 'schedule'
    if (selectedTiming === 'schedule') {
        loadScheduleSlots();
    }
}

function selectTiming(timing) {
    selectedTiming = timing;
    document.querySelectorAll('[data-timing]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.timing === timing);
    });
    document.getElementById('schedule-section').style.display = timing === 'schedule' ? 'block' : 'none';
    
    if (timing === 'schedule' && selectedOutlet) {
        loadScheduleSlots();
    }
    
    // Reset schedule selection
    selectedDate = null;
    selectedSlot = null;
}

async function loadScheduleSlots() {
    if (!selectedOutlet) {
        document.getElementById('schedule-error').textContent = 'Pilih outlet terlebih dahulu';
        return;
    }
    
    try {
        const startDate = new Date().toISOString().split('T')[0];
        scheduleData = await api(`schedule/slots?outlet_id=${selectedOutlet.id}&start_date=${startDate}&days=7`);
        renderScheduleCalendar();
    } catch (error) {
        console.error('[Schedule] Load error:', error);
        document.getElementById('schedule-error').textContent = 'Gagal memuat jadwal: ' + error.message;
    }
}

function renderScheduleCalendar() {
    const container = document.getElementById('schedule-calendar');
    
    if (scheduleData.length === 0) {
        container.innerHTML = '<p class="error-msg">Tidak ada slot tersedia</p>';
        return;
    }
    
    // Render day cards
    const daysHTML = scheduleData.map((day, index) => {
        const date = new Date(day.date);
        const dateNum = date.getDate();
        const dayName = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][date.getDay()];
        const isSelected = selectedDate === day.date;
        const isDisabled = day.is_blackout || day.slots.length === 0;
        
        return `
            <div class="day-card ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}" 
                 onclick="selectScheduleDate('${day.date}', ${index})">
                <div class="day-date">${dateNum}</div>
                <div class="day-name">${dayName}</div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `
        <div class="calendar-days">${daysHTML}</div>
        <div id="time-slots-container"></div>
    `;
    
    // Render time slots if date selected
    if (selectedDate) {
        renderTimeSlots();
    }
}

function selectScheduleDate(date, index) {
    const day = scheduleData[index];
    
    if (day.is_blackout) {
        document.getElementById('schedule-error').textContent = 'Tanggal tidak tersedia: ' + day.blackout_reason;
        return;
    }
    
    if (day.slots.length === 0) {
        document.getElementById('schedule-error').textContent = 'Tidak ada slot tersedia untuk tanggal ini';
        return;
    }
    
    selectedDate = date;
    selectedSlot = null;
    document.getElementById('schedule-error').textContent = '';
    renderScheduleCalendar();
}

function renderTimeSlots() {
    const day = scheduleData.find(d => d.date === selectedDate);
    if (!day) return;
    
    const container = document.getElementById('time-slots-container');
    
    if (day.is_blackout) {
        container.innerHTML = `<div class="blackout-notice">❌ ${esc(day.blackout_reason)}</div>`;
        return;
    }
    
    if (day.slots.length === 0) {
        container.innerHTML = '<p class="error-msg">Tidak ada slot waktu tersedia</p>';
        return;
    }
    
    const slotsHTML = day.slots.map(slot => {
        const isSelected = selectedSlot?.id === slot.id;
        const isDisabled = !slot.is_available;
        
        return `
            <div class="time-slot ${isSelected ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}"
                 onclick="selectTimeSlot(${slot.id}, '${slot.start_time}', '${slot.end_time}')">
                <div class="time-slot-time">${slot.start_time} - ${slot.end_time}</div>
                <div class="time-slot-availability">
                    ${slot.is_available ? `${slot.available} tersedia` : 'Penuh'}
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = `<div class="time-slots-grid">${slotsHTML}</div>`;
}

function selectTimeSlot(slotId, startTime, endTime) {
    const day = scheduleData.find(d => d.date === selectedDate);
    const slot = day?.slots.find(s => s.id === slotId);
    
    if (!slot || !slot.is_available) {
        document.getElementById('schedule-error').textContent = 'Slot tidak tersedia';
        return;
    }
    
    selectedSlot = { id: slotId, start_time: startTime, end_time: endTime };
    document.getElementById('schedule-error').textContent = '';
    renderTimeSlots();
}

function initMap() {
    map = L.map('map').setView([-6.9175, 107.6191], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(map);
    
    // Try to get user's current location
    if (navigator.geolocation && selectedFulfillment === 'delivery') {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;
                
                // Set delivery coords
                deliveryCoords = { lat: userLat, lng: userLng };
                
                // Center map on user location
                map.setView([userLat, userLng], 14);
                
                // Add user marker
                const customerIcon = L.divIcon({
                    className: 'customer-marker',
                    html: '<div style="background:#4CAF50;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">📍</div>',
                    iconSize: [36, 36]
                });
                
                const userMarker = L.marker([userLat, userLng], { icon: customerIcon, draggable: true })
                    .addTo(map)
                    .bindPopup('📍 Lokasi Anda (geser untuk menyesuaikan)')
                    .openPopup();
                
                // Update coords when marker dragged
                userMarker.on('dragend', function(e) {
                    const pos = e.target.getLatLng();
                    deliveryCoords = { lat: pos.lat, lng: pos.lng };
                    renderSummary();
                    console.log('[Map] Location updated:', deliveryCoords);
                });
                
                renderSummary();
                console.log('[Map] User location detected:', deliveryCoords);
            },
            (error) => {
                console.warn('[Map] Geolocation error:', error.message);
                document.getElementById('delivery-error').innerHTML = 
                    '<p style="color:#f59e0b;margin:10px 0;">📍 Geolocation tidak tersedia. Klik pada peta untuk menandai lokasi Anda.</p>';
            }
        );
    }
    
    // Add markers for all available outlets/jagoans
    outlets.forEach(outlet => {
        if (outlet.last_latitude && outlet.last_longitude) {
            const jagoIcon = L.divIcon({
                className: 'jagoan-marker',
                html: '<div style="background:#bd3d2f;color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">🚲</div>',
                iconSize: [40, 40]
            });
            
            const marker = L.marker([outlet.last_latitude, outlet.last_longitude], { icon: jagoIcon })
                .addTo(map)
                .bindPopup(`
                    <div style="text-align:center;">
                        <strong>${esc(outlet.outlet_name || 'Outlet Jago')}</strong><br>
                        <small>${esc(outlet.outlet_address || 'Alamat belum tersedia')}</small><br>
                        <button onclick="selectOutletFromMap(${outlet.id})" style="margin-top:8px;padding:6px 12px;background:#bd3d2f;color:#fff;border:none;border-radius:4px;cursor:pointer;">Pilih Outlet</button>
                    </div>
                `);
            
            // Highlight selected outlet
            if (selectedOutlet && selectedOutlet.id === outlet.id) {
                marker.openPopup();
            }
        }
    });
    
    // Allow clicking on map to set delivery location (fallback if geolocation fails)
    if (selectedFulfillment === 'delivery') {
        map.on('click', function(e) {
            deliveryCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
            
            // Remove existing customer marker
            map.eachLayer(layer => {
                if (layer.options && layer.options.icon && layer.options.icon.options.className === 'customer-marker') {
                    map.removeLayer(layer);
                }
            });
            
            // Add new customer marker
            const customerIcon = L.divIcon({
                className: 'customer-marker',
                html: '<div style="background:#4CAF50;color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);">📍</div>',
                iconSize: [36, 36]
            });
            
            const userMarker = L.marker([deliveryCoords.lat, deliveryCoords.lng], { icon: customerIcon, draggable: true })
                .addTo(map)
                .bindPopup('📍 Lokasi Pengiriman (geser untuk menyesuaikan)')
                .openPopup();
            
            userMarker.on('dragend', function(e) {
                const pos = e.target.getLatLng();
                deliveryCoords = { lat: pos.lat, lng: pos.lng };
                renderSummary();
            });
            
            renderSummary();
            console.log('[Map] Delivery location set:', deliveryCoords);
        });
    }
}

// Global function to select outlet from map popup
window.selectOutletFromMap = function(outletId) {
    selectOutlet(outletId);
    map.closePopup();
};

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
    
    // Validate schedule
    if (selectedTiming === 'schedule') {
        if (!selectedDate || !selectedSlot) {
            alert('Pilih tanggal dan waktu pengambilan');
            return;
        }
        
        // Validate slot availability
        try {
            const scheduledFor = `${selectedDate} ${selectedSlot.start_time}:00`;
            await api('schedule/validate', {
                method: 'POST',
                body: JSON.stringify({
                    time_slot_id: selectedSlot.id,
                    scheduled_for: scheduledFor
                })
            });
        } catch (error) {
            alert('Slot tidak tersedia: ' + error.message);
            loadScheduleSlots();
            return;
        }
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
            total_amount: subtotal + shippingCost,
            notes: document.getElementById('order-notes')?.value || null,
            is_scheduled: selectedTiming === 'schedule',
            scheduled_for: selectedTiming === 'schedule' ? `${selectedDate} ${selectedSlot.start_time}:00` : null,
            time_slot_id: selectedTiming === 'schedule' ? selectedSlot.id : null,
            scheduled_notes: selectedTiming === 'schedule' ? `Dijadwalkan ${selectedDate} ${selectedSlot.start_time}-${selectedSlot.end_time}` : null
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Show loading for navbar compatibility
    showAccount();
    loadCartCount();
    
    loadCartAndOutlets();
});
