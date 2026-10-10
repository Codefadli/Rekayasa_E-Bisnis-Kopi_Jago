// Find Jagoan Page Logic
// Dependencies: shared.js (esc, token, api, showAccount, loadCartCount)
// Dependencies: demo-sellers.js (DEMO_SELLERS, generateDemoCartPositions, calculateDistance)

let userLocation = null;
let outlets = [];
let demoOutlets = [];
let map = null;
let markers = [];
let currentView = 'map';
const DEMO_MODE = true; // Enable demo cart markers

// Helper: Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI/180);
}

// Get user's current location
async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation tidak didukung oleh browser Anda'));
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            position => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
            },
            error => {
                let message = 'Tidak dapat mendapatkan lokasi';
                if (error.code === 1) message = 'Akses lokasi ditolak';
                else if (error.code === 2) message = 'Lokasi tidak tersedia';
                else if (error.code === 3) message = 'Timeout mendapatkan lokasi';
                reject(new Error(message));
            },
            { 
                enableHighAccuracy: true, 
                timeout: 10000, 
                maximumAge: 300000 // Cache 5 menit
            }
        );
    });
}

// Load outlets from API
async function loadOutlets() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
        console.log('[Find Jagoan] Fetching outlets from API...');
        const response = await fetch('../backend/api/index.php/outlets', {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json'
            }
        });
        
        clearTimeout(timeout);
        
        console.log('[Find Jagoan] Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log('[Find Jagoan] API result:', result);
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to load outlets');
        }
        
        outlets = result.data || [];
        console.log('[Find Jagoan] Loaded outlets:', outlets.length);
        
        // Calculate distance for each outlet
        if (userLocation) {
            outlets = outlets.map(outlet => ({
                ...outlet,
                distance: calculateDistance(
                    userLocation.lat,
                    userLocation.lng,
                    parseFloat(outlet.last_latitude || 0),
                    parseFloat(outlet.last_longitude || 0)
                )
            })).sort((a, b) => a.distance - b.distance);
        }
        
        return outlets;
    } catch (error) {
        clearTimeout(timeout);
        console.error('[Find Jagoan] Load outlets error:', error);
        
        if (error.name === 'AbortError') {
            throw new Error('Request timeout setelah 10 detik. Periksa koneksi server.');
        }
        
        throw error;
    }
}

