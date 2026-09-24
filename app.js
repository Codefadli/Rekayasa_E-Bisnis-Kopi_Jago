let token = localStorage.token || localStorage.kj_token || '';
const products = document.getElementById('products');
const cartItems = document.getElementById('cart-items');
const orderItems = document.getElementById('order-items');
const login = document.getElementById('login');
const checkout = document.getElementById('checkout');

const req = async (path, options = {}) => {
  const endpoint = path.endsWith('.php') ? `${KJ_API_BASE}/${path}` : `${KJ_API_BASE}/index.php/${path}`;
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 401) {
    token = '';
    localStorage.removeItem('token');
    updateLoginButton();
  }
  if (response.status === 403) throw new Error('Akses ditolak untuk akun ini.');
  if (!response.ok || !result.success) throw new Error(result.data?.message || 'Gagal memproses permintaan');
  return result.data;
};

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[character]));

function updateLoginButton() {
  login.textContent = token ? 'Logout' : 'Login';
}

async function menu() {
  try {
    const data = await req('menu');
    products.innerHTML = data.map(item => `<article class="card"><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description)}</p><p class="price">Rp ${Number(item.price).toLocaleString('id-ID')}</p><button onclick="add(${Number(item.id)})">Tambah</button></article>`).join('');
  } catch (error) {
    products.innerHTML = `<p>${error.message}</p>`;
  }
}

async function add(id) {
  if (!token) return login.click();
  try {
    await req('cart', { method: 'POST', body: JSON.stringify({ menu_id: id, qty: 1 }) });
    await cart();
  } catch (error) { alert(error.message); }
}

async function cart() {
  if (!token) {
    cartItems.innerHTML = '<p>Login untuk melihat keranjang.</p>';
    return;
  }
  try {
    const data = await req('cart');
    cartItems.innerHTML = data.length
      ? data.map(item => `<p>${escapeHtml(item.name)} x ${Number(item.qty)} - Rp ${Number(item.subtotal).toLocaleString('id-ID')} <button onclick="removeItem(${Number(item.menu_id)})">Hapus</button></p>`).join('')
      : '<p>Keranjang kosong.</p>';
  } catch (error) { cartItems.innerHTML = `<p>${error.message}</p>`; }
}

async function orders() {
  if (!token) {
    orderItems.innerHTML = '<p>Login untuk melihat pesanan.</p>';
    return;
  }
  try {
    const data = await req('orders');
    orderItems.innerHTML = data.length
      ? data.map(order => `<article class="card"><h3>${escapeHtml(order.order_number)}</h3><p>Status: ${escapeHtml(order.status)}</p><p>Pembayaran: ${escapeHtml(order.payment_status || 'pending')}</p><p>Total: Rp ${Number(order.total_amount).toLocaleString('id-ID')}</p></article>`).join('')
      : '<p>Belum ada pesanan.</p>';
  } catch (error) {
    orderItems.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
  }
}

async function removeItem(id) {
  try {
    await req(`cart?menu_id=${encodeURIComponent(id)}`, { method: 'DELETE', body: JSON.stringify({ menu_id: id }) });
    await cart();
  } catch (error) { alert(error.message); }
}

login.onclick = async () => {
  if (token) {
    try { await req('auth/logout', { method: 'POST' }); } catch (error) { /* token is cleared below */ }
    token = '';
    localStorage.removeItem('token');
    updateLoginButton();
    await cart();
    await orders();
    return;
  }
  const email = prompt('Email');
  const password = prompt('Password');
  if (!email || !password) return;
  try {
    const result = await req('auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = result.token;
    localStorage.token = token;
    updateLoginButton();
    alert(`Halo ${result.user.name}`);
    await cart();
    await orders();
  } catch (error) { alert(error.message); }
};

checkout.onclick = async () => {
  if (!token) return login.click();
  try {
    const fulfillment = (prompt('Ketik pickup untuk ambil sendiri atau delivery untuk diantar', 'pickup') || '').trim().toLowerCase();
    if (!['pickup', 'delivery'].includes(fulfillment)) return alert('Pilih pickup atau delivery.');
    let addressId = null;
    if (fulfillment === 'delivery') {
      const addresses = await req('addresses');
      if (!addresses.length) return alert('Tambahkan alamat delivery terlebih dahulu.');
      const choices = addresses.map(address => `${address.id}: ${address.label || address.address_line}`).join('\n');
      addressId = Number(prompt(`Pilih ID alamat:\n${choices}`, addresses.find(address => Number(address.is_default))?.id || addresses[0].id));
      if (!addresses.some(address => Number(address.id) === addressId)) return alert('ID alamat tidak valid.');
    }
    const paymentMethod = (prompt('Metode pembayaran: cash, qris, ewallet, atau bank_transfer', 'cash') || '').trim().toLowerCase();
    if (!['cash', 'qris', 'ewallet', 'bank_transfer'].includes(paymentMethod)) return alert('Metode pembayaran tidak valid.');
    const result = await req('orders', {
      method: 'POST',
      body: JSON.stringify({ fulfillment_type: fulfillment, payment_method: paymentMethod, ...(addressId ? { address_id: addressId } : {}) })
    });
    alert(`Pesanan ${result.order_number} dibuat`);
    await cart();
    await orders();
  } catch (error) { alert(error.message); }
};

menu();
cart();
orders();
updateLoginButton();
