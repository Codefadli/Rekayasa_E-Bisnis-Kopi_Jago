// Shared utilities for all customer pages
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const token = () => localStorage.getItem('kj_token') || localStorage.getItem('token') || '';

async function api(path, options = {}) {
    return (await kjRequest(path, options)).data;
}

function showAccount() {
    const user = JSON.parse(localStorage.getItem('kj_user') || 'null');
    const area = document.getElementById('account-area');
    if (!area) return;
    
    area.innerHTML = token()
        ? `<span>Halo, ${esc(user?.name || 'Customer')}</span><a href="profile.html">Profile</a><button id="logout">Logout</button>`
        : '<a href="../login.html">Login</a><a class="primary" href="../login.html#register">Daftar</a>';
    
    document.getElementById('logout')?.addEventListener('click', async () => {
        try { await api('auth/logout.php', {method:'POST'}); } catch (_) {}
        localStorage.clear();
        location.href = '../login.html';
    });
}

async function loadCartCount() {
    const badge = document.getElementById('cart-badge');
    if (!badge) {
        console.warn('[Shared] cart-badge element not found');
        return;
    }
    
    if (!token()) {
        badge.textContent = '(0)';
        return;
    }
    
    try {
        const items = await api('cart');
        const count = items.reduce((sum, item) => sum + Number(item.qty), 0);
        badge.textContent = `(${count})`;
        console.log('[Shared] Cart count updated:', count);
    } catch (error) {
        console.error('[Shared] Load cart count error:', error);
        badge.textContent = '(0)';
    }
}

// Image mapping for all product pages
const imageByName = {
    'Kopi Jago Signature':'../kopsu%20jago.jfif',
    'Kopi Susu Vanilla':'../Salted%20Caramel%20Latte.png',
    'Americano':'../americano%20koja.jfif',
    'Chocolate Latte':'../jago%20coklat.jfif',
    'Pink Coco':'../pink%20coco.jfif',
    'Mont Blanc Shake':'../mont%20blanck%20kopi.jfif',
    'Red Velvet Latte':'../jago%20coklat.jfif',
    'Matcha Latte':'../macha%20latte.jfif',
    'Citrus Cold Brew':'../citrus%20cold.jfif'
};

const sizeLabel = {'small':'Small','medium':'Medium','large':'Large'};