// Initialize map
function initMap() {
    if (!userLocation) {
        console.error('[Find Jagoan] Cannot init map: no user location');
        const loadingMap = document.getElementById('loading-map');
        if (loadingMap) loadingMap.classList.add('hidden');
        return;
    }
    
    console.log('[Find Jagoan] Initializing map...');
    const loadingMap = document.getElementById('loading-map');
    if (loadingMap) loadingMap.classList.remove('hidden');
    
    // Create map centered on user location
    try {
        map = L.map('map').setView([userLocation.lat, userLocation.lng], 13);
    } catch (error) {
        console.error('[Find Jagoan] Map init error:', error);
        if (loadingMap) loadingMap.classList.add('hidden');
        document.getElementById('map').innerHTML = '<div class="empty-state"><h3>Gagal memuat peta</h3><p>Leaflet library tidak tersedia.</p></div>';
        return;
    }
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
    
    // Add user marker (blue pin)
    const userIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div class="marker-icon user">📍</div>',
        iconSize: [40, 40],
        iconAnchor: [20, 40]
    });
    
    L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup('<strong>Lokasi Anda</strong>');
    
    // Generate demo cart markers around user location
    if (DEMO_MODE) {
        demoOutlets = generateDemoCartPositions(userLocation.lat, userLocation.lng);
        console.log('[Find Jagoan] Generated demo outlets:', demoOutlets.length);
        
        // Add distance calculation for demo outlets
        demoOutlets = demoOutlets.map(outlet => ({
            ...outlet,
            distance: calculateDistance(
                userLocation.lat,
                userLocation.lng,
                outlet.last_latitude,
                outlet.last_longitude
            )
        })).sort((a, b) => a.distance - b.distance);
    }
    
    // Combine real outlets (if any) with demo outlets
    const allOutlets = DEMO_MODE ? [...outlets, ...demoOutlets] : outlets;
    
    // Create cart icon for markers
    const cartIconHTML = `
        <svg width="32" height="32" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="20" width="32" height="20" rx="2" fill="#E31837"/>
            <rect x="10" y="22" width="28" height="16" rx="1" fill="#FFFFFF"/>
            <circle cx="16" cy="42" r="3" fill="#333"/>
            <circle cx="32" cy="42" r="3" fill="#333"/>
            <path d="M12 16L14 6H34L36 16" stroke="#E31837" stroke-width="2"/>
            <text x="24" y="32" text-anchor="middle" font-size="10" font-weight="bold" fill="#E31837">JAGO</text>
        </svg>
    `;
    
    // Add outlet markers with cart icons
    allOutlets.forEach(outlet => {
        const lat = parseFloat(outlet.last_latitude);
        const lng = parseFloat(outlet.last_longitude);
        
        if (!lat || !lng) return;
        
        const statusClass = outlet.status === 'available' ? 'available' : 'busy';
        const outletIcon = L.divIcon({
            className: 'custom-cart-marker',
            html: `<div class="cart-marker ${statusClass}">${cartIconHTML}</div>`,
            iconSize: [40, 40],
            iconAnchor: [20, 40]
        });
        
        const marker = L.marker([lat, lng], { icon: outletIcon })
            .addTo(map)
            .on('click', () => showOutletDetail(outlet));
        
        markers.push(marker);
    });
    
    loadingMap.classList.add('hidden');
}

// Show outlet detail in bottom sheet
function showOutletDetail(outlet) {
    const sheet = document.getElementById('outlet-detail-sheet');
    const statusClass = outlet.status === 'available' ? 'available' : 'busy';
    const statusText = outlet.status === 'available' ? '⭐ Available' : '🟡 Busy';
    
    // Build stock display
    let stockHTML = '';
    if (outlet.stock_items && outlet.stock_items.length > 0) {
        stockHTML = '<div class="sheet-stock"><h4>Stok Tersedia:</h4><ul>';
        outlet.stock_items.forEach(item => {
            stockHTML += `<li>${esc(item.name)}: ${item.stock} cup</li>`;
        });
        stockHTML += '</ul></div>';
    }
    
    // Add seller photo if available
    const photoHTML = outlet.photo ? 
        `<div class="sheet-photo"><img src="${esc(outlet.photo)}" alt="${esc(outlet.name)}" /></div>` : '';
    
    const demoLabel = outlet.is_demo ? '<span class="demo-badge">Demo / Simulasi</span>' : '';
    
    sheet.innerHTML = `
        <div class="sheet-handle"></div>
        ${photoHTML}
        <h3 class="sheet-title">${esc(outlet.name || outlet.outlet_name || 'Outlet Jago')}</h3>
        ${demoLabel}
        <span class="sheet-status ${statusClass}">${statusText}</span>
        <p class="sheet-info">📍 ${outlet.distance ? outlet.distance.toFixed(1) + ' km' : 'Jarak tidak tersedia'} · ${esc(outlet.outlet_address || 'Alamat tidak tersedia')}</p>
        <p class="sheet-info">🕒 ${esc(outlet.outlet_hours || 'Jam buka tidak tersedia')}</p>
        <p class="sheet-info">📞 ${esc(outlet.outlet_phone || 'Telepon tidak tersedia')}</p>
        ${stockHTML}
        <div class="sheet-actions">
            <button onclick="viewOutletStock('${outlet.id}')" class="btn btn-secondary">Lihat Stok</button>
            <button onclick="orderFromOutlet('${outlet.id}')" class="btn btn-primary">Samperin Jagoan</button>
        </div>
    `;
    
    sheet.classList.add('visible');
    
    // Close on background click
    setTimeout(() => {
        const closeHandler = (e) => {
            if (!sheet.contains(e.target)) {
                sheet.classList.remove('visible');
                document.removeEventListener('click', closeHandler);
            }
        };
        document.addEventListener('click', closeHandler);
    }, 100);
}

