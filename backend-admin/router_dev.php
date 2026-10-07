<?php
// php -S 127.0.0.1:8000 router_dev.php
$p = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (strpos($p, '/api') !== 0) {
    if ($p === '/' ) { header('Location: /admin/index.html'); exit; }
    if (is_file(__DIR__ . $p)) return false; // static admin UI
}
$_SERVER['SCRIPT_NAME'] = '/index.php';
require __DIR__ . '/index.php';
