<?php
/**
 * PHP Built-in Server Router for Kopi Jago
 * Routes API requests to backend/api/index.php
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// Route /backend/api/* to backend/api/index.php
if (strpos($uri, '/backend/api/') === 0) {
    // Set proper script name for backend routing
    $_SERVER['SCRIPT_NAME'] = '/backend/api/index.php';
    $_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/backend/api/index.php';
    chdir(__DIR__ . '/backend/api');
    require __DIR__ . '/backend/api/index.php';
    return true;
}

// Serve static files
if ($uri !== '/' && file_exists(__DIR__ . $uri)) {
    return false;
}

// Serve index.html for root
if ($uri === '/') {
    return false;
}

return false;
