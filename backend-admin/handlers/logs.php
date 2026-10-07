<?php
function log_list(): never {
    $w = ['1=1']; $p = [];
    if (!empty($_GET['admin_id'])) { $w[] = 'l.admin_id=?'; $p[] = (int)$_GET['admin_id']; }
    if (!empty($_GET['action']))   { $w[] = 'l.action=?';   $p[] = $_GET['action']; }
    if (!empty($_GET['entity']))   { $w[] = 'l.entity=?';   $p[] = $_GET['entity']; }
    if (!empty($_GET['from']))     { $w[] = 'DATE(l.created_at)>=?'; $p[] = $_GET['from']; }
    if (!empty($_GET['to']))       { $w[] = 'DATE(l.created_at)<=?'; $p[] = $_GET['to']; }
    if (!empty($_GET['q']))        { $w[] = '(l.detail LIKE ? OR u.name LIKE ?)'; $p[] = $p[] = '%' . $_GET['q'] . '%'; }
    $W = implode(' AND ', $w);
    [$page, $per, $off] = page_params(25);
    $total = (int) val("SELECT COUNT(*) FROM activity_logs l LEFT JOIN users u ON u.id=l.admin_id WHERE $W", $p);
    $rows = all("SELECT l.id,l.action,l.entity,l.entity_id,l.detail,l.ip,l.created_at,l.admin_id,u.name AS admin_name
                 FROM activity_logs l LEFT JOIN users u ON u.id=l.admin_id WHERE $W
                 ORDER BY l.id DESC LIMIT $per OFFSET $off", $p);
    foreach ($rows as &$r) $r['detail'] = $r['detail'] ? json_decode($r['detail'], true) : null;
    out($rows, 200, ['page' => $page, 'per_page' => $per, 'total' => $total, 'last_page' => (int) ceil($total / $per)]);
}
function log_filters(): never {
    out([
        'actions' => array_column(all("SELECT DISTINCT action FROM activity_logs ORDER BY action"), 'action'),
        'entities' => array_column(all("SELECT DISTINCT entity FROM activity_logs ORDER BY entity"), 'entity'),
        'admins' => all("SELECT id,name FROM users WHERE role_id=2 ORDER BY name"),
    ]);
}
