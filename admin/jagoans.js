/**
 * ADMIN JAGOANS (SELLERS) MANAGEMENT - JAGO COFFEE
 * Seller listing, status management, outlet information
 */

let allJagoans = [];
let filteredJagoans = [];
let currentFilter = 'all';

// ============================================================
// LOAD JAGOANS
// ============================================================

async function loadJagoans() {
    try {
        KJComponents.showLoading('jagoans-table-content');
        
        // Use fallback loader
        allJagoans = await loadJagoansWithFallback();
        
        console.log('[Jagoans] Loaded:', allJagoans.length);
        
        filterJagoans(currentFilter);
        
    } catch (error) {
        console.error('[Jagoans] Failed to load:', error);
        document.getElementById('jagoans-table-content').innerHTML = `
            <div class="admin-empty">
                <h3>Failed to Load Sellers</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadJagoans()">Retry</button>
            </div>
        `;
    }
}

// ============================================================
// FILTER JAGOANS
// ============================================================

function filterJagoans(filter) {
    currentFilter = filter;
    
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    
    // Filter data
    if (filter === 'all') {
        filteredJagoans = allJagoans;
    } else {
        filteredJagoans = allJagoans.filter(j => j.status === filter);
    }
    
    renderJagoansTable();
    updateJagoansCount();
}

// ============================================================
// RENDER JAGOANS TABLE
// ============================================================

