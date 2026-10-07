<?php
declare(strict_types=1);
require __DIR__ . '/core.php';
foreach (glob(__DIR__ . '/handlers/*.php') as $f) require $f;

header('Access-Control-Allow-Origin: ' . cfg('cors_origin'));
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

set_exception_handler(function (Throwable $e) {
    error_log($e);
    fail(cfg('debug') ? $e->getMessage() : 'Kesalahan server', 500);
});

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = '/' . trim(preg_replace('#^.*?/api(?=/|$)#', '', $path), '/');
$method = $_SERVER['REQUEST_METHOD'];

// [method, pattern, handler, butuh_auth]
$routes = [
    ['POST',   '/auth/login',  'auth_login', false],
    ['GET',    '/auth/me',     'auth_me'],
    ['POST',   '/auth/logout', 'auth_logout'],

    ['GET',    '/dashboard',   'dashboard_stats'],

    ['GET',    '/categories',        'category_list'],
    ['POST',   '/categories',        'category_create'],
    ['PUT',    '/categories/{id}',   'category_update'],
    ['DELETE', '/categories/{id}',   'category_delete'],

    ['GET',    '/menu',        'menu_list'],
    ['POST',   '/menu',        'menu_create'],
    ['GET',    '/menu/{id}',   'menu_show'],
    ['PUT',    '/menu/{id}',   'menu_update'],
    ['PATCH',  '/menu/{id}',   'menu_update'],
    ['DELETE', '/menu/{id}',   'menu_delete'],

    ['GET',    '/stock',                'stock_list'],
    ['GET',    '/stock/movements',      'stock_movements'],
    ['POST',   '/stock/{id}/movement',  'stock_move'],

    ['GET',    '/suppliers',       'supplier_list'],
    ['POST',   '/suppliers',       'supplier_create'],
    ['GET',    '/suppliers/{id}',  'supplier_show'],
    ['PUT',    '/suppliers/{id}',  'supplier_update'],
    ['DELETE', '/suppliers/{id}',  'supplier_delete'],

    ['GET',    '/promos',       'promo_list'],
    ['POST',   '/promos',       'promo_create'],
    ['GET',    '/promos/{id}',  'promo_show'],
    ['PUT',    '/promos/{id}',  'promo_update'],
    ['DELETE', '/promos/{id}',  'promo_delete'],

    ['GET',    '/orders',                'order_list'],
    ['GET',    '/orders/{id}',           'order_show'],
    ['PATCH',  '/orders/{id}/status',    'order_set_status'],
    ['PATCH',  '/orders/{id}/payment',   'order_set_payment'],
    ['POST',   '/orders/{id}/assign',    'order_assign'],
    ['POST',   '/orders/{id}/unassign',  'order_unassign'],
    ['GET',    '/vehicles/available',    'vehicle_available'],

    ['GET',    '/customers',                'customer_list'],
    ['GET',    '/customers/{id}',           'customer_show'],
    ['PATCH',  '/customers/{id}/active',    'customer_set_active'],

    ['GET',    '/reservations',                  'reservation_list'],
    ['GET',    '/reservations/{id}',             'reservation_show'],
    ['POST',   '/reservations/{id}/confirm',     'reservation_confirm'],
    ['POST',   '/reservations/{id}/reject',      'reservation_reject'],
    ['POST',   '/reservations/{id}/complete',    'reservation_complete'],

    ['GET',    '/chat',                'chat_conversations'],
    ['GET',    '/chat/{id}',           'chat_thread'],
    ['POST',   '/chat/{id}/reply',     'chat_reply'],

    ['GET',    '/reports/overview',    'report_overview'],
    ['GET',    '/reports/export',      'report_export_csv'],

    ['GET',    '/logs',                'log_list'],
    ['GET',    '/logs/filters',        'log_filters'],

    ['GET',    '/settings',            'setting_list'],
    ['PUT',    '/settings',            'setting_update'],
];

$pathExists = false;
foreach ($routes as $r) {
    [$m, $pat, $fn] = $r;
    $auth = $r[3] ?? true;
    $re = '#^' . str_replace('{id}', '(\d+)', $pat) . '$#';
    if (!preg_match($re, $path, $mt)) continue;
    $pathExists = true;
    if ($m !== $method) continue;
    if ($auth) admin();
    array_shift($mt);
    $fn(...array_map('intval', $mt));
}
$pathExists ? fail('Method tidak didukung', 405) : fail('Endpoint tidak ditemukan', 404);
