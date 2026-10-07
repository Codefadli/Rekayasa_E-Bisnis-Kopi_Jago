<?php
function supplier_list(): never {
    $w = ['1=1']; $p = [];
    if (!empty($_GET['q'])) { $w[] = '(name LIKE ? OR contact_name LIKE ?)'; $p[] = $p[] = '%' . $_GET['q'] . '%'; }
    if (isset($_GET['active'])) { $w[] = 'is_active=?'; $p[] = bool01($_GET['active']); }
    $W = implode(' AND ', $w);
    paged("SELECT * FROM suppliers WHERE $W", "SELECT COUNT(*) FROM suppliers WHERE $W", $p, 'ORDER BY name');
}
function supplier_show(int $id): never {
    $s = one("SELECT * FROM suppliers WHERE id=?", [$id]) ?? fail('Supplier tidak ada', 404);
    $s['recent_movements'] = all("SELECT sm.id,sm.type,sm.qty,sm.created_at,m.name AS menu_name
        FROM stock_movements sm JOIN menu_items m ON m.id=sm.menu_id
        WHERE sm.supplier_id=? ORDER BY sm.id DESC LIMIT 10", [$id]);
    out($s);
}
function supplier_check(array $b): void {
    $e = [];
    if (!empty($b['email']) && !filter_var($b['email'], FILTER_VALIDATE_EMAIL)) $e['email'] = 'format salah';
    if ($e) fail('Validasi gagal', 422, $e);
}
function supplier_create(): never {
    $b = body(); need($b, ['name']); supplier_check($b);
    q("INSERT INTO suppliers(name,contact_name,phone,email,address) VALUES (?,?,?,?,?)",
      [trim($b['name']), $b['contact_name'] ?? null, $b['phone'] ?? null, $b['email'] ?? null, $b['address'] ?? null]);
    $id = (int) db()->lastInsertId();
    audit('create', 'supplier', $id, ['name' => $b['name']]);
    out(one("SELECT * FROM suppliers WHERE id=?", [$id]), 201);
}
function supplier_update(int $id): never {
    one("SELECT 1 FROM suppliers WHERE id=?", [$id]) ?? fail('Supplier tidak ada', 404);
    $b = body(); supplier_check($b);
    if (isset($b['is_active'])) $b['is_active'] = bool01($b['is_active']);
    [$set, $d] = build_update($b, ['name', 'contact_name', 'phone', 'email', 'address', 'is_active']);
    $d['id'] = $id;
    q("UPDATE suppliers SET $set WHERE id=:id", $d);
    audit('update', 'supplier', $id, $b);
    out(one("SELECT * FROM suppliers WHERE id=?", [$id]));
}
function supplier_delete(int $id): never {
    one("SELECT 1 FROM suppliers WHERE id=?", [$id]) ?? fail('Supplier tidak ada', 404);
    q("DELETE FROM suppliers WHERE id=?", [$id]); // movement.supplier_id jadi NULL
    audit('delete', 'supplier', $id);
    out(['deleted' => true]);
}
