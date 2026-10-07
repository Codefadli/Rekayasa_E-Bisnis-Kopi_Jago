<?php
function stock_list(): never {
    $th = (int) setting('low_stock_threshold', 10);
    $w = ['1=1']; $p = [];
    if (!empty($_GET['q'])) { $w[] = 'm.name LIKE ?'; $p[] = '%' . $_GET['q'] . '%'; }
    if (!empty($_GET['low'])) { $w[] = 'COALESCE(s.stock,0) <= ?'; $p[] = $th; }
    $W = implode(' AND ', $w);
    [$page, $per, $off] = page_params();
    $total = (int) val("SELECT COUNT(*) FROM menu_items m LEFT JOIN inventory_stock s ON s.menu_id=m.id WHERE $W", $p);
    $rows = all("SELECT m.id AS menu_id, m.name, c.name AS category_name, COALESCE(s.stock,0) AS stock,
                 s.updated_at, (COALESCE(s.stock,0) <= $th) AS is_low
                 FROM menu_items m JOIN menu_categories c ON c.id=m.category_id
                 LEFT JOIN inventory_stock s ON s.menu_id=m.id WHERE $W
                 ORDER BY stock ASC, m.name LIMIT $per OFFSET $off", $p);
    out($rows, 200, ['page' => $page, 'per_page' => $per, 'total' => $total, 'low_threshold' => $th]);
}

function stock_move(int $menuId): never {
    $b = body(); need($b, ['type', 'qty']);
    in_enum($b['type'], ['in', 'out', 'adjust'], 'type');
    if (!is_numeric($b['qty']) || (int)$b['qty'] < 0 || ($b['type'] !== 'adjust' && (int)$b['qty'] === 0))
        fail('Validasi gagal', 422, ['qty' => 'harus bilangan bulat positif']);
    one("SELECT 1 FROM menu_items WHERE id=?", [$menuId]) ?? fail('Menu tidak ada', 404);
    $sup = isset($b['supplier_id']) ? (int)$b['supplier_id'] : null;
    if ($sup && !val("SELECT 1 FROM suppliers WHERE id=?", [$sup])) fail('Supplier tidak ada', 422);

    $new = tx(fn() => move_stock($menuId, $b['type'], (int)$b['qty'], $sup, $b['note'] ?? null, admin()['id']));
    audit('stock_' . $b['type'], 'stock', $menuId, ['qty' => (int)$b['qty'], 'after' => $new]);
    out(['menu_id' => $menuId, 'stock' => $new]);
}

function stock_movements(): never {
    $w = ['1=1']; $p = [];
    if (!empty($_GET['menu_id']))     { $w[] = 'sm.menu_id=?';     $p[] = (int)$_GET['menu_id']; }
    if (!empty($_GET['supplier_id'])) { $w[] = 'sm.supplier_id=?'; $p[] = (int)$_GET['supplier_id']; }
    if (!empty($_GET['type']))        { $w[] = 'sm.type=?';        $p[] = $_GET['type']; }
    $W = implode(' AND ', $w);
    paged("SELECT sm.*, m.name AS menu_name, s.name AS supplier_name, u.name AS admin_name
           FROM stock_movements sm JOIN menu_items m ON m.id=sm.menu_id
           LEFT JOIN suppliers s ON s.id=sm.supplier_id LEFT JOIN users u ON u.id=sm.admin_id WHERE $W",
          "SELECT COUNT(*) FROM stock_movements sm WHERE $W", $p, 'ORDER BY sm.id DESC');
}
