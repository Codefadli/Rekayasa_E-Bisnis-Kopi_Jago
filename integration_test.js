// Full integration test for Kopi Jago V3
const http = require('http');

function get(endpoint, headers = {}) {
  return new Promise((resolve, reject) => {
    http.get(endpoint, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    }).on('error', reject);
  });
}

async function run() {
  const auth = async () => {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: '127.0.0.1', port: 8080, path: '/backend/api/index.php',
        method: 'POST', headers: { 'Content-Type': 'application/json' }
      }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
      req.write(JSON.stringify({ _path: 'auth/login', email: 'admin@kopijago.com', password: 'password' }));
      req.end();
    });
  };

  console.log('=== 1. LOGIN ADMIN ===');
  const login = await auth();
  console.log('Login:', login.success ? 'OK' : 'FAIL', login.message);
  if (!login.success) { console.error('STOP: cannot login'); process.exit(1); }
  const token = login.data.token;

  const h = { Authorization: 'Bearer ' + token };

  console.log('\n=== 2. MENU ENDPOINT ===');
  let m = await get('http://127.0.0.1:8080/backend/api/menu', h);
  console.log('Status:', m.status);
  const items = m.body.data || m.body;
  console.log('Total items:', items.length);
  const names = items.map(i => i.name);
  console.log('Unique names:', new Set(names).size, '-> duplicate:', names.some((v, i, a) => a.indexOf(v) !== i));
  names.forEach(n => console.log('  -', n));

  console.log('\n=== 3. STATS ===');
  let s = await get('http://127.0.0.1:8080/backend/api/admin/stats', h);
  console.log('Status:', s.status, '->', s.body.success ? 'OK' : s.body.message);
  if (s.body.success) console.log('Data:', JSON.stringify(s.body.data));

  console.log('\n=== 4. CUSTOMERS ===');
  let c = await get('http://127.0.0.1:8080/backend/api/admin/customers', h);
  console.log('Status:', c.status, '->', c.body.success ? 'OK' : c.body.message);
  if (c.body.success) console.log('Customer count:', c.body.data.length);

  console.log('\n=== 5. ADMIN ORDERS ===');
  let o = await get('http://127.0.0.1:8080/backend/api/admin/orders', h);
  console.log('Status:', o.status, '->', o.body.success ? 'OK' : o.body.message);
  if (o.body.success) console.log('Orders count:', o.body.data.length);

  console.log('\n=== 6. ANALYTICS ===');
  let a = await get('http://127.0.0.1:8080/backend/api/admin/analytics', h);
  console.log('Status:', a.status, '->', a.body.success ? 'OK' : a.body.message);
  if (a.body.success) console.log('category_sales:', JSON.stringify(a.body.data.category_sales));

  console.log('\n=== 7. ADMIN ORDERS UPDATE (PATCH) ===');
  let update = await new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1', port: 8080, path: '/backend/api/index.php',
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
    }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    req.write(JSON.stringify({ _path: 'admin/orders', id: 1, status: 'confirmed' }));
    req.end();
  });
  console.log('Status:', update.success ? 'OK' : 'FAIL', update.message);

  console.log('\n=== 8. ADMIN ORDERS STATUS ===');
  let status = await new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1', port: 8080, path: '/backend/api/index.php',
      method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
    }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    req.write(JSON.stringify({ _path: 'orders/1/status', status: 'confirmed' }));
    req.end();
  });
  console.log('Status:', status.success ? 'OK' : 'FAIL', status.message);

  console.log('\n=== 9. LOGOUT ===');
  let out = await new Promise((resolve) => {
    const req = http.request({
      hostname: '127.0.0.1', port: 8080, path: '/backend/api/index.php',
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }
    }, (res) => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d))); });
    req.write(JSON.stringify({ _path: 'auth/logout' }));
    req.end();
  });
  console.log('Logout:', out.success ? 'OK' : 'FAIL', out.message);

  console.log('\n=== ALL TESTS COMPLETED ===');
}

run().catch(e => { console.error('ERROR:', e.message); process.exit(1); });