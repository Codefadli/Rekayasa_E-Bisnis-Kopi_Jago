<?php
const ORDER_FLOW = [
    'pending'     => ['confirmed', 'cancelled'],
    'confirmed'   => ['processing', 'cancelled'],
    'processing'  => ['ready', 'cancelled'],
    'ready'       => ['on_delivery', 'completed', 'cancelled'],
    'on_delivery' => ['completed', 'cancelled'],
    'completed'   => [],
    'cancelled'   => [],
];

function order_list(): never {
    $w = ['1=1']; $p = [];
    if (!empty($_GET['status']))         { $w[] = 'o.status=?';         $p[] = $_GET['status']; }
    if (!empty($_GET['payment_status'])) { $w[] = 'o.payment_status=?'; $p[] = $_GET['payment_status']; }
    if (!empty($_GET['fulfillment']))    { $w[] = 'o.fulfillment_type=?'; $p[] = $_GET['fulfillment']; }
    if (!empty($_GET['from']))           { $w[] = 'DATE(o.created_at)>=?'; $p[] = $_GET['from']; }
    if (!empty($_GET['to']))             { $w[] = 'DATE(o.created_at)<=?'; $p[] = $_GET['to']; }
    if (!empty($_GET['q'])) { $w[] = '(o.order_number LIKE ? OR u.name LIKE ? OR u.email LIKE ?)'; $p[] = $p[] = $p[] = '%' . $_GET['q'] . '%'; }
    $W = implode(' AND ', $w);
    paged("SELECT o.id,o.order_number,o.status,o.fulfillment_type,o.total_amount,o.payment_method,o.payment_status,
                  o.vehicle_id,o.created_at,u.name AS customer_name,u.phone AS customer_phone,
                  (SELECT SUM(qty) FROM order_items oi WHERE oi.order_id=o.id) AS item_count
           FROM orders o JOIN users u ON u.id=o.user_id WHERE $W",
          "SELECT COUNT(*) FROM orders o JOIN users u ON u.id=o.user_id WHERE $W", $p, 'ORDER BY o.id DESC');
}

