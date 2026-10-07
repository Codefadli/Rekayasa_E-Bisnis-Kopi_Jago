<?php
function reservation_list(): never {
    $w = ['1=1']; $p = [];
    if (!empty($_GET['status'])) { $w[] = 'r.status=?'; $p[] = $_GET['status']; }
    if (!empty($_GET['date']))   { $w[] = 'DATE(r.reserved_at)=?'; $p[] = $_GET['date']; }
    if (!empty($_GET['q']))      { $w[] = '(u.name LIKE ? OR u.phone LIKE ?)'; $p[] = $p[] = '%' . $_GET['q'] . '%'; }
    $W = implode(' AND ', $w);
    paged("SELECT r.*, u.name AS customer_name, u.phone AS customer_phone
           FROM reservations r JOIN users u ON u.id=r.user_id WHERE $W",
          "SELECT COUNT(*) FROM reservations r JOIN users u ON u.id=r.user_id WHERE $W", $p,
          'ORDER BY FIELD(r.status,"pending","confirmed","completed","rejected","cancelled"), r.reserved_at');
}
function reservation_show(int $id): never {
    out(one("SELECT r.*, u.name AS customer_name, u.phone AS customer_phone, u.email AS customer_email
             FROM reservations r JOIN users u ON u.id=r.user_id WHERE r.id=?", [$id]) ?? fail('Reservasi tidak ada', 404));
}
function reservation_conflict(int $tableNo, string $at, int $ignoreId): bool {
    $slot = (int) setting('reservation_slot_minutes', 120);
    return (bool) val("SELECT 1 FROM reservations WHERE status='confirmed' AND table_no=? AND id<>?
                       AND reserved_at < DATE_ADD(?, INTERVAL ? MINUTE)
                       AND DATE_ADD(reserved_at, INTERVAL ? MINUTE) > ? LIMIT 1",
                      [$tableNo, $ignoreId, $at, $slot, $slot, $at]);
}
function reservation_confirm(int $id): never {
    $b = body(); need($b, ['table_no']);
    $adm = admin();
    tx(function () use ($id, $b, $adm) {
        $r = one("SELECT * FROM reservations WHERE id=? FOR UPDATE", [$id]) ?? fail('Reservasi tidak ada', 404);
        if ($r['status'] !== 'pending') fail("Reservasi sudah {$r['status']}", 409);
        $t = (int)$b['table_no'];
        if ($t < 1) fail('Nomor meja tidak valid', 422);
        if (reservation_conflict($t, $r['reserved_at'], $id)) fail("Meja $t bentrok dengan reservasi lain", 409);
        q("UPDATE reservations SET status='confirmed',table_no=?,admin_note=?,handled_by=?,handled_at=NOW() WHERE id=?",
          [$t, $b['admin_note'] ?? null, $adm['id'], $id]);
        notify((int)$r['user_id'], 'Reservasi dikonfirmasi', "Meja $t untuk {$r['reserved_at']} sudah disiapkan.");
        audit('confirm', 'reservation', $id, ['table_no' => $t]);
    });
    reservation_show($id);
}
function reservation_reject(int $id): never {
    $b = body(); need($b, ['reason']);
    $adm = admin();
    tx(function () use ($id, $b, $adm) {
        $r = one("SELECT * FROM reservations WHERE id=? FOR UPDATE", [$id]) ?? fail('Reservasi tidak ada', 404);
        if (!in_array($r['status'], ['pending', 'confirmed'], true)) fail("Reservasi sudah {$r['status']}", 409);
        q("UPDATE reservations SET status='rejected',table_no=NULL,admin_note=?,handled_by=?,handled_at=NOW() WHERE id=?",
          [$b['reason'], $adm['id'], $id]);
        notify((int)$r['user_id'], 'Reservasi ditolak', "Maaf, reservasi ditolak: {$b['reason']}");
        audit('reject', 'reservation', $id, ['reason' => $b['reason']]);
    });
    reservation_show($id);
}
function reservation_complete(int $id): never {
    $r = one("SELECT * FROM reservations WHERE id=?", [$id]) ?? fail('Reservasi tidak ada', 404);
    if ($r['status'] !== 'confirmed') fail('Hanya reservasi confirmed yang bisa diselesaikan', 409);
    q("UPDATE reservations SET status='completed' WHERE id=?", [$id]);
    audit('complete', 'reservation', $id);
    reservation_show($id);
}
