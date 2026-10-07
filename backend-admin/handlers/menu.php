<?php
/* ---------- kategori ---------- */
function slugify(string $s): string {
    return trim(preg_replace('/[^a-z0-9]+/', '-', strtolower($s)), '-');
}

function category_list(): never {
    out(all("SELECT c.*, (SELECT COUNT(*) FROM menu_items m WHERE m.category_id=c.id) AS item_count
             FROM menu_categories c ORDER BY c.name"));
}
function category_create(): never {
    $b = body(); need($b, ['name']);
    $slug = slugify($b['slug'] ?? $b['name']);
    if (val("SELECT 1 FROM menu_categories WHERE slug=?", [$slug])) fail('Slug sudah dipakai', 409);
    q("INSERT INTO menu_categories(name,slug) VALUES (?,?)", [trim($b['name']), $slug]);
    $id = (int) db()->lastInsertId();
    audit('create', 'category', $id, ['name' => $b['name']]);
    out(one("SELECT * FROM menu_categories WHERE id=?", [$id]), 201);
}
function category_update(int $id): never {
    $b = body();
    one("SELECT 1 FROM menu_categories WHERE id=?", [$id]) ?? fail('Kategori tidak ada', 404);
    if (isset($b['name']) && !isset($b['slug'])) $b['slug'] = slugify($b['name']);
    [$set, $d] = build_update($b, ['name', 'slug']);
    $d['id'] = $id;
    q("UPDATE menu_categories SET $set WHERE id=:id", $d);
    audit('update', 'category', $id, $b);
    out(one("SELECT * FROM menu_categories WHERE id=?", [$id]));
}
function category_delete(int $id): never {
    if (val("SELECT COUNT(*) FROM menu_items WHERE category_id=?", [$id]) > 0)
        fail('Kategori masih punya menu', 409);
    q("DELETE FROM menu_categories WHERE id=?", [$id]);
    audit('delete', 'category', $id);
    out(['deleted' => true]);
}

/* ---------- menu ---------- */
const MENU_SELECT = "SELECT m.*, c.name AS category_name, COALESCE(s.stock,0) AS stock,
    (SELECT ROUND(AVG(score),2) FROM ratings r WHERE r.menu_id=m.id) AS avg_rating
    FROM menu_items m JOIN menu_categories c ON c.id=m.category_id
    LEFT JOIN inventory_stock s ON s.menu_id=m.id";

function menu_list(): never {
    $w = ['1=1']; $p = [];
    if (!empty($_GET['q']))           { $w[] = 'm.name LIKE ?';      $p[] = '%' . $_GET['q'] . '%'; }
    if (!empty($_GET['category_id'])) { $w[] = 'm.category_id=?';    $p[] = (int)$_GET['category_id']; }
    if (isset($_GET['available']))    { $w[] = 'm.is_available=?';   $p[] = bool01($_GET['available']); }
    if (isset($_GET['featured']))     { $w[] = 'm.is_featured=?';    $p[] = bool01($_GET['featured']); }
    $W = implode(' AND ', $w);
    paged(MENU_SELECT . " WHERE $W",
          "SELECT COUNT(*) FROM menu_items m WHERE $W", $p, 'ORDER BY m.id DESC');
}
function menu_show(int $id): never {
    out(one(MENU_SELECT . " WHERE m.id=?", [$id]) ?? fail('Menu tidak ada', 404));
}
function menu_validate(array $b, bool $partial): array {
    $err = [];
    if (isset($b['price']) && (!is_numeric($b['price']) || $b['price'] < 0)) $err['price'] = 'harus angka >= 0';
    if (isset($b['category_id']) && !val("SELECT 1 FROM menu_categories WHERE id=?", [(int)$b['category_id']])) $err['category_id'] = 'tidak ditemukan';
    if (isset($b['name']) && trim($b['name']) === '') $err['name'] = 'tidak boleh kosong';
    if ($err) fail('Validasi gagal', 422, $err);
    foreach (['is_available', 'is_featured'] as $f) if (isset($b[$f])) $b[$f] = bool01($b[$f]);
    return $b;
}
function menu_create(): never {
    $b = body(); need($b, ['category_id', 'name', 'price']);
    $b = menu_validate($b, false);
    $id = tx(function () use ($b) {
        q("INSERT INTO menu_items(category_id,name,description,price,is_available,is_featured) VALUES (?,?,?,?,?,?)", [
            (int)$b['category_id'], trim($b['name']), $b['description'] ?? null, $b['price'],
            $b['is_available'] ?? 1, $b['is_featured'] ?? 0,
        ]);
        $id = (int) db()->lastInsertId();
        q("INSERT INTO inventory_stock(menu_id,stock) VALUES (?,0)", [$id]);
        if (!empty($b['stock'])) move_stock($id, 'in', (int)$b['stock'], null, 'stok awal', admin()['id']);
        return $id;
    });
    audit('create', 'menu', $id, ['name' => $b['name'], 'price' => $b['price']]);
    out(one(MENU_SELECT . " WHERE m.id=?", [$id]), 201);
}
function menu_update(int $id): never {
    $old = one("SELECT * FROM menu_items WHERE id=?", [$id]) ?? fail('Menu tidak ada', 404);
    $b = menu_validate(body(), true);
    [$set, $d] = build_update($b, ['category_id', 'name', 'description', 'price', 'is_available', 'is_featured']);
    $d['id'] = $id;
    q("UPDATE menu_items SET $set WHERE id=:id", $d);
    audit('update', 'menu', $id, ['before' => pick($old, array_keys($d)), 'after' => $d]);
    out(one(MENU_SELECT . " WHERE m.id=?", [$id]));
}
function menu_delete(int $id): never {
    one("SELECT 1 FROM menu_items WHERE id=?", [$id]) ?? fail('Menu tidak ada', 404);
    if (val("SELECT COUNT(*) FROM order_items WHERE menu_id=?", [$id]) > 0) {
        q("UPDATE menu_items SET is_available=0 WHERE id=?", [$id]);
        audit('disable', 'menu', $id, ['reason' => 'sudah ada di pesanan']);
        out(['deleted' => false, 'disabled' => true, 'note' => 'Menu ada di riwayat pesanan, dinonaktifkan saja']);
    }
    q("DELETE FROM menu_items WHERE id=?", [$id]);
    audit('delete', 'menu', $id);
    out(['deleted' => true]);
}
