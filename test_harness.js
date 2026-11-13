const http = require('http');

const HOST = '127.0.0.1';
const PORT = 8080;
const RESULTS = [];

function request(path, options = {}) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            host: HOST, port: PORT,
            path,
            method: options.method || 'GET',
            headers: Object.assign({ 'Content-Type': 'application/json' }, options.headers || {})
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                let parsed = null;
                try { parsed = JSON.parse(data); } catch (e) {}
                resolve({ status: res.statusCode, body: data, parsed });
            });
        });
        req.on('error', reject);
        if (options.body) req.write(JSON.stringify(options.body));
        req.end();
    });
}

function items(res) {
    if (!res) return [];
    if (Array.isArray(res)) return res;
    if (Array.isArray(res.data)) return res.data;
    return [];
}

async function login(email, password) {
    const res = await request('/backend/api/auth/login', {
        method: 'POST', body: { email, password }
    });
    return res.parsed?.data?.token || null;
}

async function api(token, path, method = 'GET', body = null) {
    const res = await request(`/backend/api/${path}`, {
        method, headers: { 'Authorization': `Bearer ${token}` }, body
    });
    return res.parsed;
}

function record(name, status, detail) {
    RESULTS.push({ name, status, detail });
    console.log(`  [${status.toUpperCase()}] ${name}${detail ? ' :: ' + detail : ''}`);
}

