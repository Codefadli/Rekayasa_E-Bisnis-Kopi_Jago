<?php
return [
    'dsn' => getenv('KOPI_JAGO_DSN') ?: 'mysql:host=127.0.0.1;dbname=kopi_jago_db;charset=utf8mb4',
    'user' => getenv('KOPI_JAGO_DB_USER') ?: 'root',
    'pass' => getenv('KOPI_JAGO_DB_PASS') ?: '',
    'token_ttl' => 86400,
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', getenv('KOPI_JAGO_ALLOWED_ORIGINS') ?: 'http://localhost'))))
];
