<?php
return [
    'dsn' => getenv('KOPI_JAGO_DSN') ?: sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        getenv('KOPI_JAGO_DB_HOST') ?: '127.0.0.1',
        getenv('KOPI_JAGO_DB_PORT') ?: '3306',
        getenv('KOPI_JAGO_DB_NAME') ?: 'kopi_jago_db'
    ),
    'user' => getenv('KOPI_JAGO_DB_USER') ?: 'root',
    'pass' => getenv('KOPI_JAGO_DB_PASS') ?: '',
    'token_ttl' => 86400,
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', getenv('KOPI_JAGO_ALLOWED_ORIGINS') ?: 'http://localhost'))))
];
