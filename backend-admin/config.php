<?php
declare(strict_types=1);

return [
    'db' => [
        'host' => getenv('DB_HOST') ?: '127.0.0.1',
        'port' => getenv('DB_PORT') ?: '3306',
        'name' => getenv('DB_NAME') ?: 'kopi_jago_db',
        'user' => getenv('DB_USER') ?: 'root',
        'pass' => getenv('DB_PASS') ?: '',
    ],
    'token_ttl_hours' => 12,
    'cors_origin'     => getenv('CORS_ORIGIN') ?: '*',
    'debug'           => (bool) getenv('APP_DEBUG'),
];
