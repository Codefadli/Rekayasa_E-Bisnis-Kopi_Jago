<?php
function customer_list(): never {
    $w = ['u.role_id=1']; $p = [];
    if (!empty($_GET['q'])) { $w[] = '(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)'; $p[] = $p[] = $p[] = '%' . $_GET['q'] . '%'; }
    if (isset($_GET['active'])) { $w[] = 'u.is_active=?'; $p[] = bool01($_GET['active']); }
    $W = implode(' AND ', $w);
    paged("SELECT u.id,u.name,u.email,u.phone,u.is_active,u.created_at,
                  COUNT(o.id) AS order_count,
                  COALESCE(SUM(CASE WHEN o.status='completed' THEN o.total_amount END),0) AS total_spent,
                  MAX(o.created_at) AS last_order_at
           FROM users u LEFT JOIN orders o ON o.user_id=u.id WHERE $W GROUP BY u.id",
          "SELECT COUNT(*) FROM users u WHERE $W", $p, 'ORDER BY u.id DESC');
}
function customer_show(int $id): never {
    $u = one("SELECT id,name,email,phone,birth_date,is_active,created_at FROM users WHERE id=? AND role_id=1", [$id])
        ?? fail('Pelanggan tidak ada', 404);
    $u['addresses'] = all("SELECT * FROM addresses WHERE user_id=?", [$id]);
    $u['stats'] = one("SELECT COUNT(*) AS orders,
                       COALESCE(SUM(CASE WHEN status='completed' THEN total_amount END),0) AS spent,
                       COALESCE(SUM(status='cancelled'),0) AS cancelled
                       FROM orders WHERE user_id=?", [$id]);
    $u['recent_orders'] = all("SELECT id,order_number,status,total_amount,created_at FROM orders
                               WHERE user_id=? ORDER BY id DESC LIMIT 10", [$id]);
    out($u);
}
function customer_set_active(int $id): never {
    $b = body(); need($b, ['is_active']);
    one("SELECT 1 FROM users WHERE id=? AND role_id=1", [$id]) ?? fail('Pelanggan tidak ada', 404);
    $a = bool01($b['is_active']);
    q("UPDATE users SET is_active=? WHERE id=?", [$a, $id]);
    if (!$a) q("DELETE FROM auth_tokens WHERE user_id=?", [$id]);
    audit($a ? 'activate' : 'deactivate', 'customer', $id);
    out(['id' => $id, 'is_active' => (bool)$a]);
}