function order_show(int $id): never {
    $o = one("SELECT o.*, u.name AS customer_name, u.email AS customer_email, u.phone AS customer_phone
              FROM orders o JOIN users u ON u.id=o.user_id WHERE o.id=?", [$id]) ?? fail('Pesanan tidak ada', 404);
    $o['items']   = all("SELECT oi.menu_id,m.name,oi.qty,oi.price,(oi.qty*oi.price) AS line_total
                         FROM order_items oi JOIN menu_items m ON m.id=oi.menu_id WHERE oi.order_id=?", [$id]);
    $o['address'] = $o['address_id'] ? one("SELECT * FROM addresses WHERE id=?", [$o['address_id']]) : null;
    $o['vehicle'] = $o['vehicle_id'] ? one("SELECT v.id,v.type,v.plate,u.name AS seller_name,u.phone AS seller_phone
                                            FROM vehicles v JOIN users u ON u.id=v.seller_id WHERE v.id=?", [$o['vehicle_id']]) : null;
    $o['allowed_next'] = ORDER_FLOW[$o['status']] ?? [];
    $o['assignment_history'] = all("SELECT a.action,a.vehicle_id,a.created_at,u.name AS admin_name
                                    FROM order_assignment_audit a JOIN users u ON u.id=a.admin_id
                                    WHERE a.order_id=? ORDER BY a.id DESC", [$id]);
    out($o);
}

function release_vehicle(?int $vehicleId): void {
    if (!$vehicleId) return;
    q("UPDATE vehicles SET is_available=1 WHERE id=?", [$vehicleId]);
    q("UPDATE seller_profiles sp JOIN vehicles v ON v.seller_id=sp.user_id SET sp.status='available'
       WHERE v.id=? AND sp.status='busy'", [$vehicleId]);
}

function order_set_status(int $id): never {
    $b = body(); need($b, ['status']);
    $adm = admin();
    tx(function () use ($id, $b, $adm) {
        $o = one("SELECT * FROM orders WHERE id=? FOR UPDATE", [$id]) ?? fail('Pesanan tidak ada', 404);
        $to = $b['status'];
        if (!isset(ORDER_FLOW[$to])) fail('Status tidak dikenal', 422);
        if (!in_array($to, ORDER_FLOW[$o['status']], true))
            fail("Transisi {$o['status']} ke $to tidak diizinkan", 409, ['allowed' => ORDER_FLOW[$o['status']]]);
        if ($to === 'on_delivery' && $o['fulfillment_type'] !== 'delivery') fail('Pesanan pickup tidak bisa dikirim', 409);
        if ($to === 'on_delivery' && !$o['vehicle_id']) fail('Tugaskan kendaraan dulu', 409);

        $extra = '';
        if ($to === 'completed' && $o['payment_method'] === 'cash' && $o['payment_status'] === 'pending') $extra = ", payment_status='paid'";
        q("UPDATE orders SET status=?$extra WHERE id=?", [$to, $id]);

        if ($to === 'cancelled') {
            foreach (all("SELECT menu_id,qty FROM order_items WHERE order_id=?", [$id]) as $it)
                move_stock((int)$it['menu_id'], 'order_cancel', (int)$it['qty'], null, "batal {$o['order_number']}", $adm['id']);
            if ($o['payment_status'] === 'paid') q("UPDATE orders SET payment_status='refunded' WHERE id=?", [$id]);
        }
        if (in_array($to, ['completed', 'cancelled'], true)) release_vehicle($o['vehicle_id'] ? (int)$o['vehicle_id'] : null);

        notify((int)$o['user_id'], "Pesanan {$o['order_number']}", "Status pesanan kamu sekarang: $to");
        audit('status', 'order', $id, ['from' => $o['status'], 'to' => $to, 'reason' => $b['reason'] ?? null]);
    });
    order_show($id);
}

function order_set_payment(int $id): never {
    $b = body(); need($b, ['payment_status']);
    in_enum($b['payment_status'], ['pending', 'paid', 'failed', 'refunded'], 'payment_status');
    $o = one("SELECT * FROM orders WHERE id=?", [$id]) ?? fail('Pesanan tidak ada', 404);
    q("UPDATE orders SET payment_status=? WHERE id=?", [$b['payment_status'], $id]);
    notify((int)$o['user_id'], "Pembayaran {$o['order_number']}", "Status pembayaran: {$b['payment_status']}");
    audit('payment', 'order', $id, ['from' => $o['payment_status'], 'to' => $b['payment_status']]);
    order_show($id);
}

function vehicle_available(): never {
    out(all("SELECT v.id,v.type,v.plate,u.name AS seller_name,sp.area,sp.status AS seller_status
             FROM vehicles v JOIN users u ON u.id=v.seller_id
             LEFT JOIN seller_profiles sp ON sp.user_id=v.seller_id
             WHERE v.is_available=1 AND u.is_active=1 AND COALESCE(sp.status,'offline')='available'
             ORDER BY v.type, u.name"));
}

function order_assign(int $id): never {
    $b = body(); need($b, ['vehicle_id']);
    $vid = (int)$b['vehicle_id'];
    $adm = admin();
    tx(function () use ($id, $vid, $adm) {
        $o = one("SELECT * FROM orders WHERE id=? FOR UPDATE", [$id]) ?? fail('Pesanan tidak ada', 404);
        if ($o['fulfillment_type'] !== 'delivery') fail('Pesanan pickup tidak butuh kendaraan', 409);
        if (!in_array($o['status'], ['confirmed', 'processing', 'ready'], true)) fail('Status pesanan belum/tidak bisa ditugaskan', 409);
        $v = one("SELECT v.*,sp.status AS seller_status FROM vehicles v LEFT JOIN seller_profiles sp ON sp.user_id=v.seller_id
                  WHERE v.id=? FOR UPDATE", [$vid]) ?? fail('Kendaraan tidak ada', 404);
        if (!$v['is_available'] || ($v['seller_status'] ?? 'offline') !== 'available') fail('Kendaraan tidak tersedia', 409);

        $prev = $o['vehicle_id'] ? (int)$o['vehicle_id'] : null;
        if ($prev) {
            release_vehicle($prev);
            q("INSERT INTO order_assignment_audit(order_id,vehicle_id,admin_id,action) VALUES (?,?,?,'unassign')", [$id, $prev, $adm['id']]);
        }
        q("UPDATE orders SET vehicle_id=? WHERE id=?", [$vid, $id]);
        q("UPDATE vehicles SET is_available=0 WHERE id=?", [$vid]);
        q("UPDATE seller_profiles SET status='busy' WHERE user_id=?", [$v['seller_id']]);
        q("INSERT INTO order_assignment_audit(order_id,vehicle_id,admin_id,action) VALUES (?,?,?,?)", [$id, $vid, $adm['id'], $prev ? 'reassign' : 'assign']);
        notify((int)$v['seller_id'], 'Tugas antar baru', "Pesanan {$o['order_number']} ditugaskan ke kamu");
        audit('assign', 'order', $id, ['vehicle_id' => $vid, 'previous' => $prev]);
    });
    order_show($id);
}

function order_unassign(int $id): never {
    $adm = admin();
    tx(function () use ($id, $adm) {
        $o = one("SELECT * FROM orders WHERE id=? FOR UPDATE", [$id]) ?? fail('Pesanan tidak ada', 404);
        if (!$o['vehicle_id']) fail('Belum ada kendaraan', 409);
        if ($o['status'] === 'on_delivery') fail('Sedang diantar, tidak bisa dilepas', 409);
        release_vehicle((int)$o['vehicle_id']);
        q("UPDATE orders SET vehicle_id=NULL WHERE id=?", [$id]);
        q("INSERT INTO order_assignment_audit(order_id,vehicle_id,admin_id,action) VALUES (?,?,?,'unassign')", [$id, $o['vehicle_id'], $adm['id']]);
        audit('unassign', 'order', $id, ['vehicle_id' => (int)$o['vehicle_id']]);
    });
    order_show($id);
}
