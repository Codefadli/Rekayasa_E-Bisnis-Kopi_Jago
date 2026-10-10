// Order Tracking Page Logic
// Dependencies: shared.js (esc, token, api, showAccount, loadCartCount)

let orderId = null;
let trackingData = null;
let map = null;
let sellerMarker = null;
let customerMarker = null;
let routeLine = null;
let refreshInterval = null;

const statusSteps = [
    { key: 'pending', label: 'Menunggu', icon: '📝' },
    { key: 'confirmed', label: 'Dikonfirmasi', icon: '✅' },
    { key: 'processing', label: 'Diproses', icon: '☕' },
    { key: 'ready', label: 'Siap', icon: '📦' },
    { key: 'on_delivery', label: 'Dikirim', icon: '🚴' },
    { key: 'completed', label: 'Selesai', icon: '🎉' }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = '../login.html';
        return;
    }

    showAccount();
    loadCartCount();

    // Get order_id from URL
    const params = new URLSearchParams(location.search);
    orderId = params.get('order_id');

    if (!orderId) {
        alert('Order ID tidak ditemukan');
        window.location.href = 'orders.html';
        return;
    }

    loadTrackingData();

    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', () => {
        loadTrackingData();
    });

    // Auto-refresh every 15 seconds if order is active
    startAutoRefresh();
});

async function loadTrackingData() {
    try {
        const res = await fetch(api('orders/' + orderId + '/track'), {
            headers: { 'Authorization': 'Bearer ' + token }
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Failed to load tracking data');
        }

        trackingData = await res.json();

        renderStatusTimeline();
        renderOrderDetails();

        if (trackingData.seller_location) {
            renderSellerInfo();
            renderMap();
            document.getElementById('map-section').style.display = 'block';
        } else {
            document.getElementById('map-section').style.display = 'none';
        }

    } catch (error) {
        console.error('[Tracking] Load error:', error);
        document.getElementById('status-timeline').innerHTML = `
            <div class="empty-state">
                <p>❌ Gagal memuat data tracking: ${esc(error.message)}</p>
                <button onclick="location.href='orders.html'" class="btn-primary">Kembali</button>
            </div>
        `;
    }
}

function renderStatusTimeline() {
    const container = document.getElementById('status-timeline');
    const currentStatus = trackingData.order.status;
    
    // Find current step index
    const currentIndex = statusSteps.findIndex(step => step.key === currentStatus);
    const progress = ((currentIndex + 1) / statusSteps.length) * 100;

    container.innerHTML = `
        <div class="timeline-steps">
            <div class="timeline-line">
                <div class="timeline-line-progress" style="width: ${progress}%"></div>
            </div>
            ${statusSteps.map((step, index) => {
                const isCompleted = index < currentIndex;
                const isActive = index === currentIndex;
                const stateClass = isCompleted ? 'completed' : isActive ? 'active' : '';

                return `
                    <div class="timeline-step ${stateClass}">
                        <div class="step-circle">${step.icon}</div>
                        <span class="step-label">${esc(step.label)}</span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderOrderDetails() {
    const container = document.getElementById('order-details');
    const order = trackingData.order;

    container.innerHTML = `
        <div class="order-header">
            <h2 class="order-number">Order #${esc(order.order_number)}</h2>
            <span class="order-status-badge ${esc(order.status)}">${getStatusLabel(order.status)}</span>
        </div>

        <div class="order-meta">
            <p><strong>Dibuat:</strong> ${formatDateTime(order.created_at)}</p>
            ${order.delivery_started_at ? `<p><strong>Mulai Dikirim:</strong> ${formatDateTime(order.delivery_started_at)}</p>` : ''}
            ${order.estimated_delivery_time ? `<p><strong>Estimasi Tiba:</strong> ${formatDateTime(order.estimated_delivery_time)}</p>` : ''}
        </div>
    `;
}

function renderSellerInfo() {
    const container = document.getElementById('seller-info');
    const seller = trackingData.seller_location;

    if (!seller) {
        container.style.display = 'none';
        return;
    }

    const initial = seller.seller_name?.charAt(0).toUpperCase() || 'J';

    container.innerHTML = `
        <div class="seller-header">
            <div class="seller-avatar">${initial}</div>
            <div>
                <h3 class="seller-name">${esc(seller.seller_name)}</h3>
                <p class="seller-outlet">${esc(seller.outlet_name || 'Jagoan Kopi')}</p>
            </div>
        </div>

        <div class="seller-contact">
            <div class="contact-item">
                <span class="contact-icon">📞</span>
                <span class="contact-text">${esc(seller.seller_phone || '-')}</span>
            </div>
            <div class="contact-item">
                <span class="contact-icon">📍</span>
                <span class="contact-text">Status: ${esc(seller.status)}</span>
            </div>
        </div>

        ${seller.seller_phone ? `
            <button class="btn-call" onclick="window.open('tel:${seller.seller_phone}')">
                📞 Hubungi Jagoan
            </button>
        ` : ''}
    `;

    container.style.display = 'block';
}

function renderMap() {
    const seller = trackingData.seller_location;
    const eta = trackingData.eta;

    if (!seller || !seller.latitude) return;

    // Initialize map if not exists
    if (!map) {
        map = L.map('tracking-map').setView([seller.latitude, seller.longitude], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    }

    // Clear existing markers
    if (sellerMarker) map.removeLayer(sellerMarker);
    if (customerMarker) map.removeLayer(customerMarker);
    if (routeLine) map.removeLayer(routeLine);

    // Create custom icon for seller
    const sellerIcon = L.divIcon({
        className: 'seller-marker',
        html: '🚴',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
    });

    // Add seller marker
    sellerMarker = L.marker([seller.latitude, seller.longitude], { icon: sellerIcon })
        .addTo(map)
        .bindPopup(`<strong>${esc(seller.seller_name)}</strong><br>${esc(seller.outlet_name || 'Jagoan')}`);

    // If ETA available, show customer location and route
    if (eta && trackingData.order.fulfillment_type === 'delivery') {
        // Get customer location from delivery_eta_log (we stored it there)
        // Or use address coordinates if available
        // For now, we'll use a placeholder or fetch from address
        
        // Show ETA card
        const etaCard = document.getElementById('eta-card');
        document.getElementById('eta-time').textContent = eta.estimated_minutes + ' menit';
        document.getElementById('eta-distance').textContent = eta.distance_km + ' km';
        etaCard.style.display = 'flex';

        // Center map on seller
        map.setView([seller.latitude, seller.longitude], 14);
    } else {
        // Hide ETA card
        document.getElementById('eta-card').style.display = 'none';
        
        // Center on seller
        map.setView([seller.latitude, seller.longitude], 15);
    }

    // Invalidate size (fix display issues)
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
}

function startAutoRefresh() {
    // Clear existing interval
    if (refreshInterval) clearInterval(refreshInterval);

    // Only auto-refresh if order is active (not completed/cancelled)
    if (!trackingData) return;

    const activeStatuses = ['confirmed', 'processing', 'ready', 'on_delivery'];
    if (activeStatuses.includes(trackingData.order.status)) {
        refreshInterval = setInterval(() => {
            loadTrackingData();
        }, 15000); // 15 seconds
    }
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'Menunggu',
        'confirmed': 'Dikonfirmasi',
        'processing': 'Diproses',
        'ready': 'Siap',
        'on_delivery': 'Sedang Dikirim',
        'completed': 'Selesai',
        'cancelled': 'Dibatalkan'
    };
    return labels[status] || status;
}

function formatDateTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (refreshInterval) clearInterval(refreshInterval);
});
