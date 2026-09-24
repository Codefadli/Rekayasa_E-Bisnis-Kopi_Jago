function kjApplicationRoot() {
    const path = window.location.pathname;
    const marker = path.match(/^(.+?)\/(?:frontend|customer|admin|seller|backend)(?:\/|$)/);
    if (marker) return marker[1];
    const slash = path.lastIndexOf('/');
    return path.slice(0, slash) || '';
}

const KJ_API_BASE = `${kjApplicationRoot()}/backend/api`;

async function kjRequest(path, options = {}) {
    const token = localStorage.getItem('kj_token') || localStorage.getItem('token');
    const normalizedPath = path.replace(/^\/+/, '');
    const endpoint = normalizedPath.endsWith('.php')
        ? `${KJ_API_BASE}/${normalizedPath}`
        : `${KJ_API_BASE}/index.php/${normalizedPath}`;
    let response;
    let responseText = '';
    let payload = null;
    try {
        response = await fetch(endpoint, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(options.headers || {})
            }
        });
        responseText = await response.text();
        try {
            payload = responseText ? JSON.parse(responseText) : null;
        } catch (parseError) {
            console.error('[Kopi Jago API] Invalid JSON response', {
                url: endpoint,
                status: response.status,
                responseText,
                parseError
            });
        }
    } catch (networkError) {
        console.error('[Kopi Jago API] Network request failed', {
            url: endpoint,
            networkError
        });
        throw new Error('Tidak dapat menghubungi server. Pastikan Apache/PHP sedang berjalan.');
    }
    console.debug('[Kopi Jago API]', {
        url: endpoint,
        status: response.status,
        responseText,
        payload
    });
    if (response.status === 401) {
        localStorage.removeItem('kj_token');
        localStorage.removeItem('token');
        if (!window.location.pathname.endsWith('/login.html')) window.location.assign(KJ_ROUTES.login);
    }
    if (!payload || !response.ok || payload.success !== true) {
        if (response.status === 404) {
            throw new Error(normalizedPath === 'auth/register.php'
                ? 'Endpoint register tidak ditemukan.'
                : 'Endpoint tidak ditemukan.');
        }
        if (response.status >= 500) throw new Error(payload?.message || 'Server/database error.');
        throw new Error(payload?.message || payload?.data?.message || `Permintaan ditolak (HTTP ${response.status}).`);
    }
    return payload;
}
