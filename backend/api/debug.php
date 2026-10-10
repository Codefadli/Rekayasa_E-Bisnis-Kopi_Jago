<?php
// Echo actual REQUEST_URI from backend/api/index.php
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "REQUEST_URI: " . $_SERVER['REQUEST_URI'] . "\n";
echo "SCRIPT_NAME: " . $_SERVER['SCRIPT_NAME'] . "\n";
echo "PHP_SELF: " . $_SERVER['PHP_SELF'] . "\n";

$requestPath = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
echo "requestPath (trimmed): [$requestPath]\n";

$path = preg_replace('#^.*?/backend/api/#','',$requestPath);
echo "After backend/api regex: [$path]\n";

$path = preg_replace('#^index\.php/?#','',$path);
echo "After index.php regex: [$path]\n";

$path = preg_replace('#\.php$#','',$path);
echo "Final path: [$path]\n";

$body = json_decode(file_get_contents('php://input'), true) ?: [];
echo "Body keys: " . implode(', ', array_keys($body)) . "\n";
echo "_path value: " . ($body['_path'] ?? 'NOT SET') . "\n";

if ($path === '' && isset($body['_path'])) {
    $path = $body['_path'];
    echo "USING _path: [$path]\n";
} else {
    echo "NOT using _path (path='$path', isset=" . (isset($body['_path']) ? 'yes' : 'no') . ")\n";
}

echo "\nFINAL PATH: [$path]\n";
