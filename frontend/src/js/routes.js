(function (global) {
    function appBase() {
        const path = window.location.pathname;
        const marker = '/frontend/src/';
        const markerIndex = path.indexOf(marker);
        if (markerIndex >= 0) return path.slice(0, markerIndex) || '';
        const fileIndex = path.lastIndexOf('/');
        return path.slice(0, fileIndex) || '';
    }

    const base = appBase();
    const route = path => `${base}/frontend/src/${path}`;
    const KJ_ROUTES = Object.freeze({
        login: `${base}/login.html`,
        register: `${base}/login.html#register`,
        home: route('customer/home.html'),
        menu: route('customer/menu.html'),
        cart: route('customer/cart.html'),
        orders: route('customer/orders.html'),
        tracking: route('customer/order-tracking.html'),
        reservation: route('customer/reservation.html'),
        support: route('customer/support.html'),
        profile: route('customer/settings/profile.html'),
        wishlist: route('customer/settings/wishlist.html'),
        notifications: route('customer/settings/notifications.html'),
        changePassword: route('customer/settings/change-password.html'),
        shipping: route('customer/shipping/index.html'),
        payment: route('customer/payment/methods.html'),
        admin: route('admin/dashboard.html'),
        seller: route('seller/dashboard.html')
    });

    global.KJ_ROUTES = KJ_ROUTES;
    global.kjNavigate = function (name) {
        if (!KJ_ROUTES[name]) throw new Error(`Route tidak ditemukan: ${name}`);
        window.location.assign(KJ_ROUTES[name]);
    };
}(window));
