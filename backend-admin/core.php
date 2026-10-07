<?php
declare(strict_types=1);

function cfg(?string $key = null) {
    static $c;
    $c ??= require __DIR__ . '/config.php';
    return $key === null ? $c : ($c[$key] ?? null);
}

function db(): PDO {
    static $pdo;
    if ($pdo) return $pdo;
    $d = cfg('db');
    $pdo = new PDO(
        "mysql:host={$d['host']};port={$d['port']};dbname={$d['name']};charset=utf8mb4",
        $d['user'], $d['pass'],
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
    return $pdo;
}

function q(string $sql, array $p = []): PDOStatement {
    $st = db()->prepare($sql);
    $st->execute($p);
    return $st;
}
function one(string $sql, array $p = []): ?array { return q($sql, $p)->fetch() ?: null; }
function all(string $sql, array $p = []): array  { return q($sql, $p)->fetchAll(); }
function val(string $sql, array $p = [])        { $r = q($sql, $p)->fetch(PDO::FETCH_NUM); return $r ? $r[0] : null; }

function out($data = null, int $code = 200, array $meta = []): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    $res = ['ok' => true, 'data' => $data];
    if ($meta) $res['meta'] = $meta;
    echo json_encode($res, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}

function fail(string $msg, int $code = 400, array $errors = []): never {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    $res = ['ok' => false, 'error' => $msg];
    if ($errors) $res['errors'] = $errors;
    echo json_encode($res, JSON_UNESCAPED_UNICODE);
    exit;
}

function body(): array {
    static $b;
    if ($b !== null) return $b;
    $raw = file_get_contents('php://input');
    $j = $raw ? json_decode($raw, true) : null;
    return $b = is_array($j) ? $j : ($_POST ?: []);
}

function need(array $b, array $fields): void {
    $miss = [];
    foreach ($fields as $f) {
        if (!isset($b[$f]) || (is_string($b[$f]) && trim($b[$f]) === '')) $miss[$f] = 'wajib diisi';
    }
    if ($miss) fail('Validasi gagal', 422, $miss);
}

function pick(array $b, array $allowed): array {
    return array_intersect_key($b, array_flip($allowed));
}

function bool01($v): int { return filter_var($v, FILTER_VALIDATE_BOOLEAN) ? 1 : 0; }

function in_enum($v, array $list, string $field): string {
    if (!in_array($v, $list, true)) fail('Validasi gagal', 422, [$field => 'harus salah satu: ' . implode(',', $list)]);
    return $v;
}

function build_update(array $data, array $allowed): array {
    $data = pick($data, $allowed);
    if (!$data) fail('Tidak ada field yang diubah', 422);
    $set = implode(',', array_map(fn($k) => "`$k`=:$k", array_keys($data)));
    return [$set, $data];
}

function page_params(int $defPer = 20): array {
    $page = max(1, (int)($_GET['page'] ?? 1));
    $per  = min(100, max(1, (int)($_GET['per_page'] ?? $defPer)));
    return [$page, $per, ($page - 1) * $per];
}

function paged(string $selectSql, string $countSql, array $params, string $order): never {
    [$page, $per, $off] = page_params();
    $total = (int) val($countSql, $params);
    $rows  = all("$selectSql $order LIMIT $per OFFSET $off", $params);
    out($rows, 200, ['page' => $page, 'per_page' => $per, 'total' => $total, 'last_page' => (int) ceil($total / $per)]);
}

/* ---------- auth ---------- */

function bearer(): ?string {
    $h = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$h && function_exists('getallheaders')) {
        foreach (getallheaders() as $k => $v) if (strtolower($k) === 'authorization') $h = $v;
    }
    return preg_match('/^Bearer\s+(\S+)$/i', $h, $m) ? $m[1] : null;
}

function admin(): array {
    static $u;
    if ($u) return $u;
    $t = bearer() ?? fail('Token tidak ada', 401);
    $u = one(
        "SELECT u.id,u.name,u.email,u.role_id FROM auth_tokens a JOIN users u ON u.id=a.user_id
         WHERE a.token_hash=? AND a.expires_at>NOW() AND u.is_active=1",
        [hash('sha256', $t)]
    ) ?? fail('Token tidak valid atau kedaluwarsa', 401);
    if ((int)$u['role_id'] !== 2) fail('Akses khusus admin', 403);
    return $u;
}

function audit(string $action, string $entity, ?int $entityId = null, array $detail = []): void {
    $adm = null;
    try { $adm = admin()['id']; } catch (Throwable $e) {}
    q("INSERT INTO activity_logs(admin_id,action,entity,entity_id,detail,ip) VALUES (?,?,?,?,?,?)", [
        $adm, $action, $entity, $entityId,
        $detail ? json_encode($detail, JSON_UNESCAPED_UNICODE) : null,
        $_SERVER['REMOTE_ADDR'] ?? null,
    ]);
}

function notify(int $userId, string $title, string $msg): void {
    q("INSERT INTO notifications(user_id,title,message) VALUES (?,?,?)", [$userId, $title, $msg]);
}

function setting(string $k, $default = null) {
    $v = val("SELECT v FROM store_settings WHERE k=?", [$k]);
    return $v ?? $default;
}

function tx(callable $fn) {
    $pdo = db();
    $pdo->beginTransaction();
    try { $r = $fn(); $pdo->commit(); return $r; }
    catch (Throwable $e) { if ($pdo->inTransaction()) $pdo->rollBack(); throw $e; }
}

/** Ubah stok + catat movement. Panggil di dalam tx(). */
function move_stock(int $menuId, string $type, int $qty, ?int $supplierId, ?string $note, ?int $adminId): int {
    $cur = val("SELECT stock FROM inventory_stock WHERE menu_id=? FOR UPDATE", [$menuId]);
    if ($cur === null) {
        q("INSERT INTO inventory_stock(menu_id,stock) VALUES (?,0)", [$menuId]);
        $cur = 0;
    }
    $cur = (int)$cur;
    $new = match ($type) {
        'in', 'order_cancel' => $cur + $qty,
        'out', 'order'       => $cur - $qty,
        'adjust'             => $qty,
    };
    if ($new < 0) fail('Stok tidak cukup', 422, ['qty' => "stok sekarang $cur"]);
    q("UPDATE inventory_stock SET stock=? WHERE menu_id=?", [$new, $menuId]);
    $delta = $type === 'adjust' ? $new - $cur : ($new - $cur);
    q("INSERT INTO stock_movements(menu_id,supplier_id,type,qty,stock_after,note,admin_id) VALUES (?,?,?,?,?,?,?)",
      [$menuId, $supplierId, $type, $delta, $new, $note, $adminId]);
    return $new;
}
