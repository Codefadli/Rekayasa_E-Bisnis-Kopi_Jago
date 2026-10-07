<?php
function promo_list(): never {
    $w = ['1=1']; $p = [];
    if (!empty($_GET['q'])) { $w[] = '(code LIKE ? OR name LIKE ?)'; $p[] = $p[] = '%' . $_GET['q'] . '%'; }
    if (!empty($_GET['status'])) {
        $w[] = match ($_GET['status']) {
            'running'  => 'is_active=1 AND CURDATE() BETWEEN start_date AND end_date',
            'upcoming' => 'is_active=1 AND start_date>CURDATE()',
            'expired'  => 'end_date<CURDATE()',
            'inactive' => 'is_active=0',
            default    => '1=1',
        };
    }
    $W = implode(' AND ', $w);
    paged("SELECT * FROM promos WHERE $W", "SELECT COUNT(*) FROM promos WHERE $W", $p, 'ORDER BY id DESC');
}
function promo_show(int $id): never { out(one("SELECT * FROM promos WHERE id=?", [$id]) ?? fail('Promo tidak ada', 404)); }

function promo_check(array $b, ?array $old = null): array {
    $m = array_merge($old ?? [], $b);
    $e = [];
    if (isset($b['discount_type'])) in_enum($b['discount_type'], ['percentage', 'fixed'], 'discount_type');
    if (isset($m['discount_value'])) {
        if (!is_numeric($m['discount_value']) || $m['discount_value'] <= 0) $e['discount_value'] = 'harus > 0';
        elseif (($m['discount_type'] ?? '') === 'percentage' && $m['discount_value'] > 100) $e['discount_value'] = 'maks 100 untuk persen';
    }
    foreach (['start_date', 'end_date'] as $f) {
        if (isset($b[$f]) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $b[$f])) $e[$f] = 'format YYYY-MM-DD';
    }
    if (empty($e) && isset($m['start_date'], $m['end_date']) && $m['end_date'] < $m['start_date']) $e['end_date'] = 'sebelum start_date';
    if (isset($b['code'])) {
        $b['code'] = strtoupper(trim($b['code']));
        if (!preg_match('/^[A-Z0-9_-]{3,30}$/', $b['code'])) $e['code'] = '3-30 karakter A-Z 0-9 _ -';
    }
    if ($e) fail('Validasi gagal', 422, $e);
    if (isset($b['is_active'])) $b['is_active'] = bool01($b['is_active']);
    return $b;
}
function promo_create(): never {
    $b = body(); need($b, ['code', 'name', 'discount_type', 'discount_value', 'start_date', 'end_date']);
    $b = promo_check($b);
    if (val("SELECT 1 FROM promos WHERE code=?", [$b['code']])) fail('Kode sudah dipakai', 409);
    q("INSERT INTO promos(code,name,discount_type,discount_value,min_purchase,start_date,end_date,usage_limit,is_active)
       VALUES (?,?,?,?,?,?,?,?,?)", [
        $b['code'], $b['name'], $b['discount_type'], $b['discount_value'], $b['min_purchase'] ?? 0,
        $b['start_date'], $b['end_date'], $b['usage_limit'] ?? null, $b['is_active'] ?? 1,
    ]);
    $id = (int) db()->lastInsertId();
    audit('create', 'promo', $id, ['code' => $b['code']]);
    out(one("SELECT * FROM promos WHERE id=?", [$id]), 201);
}
function promo_update(int $id): never {
    $old = one("SELECT * FROM promos WHERE id=?", [$id]) ?? fail('Promo tidak ada', 404);
    $b = promo_check(body(), $old);
    if (isset($b['code']) && val("SELECT 1 FROM promos WHERE code=? AND id<>?", [$b['code'], $id])) fail('Kode sudah dipakai', 409);
    [$set, $d] = build_update($b, ['code', 'name', 'discount_type', 'discount_value', 'min_purchase', 'start_date', 'end_date', 'usage_limit', 'is_active']);
    $d['id'] = $id;
    q("UPDATE promos SET $set WHERE id=:id", $d);
    audit('update', 'promo', $id, $b);
    out(one("SELECT * FROM promos WHERE id=?", [$id]));
}
function promo_delete(int $id): never {
    one("SELECT 1 FROM promos WHERE id=?", [$id]) ?? fail('Promo tidak ada', 404);
    q("DELETE FROM promos WHERE id=?", [$id]);
    audit('delete', 'promo', $id);
    out(['deleted' => true]);
}
