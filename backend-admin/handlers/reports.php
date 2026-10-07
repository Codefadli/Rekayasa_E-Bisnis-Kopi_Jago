<?php
function report_range(): array {
    $to   = $_GET['to']   ?? date('Y-m-d');
    $from = $_GET['from'] ?? date('Y-m-d', strtotime('-29 days', strtotime($to)));
    foreach ([$from, $to] as $d) if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $d)) fail('Format tanggal YYYY-MM-DD', 422);
    if ($from > $to) fail('from setelah to', 422);
    return [$from, $to];
}

function report_overview(): never {
    [$from, $to] = report_range();
    $p = [$from, $to];
    $base = "o.status='completed' AND DATE(o.created_at) BETWEEN ? AND ?";

    $summary = one("SELECT COUNT(*) AS orders, COALESCE(SUM(total_amount),0) AS revenue,
                    COALESCE(SUM(discount_amount),0) AS discounts,
                    COALESCE(ROUND(AVG(total_amount),0),0) AS avg_order_value
                    FROM orders o WHERE $base", $p);
    $summary['cancelled'] = (int) val("SELECT COUNT(*) FROM orders WHERE status='cancelled' AND DATE(created_at) BETWEEN ? AND ?", $p);
    $summary['items_sold'] = (int) val("SELECT COALESCE(SUM(oi.qty),0) FROM order_items oi JOIN orders o ON o.id=oi.order_id WHERE $base", $p);
    $summary['new_customers'] = (int) val("SELECT COUNT(*) FROM users WHERE role_id=1 AND DATE(created_at) BETWEEN ? AND ?", $p);

    // seri harian, hari kosong diisi 0 supaya grafik tidak bolong
    $rows = all("SELECT DATE(o.created_at) AS d, COUNT(*) AS orders, SUM(o.total_amount) AS revenue
                 FROM orders o WHERE $base GROUP BY d", $p);
    $map = array_column($rows, null, 'd');
    $daily = [];
    for ($t = strtotime($from); $t <= strtotime($to); $t += 86400) {
        $d = date('Y-m-d', $t);
        $daily[] = ['date' => $d, 'orders' => (int)($map[$d]['orders'] ?? 0), 'revenue' => (float)($map[$d]['revenue'] ?? 0)];
    }

    $topMenu = all("SELECT m.id,m.name,SUM(oi.qty) AS qty, SUM(oi.qty*oi.price) AS revenue
                    FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN menu_items m ON m.id=oi.menu_id
                    WHERE $base GROUP BY m.id,m.name ORDER BY qty DESC LIMIT 10", $p);
    $byCategory = all("SELECT c.name, SUM(oi.qty) AS qty, SUM(oi.qty*oi.price) AS revenue
                       FROM order_items oi JOIN orders o ON o.id=oi.order_id
                       JOIN menu_items m ON m.id=oi.menu_id JOIN menu_categories c ON c.id=m.category_id
                       WHERE $base GROUP BY c.id,c.name ORDER BY revenue DESC", $p);
    $byPayment = all("SELECT payment_method, COUNT(*) AS orders, SUM(total_amount) AS revenue
                      FROM orders o WHERE $base GROUP BY payment_method ORDER BY revenue DESC", $p);
    $byFulfillment = all("SELECT fulfillment_type, COUNT(*) AS orders, SUM(total_amount) AS revenue
                          FROM orders o WHERE $base GROUP BY fulfillment_type", $p);
    $byHour = all("SELECT HOUR(o.created_at) AS hour, COUNT(*) AS orders
                   FROM orders o WHERE $base GROUP BY hour ORDER BY hour", $p);

    out(compact('summary', 'daily', 'topMenu', 'byCategory', 'byPayment', 'byFulfillment', 'byHour')
        + ['range' => ['from' => $from, 'to' => $to]]);
}

function report_export_csv(): never {
    [$from, $to] = report_range();
    $rows = all("SELECT o.order_number,o.created_at,u.name AS customer,o.fulfillment_type,o.payment_method,
                 o.subtotal,o.discount_amount,o.shipping_cost,o.total_amount
                 FROM orders o JOIN users u ON u.id=o.user_id
                 WHERE o.status='completed' AND DATE(o.created_at) BETWEEN ? AND ? ORDER BY o.id", [$from, $to]);
    audit('export', 'report', null, ['from' => $from, 'to' => $to, 'rows' => count($rows)]);
    header('Content-Type: text/csv; charset=utf-8');
    header("Content-Disposition: attachment; filename=\"penjualan_{$from}_{$to}.csv\"");
    $f = fopen('php://output', 'w');
    fwrite($f, "\xEF\xBB\xBF"); // BOM biar Excel baca UTF-8
    fputcsv($f, ['No Pesanan', 'Waktu', 'Pelanggan', 'Layanan', 'Pembayaran', 'Subtotal', 'Diskon', 'Ongkir', 'Total']);
    foreach ($rows as $r) {
        // cegah CSV formula injection dari nama pelanggan
        $r['customer'] = preg_match('/^[=+\-@]/', $r['customer']) ? "'" . $r['customer'] : $r['customer'];
        fputcsv($f, $r);
    }
    fclose($f);
    exit;
}

function dashboard_stats(): never {
    $today = date('Y-m-d');
    out([
        'orders_today'   => (int) val("SELECT COUNT(*) FROM orders WHERE DATE(created_at)=?", [$today]),
        'revenue_today'  => (float) val("SELECT COALESCE(SUM(total_amount),0) FROM orders WHERE status='completed' AND DATE(created_at)=?", [$today]),
        'pending_orders' => (int) val("SELECT COUNT(*) FROM orders WHERE status='pending'"),
        'pending_reservations' => (int) val("SELECT COUNT(*) FROM reservations WHERE status='pending'"),
        'unanswered_chats' => (int) val("SELECT COUNT(*) FROM users u JOIN support_messages m ON m.id=(SELECT MAX(id) FROM support_messages WHERE user_id=u.id) WHERE m.sender_role='customer'"),
        'low_stock' => (int) val("SELECT COUNT(*) FROM menu_items m LEFT JOIN inventory_stock s ON s.menu_id=m.id WHERE COALESCE(s.stock,0) <= ?", [(int) setting('low_stock_threshold', 10)]),
    ]);
}
