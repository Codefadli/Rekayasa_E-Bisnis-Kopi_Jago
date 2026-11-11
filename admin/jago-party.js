// Admin Jago Party - Request Management
// Customer party requests CRUD with admin review

let allPartyRequests = [];

async function loadPartyRequests() {
    try {
        KJComponents.showLoading('party-requests-table-content');
        const response = await kjRequest('party/orders', { method: 'GET' });
        allPartyRequests = response.data || [];
        renderPartyRequests();
        updatePartyRequestsCount();
    } catch (error) {
        console.error('[Party Admin] Failed to load:', error);
        document.getElementById('party-requests-table-content').innerHTML = `
            <div class="admin-empty">
                <h3>Failed to Load Party Requests</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadPartyRequests()">Retry</button>
            </div>
        `;
    }
}

function renderPartyRequests() {
    const container = document.getElementById('party-requests-table-content');
    if (!container) return;
    
    const filtered = currentFilter === 'all' 
        ? allPartyRequests 
        : allPartyRequests.filter(p => p.status === currentFilter);
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="admin-empty">
                <h3>No Party Requests Found</h3>
                <p>No party requests match the selected filter.</p>
            </div>
        `;
        return;
    }
    
    const rows = filtered.map(request => `
        <tr>
            <td><strong>${escapeHtml(request.order_number)}</strong></td>
            <td>${escapeHtml(request.event_name)}</td>
            <td>${formatDate(request.event_date)}</td>
            <td>${request.num_cups} cups</td>
            <td>${formatRupiah(request.quoted_price)}</td>
            <td>${statusBadge(request.status)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="viewPartyRequest(${request.id})">View</button>
                <button class="btn btn-sm btn-secondary" onclick="updatePartyStatus(${request.id}, 'reviewed')">Review</button>
                <button class="btn btn-sm btn-danger" onclick="updatePartyStatus(${request.id}, 'rejected')">Reject</button>
            </td>
        </tr>
    `).join('');
    
    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Order #</th>
                    <th>Event Name</th>
                    <th>Date</th>
                    <th>Cups</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

async function viewPartyRequest(requestId) {
    try {
        const response = await kjRequest(`party/orders/${requestId}`, { method: 'GET' });
        const request = response.data;
        
        document.getElementById('modal-content').innerHTML = `
            <div class="modal-header">
                <h2 style="margin: 0;">Party Request: ${escapeHtml(request.order_number)}</h2>
                <button class="modal-close" onclick="closePartyModal()">x</button>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div>
                    <strong style="display: block; color: var(--jago-gray-700); font-size: 13px; margin-bottom: 4px;">Event Name</strong>
                    <span>${escapeHtml(request.event_name)}</span>
                </div>
                <div>
                    <strong style="display: block; color: var(--jago-gray-700); font-size: 13px; margin-bottom: 4px;">Event Date</strong>
                    <span>${formatDate(request.event_date)}</span>
                </div>
                <div>
                    <strong style="display: block; color: var(--jago-gray-700); font-size: 13px; margin-bottom: 4px;">Time</strong>
                    <span>${escapeHtml(request.event_time)}</span>
                </div>
                <div>
                    <strong style="display: block; color: var(--jago-gray-700); font-size: 13px; margin-bottom: 4px;">Location</strong>
                    <span>${escapeHtml(request.event_location)}</span>
                </div>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h4>Package Details</h4>
                <p>Package: <strong>${escapeHtml(request.package_name)}</strong></p>
                <p>Number of Cups: <strong>${request.num_cups}</strong></p>
                <p>Quoted Price: <strong>${formatRupiah(request.quoted_price)}</strong></p>
            </div>
            
            <div style="margin-bottom: 24px;">
                <h4>Contact Information</h4>
                <p>Name: ${escapeHtml(request.contact_name)}</p>
                <p>Email: ${escapeHtml(request.contact_email)}</p>
                <p>Phone: ${escapeHtml(request.contact_phone)}</p>
            </div>
            
            ${request.special_requests ? `
                <div style="margin-bottom: 24px;">
                    <h4>Special Requests</h4>
                    <p>${escapeHtml(request.special_requests)}</p>
                </div>
            ` : ''}
            
            <div class="status-actions">
                <h4 style="width: 100%; margin-bottom: 12px;">Review Request</h4>
                <button class="btn btn-primary" onclick="updatePartyStatus(${request.id}, 'reviewed')">Approve</button>
                <button class="btn btn-secondary" onclick="updatePartyStatus(${request.id}, 'rejected')">Reject</button>
            </div>
        `;
        document.getElementById('modal').classList.add('show');
    } catch (error) {
        console.error('[Party Admin] Failed to load request:', error);
        KJToast.error('Gagal memuat detail party request');
    }
}

async function updatePartyStatus(requestId, newStatus) {
    if (!confirm(`Update party request status to ${newStatus}?`)) {
        return;
    }
    
    try {
        await kjRequest(`party/orders/${requestId}/status`, { 
            method: 'PATCH', 
            body: JSON.stringify({ status: newStatus }) 
        });
        
        KJToast.success('Party request status updated');
        loadPartyRequests();
        closePartyModal();
    } catch (error) {
        console.error('[Party Admin] Status update failed:', error);
        KJToast.error('Gagal update status party request');
    }
}

function updatePartyRequestsCount() {
    const filtered = currentFilter === 'all' 
        ? allPartyRequests 
        : allPartyRequests.filter(p => p.status === currentFilter);
    const countEl = document.getElementById('party-requests-count');
    if (countEl) {
        countEl.textContent = `${filtered.length} request${filtered.length !== 1 ? 's' : ''}`;
    }
}

function initFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Re-render
            renderPartyRequests();
            updatePartyRequestsCount();
        });
    });
}

// Escape HTML for security
function escapeHtml(text) {
    const map = {
        '&': '&',
        '<': '<',
        '>': '>',
        '"': '"',
        "'": '&#039;'
    };
    return String(text || '').replace(/[&<>\"']/g, m => map[m]);
}

// Close party modal
function closePartyModal() {
    document.getElementById('modal').classList.remove('show');
    document.getElementById('party-requests-table').classList.remove('show');
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initFilterButtons();
    loadPartyRequests();
});