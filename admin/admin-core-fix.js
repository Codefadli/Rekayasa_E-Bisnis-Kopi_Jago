/**
 * ADMIN CORE - KJCOMPONENTS FALLBACK
 * Tambahkan ini di awal admin-core.js untuk fix KJComponents error
 */

// Fallback jika KJComponents belum di-load
if (typeof KJComponents === 'undefined') {
    console.warn('[Admin] KJComponents not found, using fallback');
    
    window.KJComponents = {
        showLoading: function(containerId) {
            const el = document.getElementById(containerId);
            if (el) {
                el.innerHTML = `
                    <div style="padding:60px 20px;text-align:center">
                        <div style="display:inline-block;width:40px;height:40px;border:4px solid #f3f3f3;border-top:4px solid #bd3d2f;border-radius:50%;animation:spin 1s linear infinite"></div>
                        <p style="margin-top:16px;color:#666">Loading...</p>
                    </div>
                    <style>
                        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                    </style>
                `;
            }
        },
        
        showError: function(containerId, message) {
            const el = document.getElementById(containerId);
            if (el) {
                el.innerHTML = `
                    <div style="padding:60px 20px;text-align:center">
                        <svg width="48" height="48" style="color:#dc2626" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="24" cy="24" r="22"/>
                            <line x1="15" y1="15" x2="33" y2="33"/>
                            <line x1="33" y1="15" x2="15" y2="33"/>
                        </svg>
                        <h3 style="margin:16px 0 8px;color:#333">Error</h3>
                        <p style="color:#666">${message || 'Something went wrong'}</p>
                        <button onclick="location.reload()" style="margin-top:16px;padding:10px 24px;background:#bd3d2f;color:white;border:none;border-radius:6px;cursor:pointer">
                            Retry
                        </button>
                    </div>
                `;
            }
        },
        
        showEmpty: function(containerId, message) {
            const el = document.getElementById(containerId);
            if (el) {
                el.innerHTML = `
                    <div style="padding:60px 20px;text-align:center">
                        <svg width="64" height="64" style="color:#ccc;margin-bottom:16px" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="8" y="8" width="48" height="48" rx="4"/>
                            <line x1="20" y1="32" x2="44" y2="32"/>
                        </svg>
                        <h3 style="margin:0 0 8px;color:#999">${message || 'No data available'}</h3>
                    </div>
                `;
            }
        }
    };
}

// Export untuk digunakan di file admin lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KJComponents;
}
