const KJ_API_BASE = '/Rekayasa_E-Bisnis-Kopi_Jago/backend/api';

async function kjRequest(path, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('kj_token')
            ? { Authorization: `Bearer ${localStorage.getItem('kj_token')}` }
            : {}),
        ...(options.headers || {})
    };
    const normalizedPath = path.replace(/^\/+/, '');
    const endpoint = normalizedPath.endsWith('.php')
        ? `${KJ_API_BASE}/${normalizedPath}`
        : `${KJ_API_BASE}/index.php/${normalizedPath}`;
    const response = await fetch(endpoint, {
        ...options,
        headers
    });
    const payload = await response.json().catch(() => null);
    if (!payload || !response.ok || payload.success !== true) {
        throw new Error(payload?.message || payload?.data?.message || 'Permintaan gagal diproses.');
    }
    return payload;
}