// Render list view
function renderList() {
    const container = document.getElementById('outlet-list');
    const loadingList = document.getElementById('loading-list');
    
    // Use all outlets (real + demo)
    const allOutlets = DEMO_MODE ? [...outlets, ...demoOutlets] : outlets;
    
    if (allOutlets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>Tidak Ada Outlet</h3>
                <p>Maaf, saat ini tidak ada outlet Jago Coffee yang tersedia di area Anda.</p>
                <button onclick="location.reload()" class="btn btn-primary">Refresh</button>
            </div>
        `;
        loadingList.classList.add('hidden');
        return;
    }
    
    container.innerHTML = `
        <div class="list-header">
            <h3>📍 Terdekat (${allOutlets.length} outlet)</h3>
        </div>
        ${allOutlets.map(outlet => {
            const statusClass = outlet.status === 'available' ? 'available' : 'busy';
            const statusText = outlet.status === 'available' ? '⭐ Available' : '🟡 Busy';
            const demoLabel = outlet.is_demo ? '<span class="demo-badge-small">Demo</span>' : '';
            const photoHTML = outlet.photo ? 
                `<img src="${esc(outlet.photo)}" alt="${esc(outlet.name)}" class="outlet-photo" />` : '';
            
            return `
                <div class="outlet-card" onclick="showOutletDetailFromList('${outlet.id}')">
                    ${photoHTML}
                    <div class="outlet-content">
                        <div class="outlet-header">
                            <h4 class="outlet-name">${esc(outlet.name || outlet.outlet_name || 'Outlet Jago')} ${demoLabel}</h4>
                            <span class="status-badge ${statusClass}">${statusText}</span>
                        </div>
                        <p class="outlet-distance">📍 ${outlet.distance ? outlet.distance.toFixed(1) + ' km' : 'Jarak tidak tersedia'}</p>
                        <p class="outlet-address">${esc(outlet.outlet_address || 'Alamat tidak tersedia')}</p>
                        <p class="outlet-hours">🕒 ${esc(outlet.outlet_hours || 'Jam buka tidak tersedia')}</p>
                        <button onclick="event.stopPropagation(); orderFromOutlet('${outlet.id}')" class="btn btn-primary btn-sm">
                            Pesan
                        </button>
                    </div>
                </div>
            `;
        }).join('')}
    `;
    
    loadingList.classList.add('hidden');
}

// Show outlet detail from list (global scope for onclick)
window.showOutletDetailFromList = function(outletId) {
    const allOutlets = DEMO_MODE ? [...outlets, ...demoOutlets] : outlets;
    const outlet = allOutlets.find(o => o.id === outletId || String(o.id) === String(outletId));
    if (outlet) showOutletDetail(outlet);
};

// View outlet stock
window.viewOutletStock = function(outletId) {
    const allOutlets = DEMO_MODE ? [...outlets, ...demoOutlets] : outlets;
    const outlet = allOutlets.find(o => o.id === outletId || String(o.id) === String(outletId));
    if (outlet && outlet.stock_items) {
        alert(`Stok ${outlet.name}:\n\n` + outlet.stock_items.map(item => `${item.name}: ${item.stock} cup`).join('\n'));
    } else {
        alert('Informasi stok tidak tersedia');
    }
};

// View outlet menu
window.viewOutletMenu = function(outletId) {
    sessionStorage.setItem('selected_outlet_id', outletId);
    location.href = 'home.html#menu';
};

// Order from outlet
window.orderFromOutlet = function(outletId) {
    sessionStorage.setItem('selected_outlet_id', outletId);
    location.href = 'checkout.html';
};

// Toggle view (map/list)
function switchView(view) {
    currentView = view;
    
    // Update toggle buttons
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Update view containers
    document.getElementById('map-container').classList.toggle('active', view === 'map');
    document.getElementById('list-container').classList.toggle('active', view === 'list');
    
    // Initialize map if switching to map view for first time
    if (view === 'map' && !map) {
        initMap();
    }
    
    // Render list if switching to list view
    if (view === 'list') {
        renderList();
    }
}

// Show location modal
function showLocationModal() {
    document.getElementById('location-modal').classList.add('visible');
}

// Hide location modal
function hideLocationModal() {
    document.getElementById('location-modal').classList.remove('visible');
}

// Update location display
function updateLocationDisplay(text) {
    document.getElementById('location-text').textContent = text;
}

// Initialize page
async function init() {
    console.log('[Find Jagoan] Initializing...');
    
    // Try to get user location with timeout
    updateLocationDisplay('Mendapatkan lokasi...');
    
    const locationTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 15000)
    );
    
    try {
        userLocation = await Promise.race([getUserLocation(), locationTimeout]);
        updateLocationDisplay(`Lokasi Saat Ini: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
        console.log('[Find Jagoan] User location:', userLocation);
    } catch (error) {
        console.error('[Find Jagoan] Location error:', error);
        updateLocationDisplay('Menggunakan lokasi default');
        
        // Use default location (Jakarta center) for demo
        userLocation = { lat: -6.2088, lng: 106.8456 };
        
        // Show info toast instead of blocking alert
        console.warn('[Find Jagoan] Using default location due to:', error.message);
    }
    
    // Load outlets - ALWAYS continue even if location fails
    try {
        console.log('[Find Jagoan] Loading outlets...');
        await loadOutlets();
        console.log('[Find Jagoan] Outlets loaded successfully:', outlets.length);
        
        // Initialize based on current view
        if (currentView === 'map') {
            initMap();
        } else {
            renderList();
        }
    } catch (error) {
        console.error('[Find Jagoan] Load outlets error:', error);
        
        // Show error in UI instead of alert
        const container = document.getElementById('outlet-list');
        const mapContainer = document.getElementById('map');
        
        const errorHTML = `
            <div class="empty-state">
                <h3>⚠️ Gagal Memuat Outlet</h3>
                <p>${error.message || 'Tidak dapat memuat data outlet.'}</p>
                <button onclick="location.reload()" class="btn btn-primary">Coba Lagi</button>
            </div>
        `;
        
        if (container) container.innerHTML = errorHTML;
        if (mapContainer) mapContainer.innerHTML = errorHTML;
        
        // Hide loading overlays
        const loadingMap = document.getElementById('loading-map');
        const loadingList = document.getElementById('loading-list');
        if (loadingMap) loadingMap.classList.add('hidden');
        if (loadingList) loadingList.classList.add('hidden');
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // View toggle
    document.getElementById('btn-map-view').addEventListener('click', () => switchView('map'));
    document.getElementById('btn-list-view').addEventListener('click', () => switchView('list'));
    
    // Location change
    document.getElementById('btn-change-location').addEventListener('click', showLocationModal);
    
    // Modal controls
    document.getElementById('modal-close').addEventListener('click', hideLocationModal);
    document.getElementById('btn-use-current').addEventListener('click', async () => {
        hideLocationModal();
        try {
            userLocation = await getUserLocation();
            updateLocationDisplay(`Lokasi Saat Ini: ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`);
            location.reload(); // Reload to recalculate distances
        } catch (error) {
            alert('Gagal mendapatkan lokasi: ' + error.message);
        }
    });
    
    document.getElementById('btn-use-manual').addEventListener('click', () => {
        const address = document.getElementById('manual-address').value.trim();
        if (!address) {
            alert('Silakan masukkan alamat');
            return;
        }
        // TODO: Geocode address to lat/lng (requires geocoding service)
        alert('Fitur geocoding alamat akan segera tersedia. Gunakan lokasi saat ini untuk sementara.');
        hideLocationModal();
    });
    
    // Initialize
    init();
});