async function main() {
    console.log('\n=================== KOPI JAGO TEST HARNESS ===================\n');

    // TEST 1: Homepage images
    console.log('TEST 1: Product images on homepage');
    const home = await request('/customer/home.html');
    record('Homepage loads', home.status === 200 ? 'PASS' : 'FAIL', `status=${home.status}`);

    // TEST 2: Login as customer
    console.log('\nTEST 2: Authentication');
    let token = null;
    for (const cred of ['daniel@gmail.com', 'james@gmail.com', 'test2@example.com']) {
        token = await login(cred, 'password');
        if (token) break;
    }
    if (!token) {
        record('Login customer', 'FAIL', 'No customer credentials work');
        process.exit(1);
    }
    const me = await api(token, 'auth/me');
    const userId = me?.data?.id || me?.id;
    record('Login customer', 'PASS', `user=${userId}`);

    // TEST 3: Wishlist persistence
    console.log('\nTEST 3: Wishlist persistence');
    if (token) {
        const existing = await api(token, 'wishlist');
        const initialSize = items(existing).length;
        record('GET /wishlist', 'PASS', `returned ${initialSize} items`);

        const add = await api(token, 'wishlist', 'POST', { menu_id: 5 });
        record('POST /wishlist (add Pink Coco)', add.success ? 'PASS' : 'FAIL', add.message || '');
        if (add.success) {
            const afterAdd = await api(token, 'wishlist');
            const afterSize = items(afterAdd).length;
            record('Wishlist persists after ADD', afterSize === initialSize + 1 ? 'PASS' : 'FAIL',
                `before=${initialSize} after=${afterSize}`);

            const remove = await api(token, 'wishlist?menu_id=5', 'DELETE');
            record('DELETE /wishlist (remove Pink Coco)', remove.success ? 'PASS' : 'FAIL', remove.message || '');
            if (remove.success) {
                const final = await api(token, 'wishlist');
                const finalSize = items(final).length;
                record('Wishlist persists after REMOVE', finalSize === initialSize ? 'PASS' : 'FAIL',
                    `expected=${initialSize} actual=${finalSize}`);
            }
        }

        const wishPage = await request('/customer/wishlist.html');
        record('Wishlist page loads', wishPage.status === 200 ? 'PASS' : 'FAIL', `status=${wishPage.status}`);
        record('Wishlist page has JS', wishPage.body.includes('loadWishlist') ? 'PASS' : 'FAIL', '');
        record('Wishlist page remove handler', wishPage.body.includes('removeFromWishlist') ? 'PASS' : 'FAIL', '');
    }

    // TEST 4: Cart -> Checkout redirect
    console.log('\nTEST 4: Cart -> Checkout redirect logic');
    if (token) {
        await api(token, 'cart', 'DELETE');
        const cartAdd = await api(token, 'cart', 'POST', { menu_id: 5, size: 'medium', qty: 1 });
        record('POST /cart (add Pink Coco)', cartAdd.success ? 'PASS' : 'FAIL', cartAdd.message || '');
        if (cartAdd.success) {
            const cart = await api(token, 'cart');
            const cartSize = items(cart).length;
            record('Cart has 1 item', cartSize === 1 ? 'PASS' : 'FAIL', `items=${cartSize}`);
            if (cartSize === 1) {
                const cartPage = await request('/customer/cart.html');
                record('Cart page has checkout button', cartPage.body.includes('Lanjut ke Checkout') ? 'PASS' : 'FAIL', '');
                record('Cart page uses goToCheckout()', cartPage.body.includes('goToCheckout()') ? 'PASS' : 'FAIL', '');
                record('cart.html loads cart.js', cartPage.body.includes('cart.js') ? 'PASS' : 'FAIL', '');
                const cartJs = await request('/customer/cart.js');
                record('cart.js redirects to /customer/checkout.html',
                    cartJs.body.includes('/customer/checkout.html') ? 'PASS' : 'FAIL', '');
                record('cart.js goToCheckout exists', cartJs.body.includes('function goToCheckout') ? 'PASS' : 'FAIL', '');
                record('cart.js empty-cart warning', cartJs.body.includes('Keranjang masih kosong') ? 'PASS' : 'FAIL', '');

                const checkoutPage = await request('/customer/checkout.html');
                record('checkout.html loads', checkoutPage.status === 200 ? 'PASS' : 'FAIL', `status=${checkoutPage.status}`);
                record('checkout.html has product-render JS', checkoutPage.body.includes('renderOrderItems') ? 'PASS' : 'FAIL', '');
                record('checkout.html shows product names',
                    checkoutPage.body.includes('cart-item-name') ? 'PASS' : 'FAIL', '');
                record('checkout.html shows prices',
                    checkoutPage.body.includes('cart-item-price') ? 'PASS' : 'FAIL', '');
            }
        }
        await api(token, 'cart', 'DELETE');
    }

    // TEST 5: Menu data integrity
    console.log('\nTEST 5: Menu data integrity');
    const menu = await api(token, 'menu');
    const itemArr = items(menu);
    const uniqueNames = new Set(itemArr.map(i => i.name));
    record('Menu has 8 items', itemArr.length === 8 ? 'PASS' : 'FAIL', `count=${itemArr.length}`);
    record('No duplicate product names', uniqueNames.size === itemArr.length ? 'PASS' : 'FAIL',
        `items=${itemArr.length} unique=${uniqueNames.size}`);
    const expected = ['Mont Blanc Shake','Pink Coco','Citrus Cold Brew','Jago Americano',
        'Jago Chocolate','Kopi Susu Jago','Matcha Latte','Salted Caramel Latte'];
    const missing = expected.filter(n => !uniqueNames.has(n));
    record('All 8 expected product names present', missing.length === 0 ? 'PASS' : 'FAIL',
        missing.length ? `missing=${missing.join(',')}` : '');

    console.log('\n=================== RESULTS SUMMARY ===================\n');
    const passed = RESULTS.filter(r => r.status === 'PASS').length;
    const failed = RESULTS.filter(r => r.status === 'FAIL').length;
    const skipped = RESULTS.filter(r => r.status === 'SKIPPED').length;
    console.log(`Passed: ${passed}  |  Failed: ${failed}  |  Skipped: ${skipped}  |  Total: ${RESULTS.length}`);
    console.log('\n=================== DETAILED REPORT ===================\n');
    for (const r of RESULTS) {
        const prefix = r.status === 'PASS' ? '  ✓' : (r.status === 'FAIL' ? '  ✗' : '  -');
        console.log(`${prefix} ${r.name}: ${r.detail || r.status}`);
    }
    console.log('\n=================== DONE ===================\n');
    process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
    console.error('Harness error:', err);
    process.exit(2);
});
