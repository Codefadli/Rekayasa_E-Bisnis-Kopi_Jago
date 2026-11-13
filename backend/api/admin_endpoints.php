<?php
// Admin API endpoints
// All admin endpoints require Auth::require(['admin'])

// Total customers
if ($path === 'admin/customers' && $method === 'GET') {
    Auth::require(['admin']);
    $q = $db->query('SELECT id, name, email, phone, birth_date, created_at, is_active FROM users WHERE role_id = 2 ORDER BY created_at DESC');
    Response::json($q->fetchAll());
}

// Total stats
if ($path === 'admin/stats' && $method === 'GET') {
    Auth::require(['admin']);
    
    // Total customers
    $customers = $db->query('SELECT COUNT(*) as count FROM users WHERE role_id = 2')->fetch();
    
    // Total orders
    $orders = $db->query('SELECT COUNT(*) as count FROM orders')->fetch();
    
    // Pending orders
    $pending = $db->query('SELECT COUNT(*) as count FROM orders WHERE status = "pending"')->fetch();
    
    // Completed orders
    $completed = $db->query('SELECT COUNT(*) as count FROM orders WHERE status = "completed"')->fetch();
    
    // Total revenue
    $revenue = $db->query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE payment_status = "paid"')->fetch();
    
    // Recent orders (last 10)
    $recentOrders = $db->query('SELECT o.*, u.name as customer_name FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC LIMIT 10')->fetchAll();
    
    Response::json([
        'customers' => (int)$customers['count'],
        'orders' => (int)$orders['count'],
        'pending' => (int)$pending['count'],
        'completed' => (int)$completed['count'],
        'revenue' => (float)$revenue['total'],
        'recent_orders' => $recentOrders
    ]);
}

// Analytics
if ($path === 'admin/analytics' && $method === 'GET') {
    Auth::require(['admin']);
    
    // Sales by category
    $categorySales = $db->query('
        SELECT c.name as category, 
               COUNT(oi.menu_id) as total_items, 
               SUM(oi.qty * oi.price) as total_revenue
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        JOIN menu_items m ON m.id = oi.menu_id
        JOIN menu_categories c ON c.id = m.category_id
        WHERE o.payment_status = "paid"
        GROUP BY c.name
    ')->fetchAll();
    
    // Daily sales (last 7 days)
    $dailySales = $db->query('
        SELECT DATE(created_at) as date, 
               COUNT(*) as orders, 
               SUM(total_amount) as revenue
        FROM orders
        WHERE payment_status = "paid" AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY date DESC
    ')->fetchAll();
    
    Response::json([
        'category_sales' => $categorySales,
        'daily_sales' => $dailySales
    ]);
}

// Orders
if ($path === 'orders' && $method === 'GET') {
    $u = Auth::require();
    $sql = ($u['role'] == 'customer') ? 
        "SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC" :
        "SELECT o.*, u.name as customer_name FROM orders o JOIN users u ON u.id = o.user_id ORDER BY o.created_at DESC";
    $q = $db->prepare($sql);
    $q->execute($u['role'] === 'admin' ? [] : [$u['id']]);
    Response::json($q->fetchAll());
}

// Order details
if (preg_match('#^orders/(\\d+)$#', $path, $m) && $method === 'GET') {
    $u = Auth::require();
    $order = require_order($db, (int)$m[1], $u);
    Response::json($order);
}

// Order status update
if (preg_match('#^orders/(\\d+)/status$#', $path, $m) && $method === 'PATCH') {
    $u = Auth::require(['admin','seller']);
    $o = require_order($db, (int)$m[1], $u);
    $allowed = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['processing', 'cancelled'],
        'processing' => ['ready', 'cancelled'],
        'ready' => ['on_delivery', 'completed'],
        'on_delivery' => ['completed'],
        'completed' => [],
        'cancelled' => []
    ];
    $new = $body['status'] ?? '';
    if (!in_array($new, $allowed[$o['status']], true)) {
        Response::error('Transisi status tidak valid', 422);
    }
    $db->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$new, $m[1]]);
    notify($db, (int)$o['user_id'], 'Status order diperbarui', 'Order '. $o['order_number'] .' sekarang '. $new.'.');
    Response::json(['message' => 'Status updated']);
}

