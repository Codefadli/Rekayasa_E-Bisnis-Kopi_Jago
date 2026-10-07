<?php
const SETTING_RULES = [
    'store_name'  => 'str', 'store_address' => 'str', 'store_phone' => 'str',
    'open_time'   => 'time', 'close_time' => 'time', 'is_open' => 'bool',
    'delivery_fee' => 'num', 'tax_percent' => 'pct', 'low_stock_threshold' => 'int',
    'reservation_slot_minutes' => 'int',
];

function setting_list(): never {
    $rows = all("SELECT k,v FROM store_settings");
    out(array_column($rows, 'v', 'k'));
}

function setting_update(): never {
    $b = pick(body(), array_keys(SETTING_RULES));
    if (!$b) fail('Tidak ada pengaturan valid', 422, ['allowed' => array_keys(SETTING_RULES)]);
    $err = []; $clean = [];
    foreach ($b as $k => $v) {
        $v = is_bool($v) ? (string)(int)$v : trim((string)$v);
        $ok = match (SETTING_RULES[$k]) {
            'str'  => $v !== '' && mb_strlen($v) <= 255,
            'time' => (bool) preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $v),
            'bool' => in_array($v, ['0', '1', 'true', 'false'], true),
            'num'  => is_numeric($v) && $v >= 0,
            'pct'  => is_numeric($v) && $v >= 0 && $v <= 100,
            'int'  => ctype_digit($v) && (int)$v >= 0,
        };
        if (!$ok) { $err[$k] = 'nilai tidak valid'; continue; }
        $clean[$k] = SETTING_RULES[$k] === 'bool' ? (string) bool01($v) : $v;
    }
    if ($err) fail('Validasi gagal', 422, $err);
    $before = array_column(all("SELECT k,v FROM store_settings WHERE k IN (" . implode(',', array_fill(0, count($clean), '?')) . ")", array_keys($clean)), 'v', 'k');
    tx(function () use ($clean) {
        foreach ($clean as $k => $v) q("INSERT INTO store_settings(k,v) VALUES (?,?) ON DUPLICATE KEY UPDATE v=VALUES(v)", [$k, $v]);
    });
    audit('update', 'settings', null, ['before' => $before, 'after' => $clean]);
    setting_list();
}
