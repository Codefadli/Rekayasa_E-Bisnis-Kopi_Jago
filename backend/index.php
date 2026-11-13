<?php
// backend/index.php
// Simplified router: all requests go to index.php, then we extract path from actual URL

// Get the actual path from REQUEST_URI
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
$path = $uri; // Use the full path, not just the part after /backend/api/

// Set up environment
$_SERVER['SCRIPT_NAME'] = '/backend/api/index.php';
$_SERVER['SCRIPT_FILENAME'] = __DIR__ . '/backend/api/index.php';
chdir(__DIR__ . '/backend/api');
require __DIR__ . '/backend/api/index.php';
return true;
?>