// Order assignment
if ($path === 'orders/(\\d+)/assign$#' && $method === 'PATCH') {
    $u = Auth::require(['admin']);
    $vid = (int)($body['vehicle_id'] ?? 0);
    $q = $db->prepare("UPDATE orders o 
        JOIN vehicles v ON v.id = ? 
        JOIN users s ON s.id = v.seller_id 
        JOIN roles r ON r.id = s.role_id 
        SET o.vehicle_id = ? 
        WHERE o.id = ? AND v.is_available = 1 AND r.name = 'seller' AND o.status = 'pending'");
    $q->execute([$vid, $m[1]]);
    if (!$q->rowCount()) {
        Response::error('Order atau kendaraan tidak valid', 422);
    }
    $db->prepare('INSERT INTO order_assignment_audit(order_id,vehicle_id,admin_id,action) 
        VALUES(?,?,?,?)')->execute([$m[1], $vid, $u['id'], 'assigned']);
    $o = $db->prepare('SELECT user_id,order_number FROM orders WHERE id = ?');
    $o->execute([$m[1]]);
    if ($assigned = $o->fetch()) {
        notify($db, (int)$assigned['user_id'], 'Seller ditugaskan', 'Seller telah ditugaskan untuk order '. $o['order_number'] .'.');
    }
    Response::json(['message' => 'Seller assigned']);
}

// Order payment status
if (preg_match('#^orders/(\\d+)/payment$#', $path, $m) && $method === 'PATCH') {
    Auth::require(['admin']);
    $status = $body['payment_status'] ?? '';
    if (!in_array($status, ['pending', 'paid', 'failed', 'refunded'], true)) {
        Response::error('Status pembayaran tidak valid', 422);
    }
    $q = $db->prepare('UPDATE orders SET payment_status = ? WHERE id = ?');
    $q->execute([$status, $m[1]]);
    $o = $db->prepare('SELECT user_id,order_number FROM orders WHERE id = ?');
    $o->execute([$m[1]]);
    if ($row = $o->fetch()) {
        notify($db, (int)$row['user_id'], 'Status pembayaran diperbarui', 'Pembayaran order '. $o['order_number'] .' berstatus '. $status.'.');
    }
    Response::json(['message' => 'Payment status updated']);
}

// Seller order actions
if ($path === 'seller/orders/(\\d+)/action$#' && $method === 'POST') {
    $u = Auth::require(['seller']);
    $actions = [
        'accepted' => 'confirmed',
        'preparing' => 'processing',
        'ready' => 'ready',
        'on_the_way' => 'on_delivery',
        'delivered' => 'completed',
        'failed' => 'cancelled'
    ];
    $action = $body['action'] ?? '';
    if (!isset($actions[$action])) {
        Response::error('Aksi seller tidak valid', 422);
    }
    $o = require_order($db, (int)$m[1], $u);
    $new = $actions[$action];
    $allowed = [
        'pending' => ['confirmed'],
        'confirmed' => ['processing'],
        'processing' => ['ready'],
        'ready' => ['on_delivery', 'completed'],
        'on_delivery' => ['completed'],
        'completed' => [],
        'cancelled' => []
    ];
    if (!in_array($new, $allowed[$o['status']], true)) {
        Response::error('Aksi tidak sesuai status order', 422);
    }
    $db->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$new, $m[1]]);
    notify($db, (int)$o['user_id'], 'Status order diperbarui', 'Order '. $o['order_number'] .' sekarang '. $new.'.');
    Response::json(['message' => 'Seller action accepted', 'status' => $new]);
}
?>