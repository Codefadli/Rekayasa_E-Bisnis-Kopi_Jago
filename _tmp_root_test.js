// Replica of kjApplicationRoot as currently in assets/js/jago-core.js
function kjApplicationRoot(path) {
    if (/^\/(?:frontend|customer|admin|seller|backend)(?:\/|$)/.test(path)) return '';
    const marker = path.match(/^(.+?)\/(?:frontend|customer|admin|seller|backend)\//);
    if (marker) return marker[1];
    const slash = path.lastIndexOf('/');
    return path.slice(0, slash) || '';
}

const tests = [
    '/customer/checkout.html',
    '/customer/orders.html',
    '/customer/home.html',
    '/customer/cart.html',
    '/customer/profile.html',
    '/customer/wishlist.html',
    '/login.html',
    '/kopi/customer/home.html'
];

tests.forEach(function (p) {
    const r = kjApplicationRoot(p);
    console.log(p.padEnd(30) + ' | root="' + r + '" | checkout=' + r + '/customer/checkout.html | icon=' + r + '/icon.jpg');
});