function renderJagoansTable() {
    const container = document.getElementById('jagoans-table-content');
    
    if (filteredJagoans.length === 0) {
        const message = currentFilter === 'all'
            ? 'No sellers found.'
            : `No sellers with status: ${currentFilter}.`;
        
        container.innerHTML = `
            <div class="admin-empty">
                <h3>No Sellers</h3>
                <p>${message}</p>
            </div>
        `;
        return;
    }
    
    // Sort by status priority (available > busy > offline > inactive)
    const statusPriority = { 'available': 1, 'busy': 2, 'offline': 3, 'inactive': 4 };
    const sorted = [...filteredJagoans].sort((a, b) => {
        return (statusPriority[a.status] || 99) - (statusPriority[b.status] || 99);
    });
    
    const rows = sorted.map(jagoan => {
        const statusBadge = getStatusBadge(jagoan.status);
        const vehicleIcon = jagoan.vehicle_type === 'sepeda_listrik' ? '⚡🚲' : '🚲';
        
        return `
            <tr>
                <td><strong>${escapeHtml(jagoan.name)}</strong></td>
                <td>${escapeHtml(jagoan.outlet_name || 'N/A')}</td>
                <td>${statusBadge}</td>
                <td>${vehicleIcon} ${escapeHtml(jagoan.vehicle_type || 'N/A')}</td>
                <td>${escapeHtml(jagoan.phone || 'N/A')}</td>
                <td>${jagoan.last_latitude && jagoan.last_longitude ? '📍 Yes' : '📍 No'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewJagoanDetail(${jagoan.id})">View</button>
                    <button class="btn btn-sm btn-ghost" onclick="toggleJagoanStatus(${jagoan.id}, '${jagoan.status}')" title="Toggle status">
                        ${jagoan.status === 'available' ? '🔴' : '🟢'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Outlet</th>
                    <th>Status</th>
                    <th>Vehicle</th>
                    <th>Phone</th>
                    <th>Location</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

// ============================================================
// STATUS BADGE
// ============================================================

function getStatusBadge(status) {
    const badges = {
        'available': '<span class="status-badge status-completed">Available</span>',
        'busy': '<span class="status-badge status-pending">Busy</span>',
        'offline': '<span class="status-badge status-cancelled">Offline</span>',
        'inactive': '<span class="status-badge" style="background: var(--jago-gray-400);">Inactive</span>'
    };
    return badges[status] || `<span class="status-badge">${status}</span>`;
}

// ============================================================
// UPDATE COUNT
// ============================================================

function updateJagoansCount() {
    const countEl = document.getElementById('jagoans-count');
    if (countEl) {
        const availableCount = allJagoans.filter(j => j.status === 'available').length;
        const busyCount = allJagoans.filter(j => j.status === 'busy').length;
        
        let text = `${filteredJagoans.length} seller${filteredJagoans.length !== 1 ? 's' : ''}`;
        
        if (currentFilter === 'all') {
            text += ` (${availableCount} available, ${busyCount} busy)`;
        }
        
        countEl.textContent = text;
    }
}

// ============================================================
// VIEW JAGOAN DETAIL
// ============================================================

function viewJagoanDetail(jagoanId) {
    const jagoan = allJagoans.find(j => j.id === jagoanId);
    if (!jagoan) {
        KJToast.error('Seller not found');
        return;
    }
    
    renderJagoanModal(jagoan);
    document.getElementById('jagoan-modal').classList.add('show');
}

// ============================================================
// RENDER JAGOAN MODAL
// ============================================================

function renderJagoanModal(jagoan) {
    const hasLocation = jagoan.last_latitude && jagoan.last_longitude;
    const vehicleIcon = jagoan.vehicle_type === 'sepeda_listrik' ? '⚡🚲' : '🚲';
    
    document.getElementById('modal-content').innerHTML = `
        <div class="modal-header">
            <h2 style="margin: 0;">${escapeHtml(jagoan.name)}</h2>
            <button class="modal-close" onclick="closeJagoanModal()">&times;</button>
        </div>
        
        <div class="info-grid">
            <div class="info-item">
                <label>Status</label>
                <div class="value">${getStatusBadge(jagoan.status)}</div>
            </div>
            <div class="info-item">
                <label>Email</label>
                <div class="value">${escapeHtml(jagoan.email)}</div>
            </div>
            <div class="info-item">
                <label>Phone</label>
                <div class="value">${escapeHtml(jagoan.phone || 'N/A')}</div>
            </div>
            <div class="info-item">
                <label>Account Status</label>
                <div class="value">${jagoan.is_active == 1 ? '✅ Active' : '❌ Inactive'}</div>
            </div>
        </div>
        
        <div class="section-divider"></div>
        
        <h3 style="margin-bottom: 16px;">Outlet Information</h3>
        <div class="info-grid">
            <div class="info-item">
                <label>Outlet Name</label>
                <div class="value">${escapeHtml(jagoan.outlet_name || 'N/A')}</div>
            </div>
            <div class="info-item">
                <label>Vehicle Type</label>
                <div class="value">${vehicleIcon} ${escapeHtml(jagoan.vehicle_type || 'N/A')}</div>
            </div>
            <div class="info-item">
                <label>Outlet Phone</label>
                <div class="value">${escapeHtml(jagoan.outlet_phone || 'N/A')}</div>
            </div>
            <div class="info-item">
                <label>Outlet Hours</label>
                <div class="value">${escapeHtml(jagoan.outlet_hours || 'N/A')}</div>
            </div>
        </div>
        
        ${jagoan.outlet_address ? `
        <div style="margin-top: 16px;">
            <label style="display: block; font: 600 12px var(--font-body); color: var(--jago-gray-700); text-transform: uppercase; margin-bottom: 8px;">Outlet Address</label>
            <div style="font: 400 15px var(--font-body);">${escapeHtml(jagoan.outlet_address)}</div>
        </div>
        ` : ''}
        
        <div class="section-divider"></div>
        
        <h3 style="margin-bottom: 16px;">Delivery Settings</h3>
        <div class="info-grid">
            <div class="info-item">
                <label>Max Delivery Range</label>
                <div class="value">${jagoan.max_delivery_km || 'N/A'} km</div>
            </div>
            <div class="info-item">
                <label>Delivery Fee / km</label>
                <div class="value">${formatRupiah(jagoan.delivery_fee_per_km || 0)}</div>
            </div>
            <div class="info-item">
                <label>Flat Delivery Fee</label>
                <div class="value">${formatRupiah(jagoan.flat_delivery_fee || 0)}</div>
            </div>
        </div>
        
        <div class="section-divider"></div>
        
        <h3 style="margin-bottom: 16px;">Location</h3>
        ${hasLocation ? `
        <div class="info-grid">
            <div class="info-item">
                <label>Latitude</label>
                <div class="value">${jagoan.last_latitude}</div>
            </div>
            <div class="info-item">
                <label>Longitude</label>
                <div class="value">${jagoan.last_longitude}</div>
            </div>
        </div>
        <div style="margin-top: 12px;">
            <a href="https://www.google.com/maps?q=${jagoan.last_latitude},${jagoan.last_longitude}" target="_blank" class="btn btn-ghost btn-sm">
                📍 View on Google Maps
            </a>
        </div>
        ` : `
        <p style="color: var(--jago-gray-700); font-size: 14px;">Location not available</p>
        `}
        
        <div style="margin-top: 24px; text-align: center;">
            <button class="btn btn-ghost" onclick="closeJagoanModal()">Close</button>
        </div>
    `;
}

// ============================================================
// CLOSE MODAL
// ============================================================

function closeJagoanModal() {
    document.getElementById('jagoan-modal').classList.remove('show');
}

// ============================================================
// TOGGLE JAGOAN STATUS
// ============================================================

async function toggleJagoanStatus(jagoanId, currentStatus) {
    const newStatus = currentStatus === 'available' ? 'offline' : 'available';
    
    if (!confirm(`Change seller status to ${newStatus}?`)) {
        return;
    }
    
    try {
        const jagoan = allJagoans.find(j => j.id === jagoanId);
        
        await kjRequest('admin/sellers', {
            method: 'PATCH',
            body: JSON.stringify({
                id: jagoanId,
                status: newStatus,
                outlet_name: jagoan.outlet_name,
                vehicle_type: jagoan.vehicle_type
            })
        });
        
        KJToast.success(`Status updated to ${newStatus}`);
        await loadJagoans();
        
    } catch (error) {
        console.error('[Jagoans] Failed to toggle status:', error);
        KJToast.error(error.message || 'Failed to update status');
    }
}

// ============================================================
// MODAL CLOSE ON OUTSIDE CLICK
// ============================================================

document.addEventListener('click', (e) => {
    const modal = document.getElementById('jagoan-modal');
    if (e.target === modal) {
        closeJagoanModal();
    }
});

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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Jagoans] Initializing...');
    
    await loadJagoans();
    
    console.log('[Jagoans] Initialized');
});
