<?php
final class Auth {
    public static function user(): ?array {
        $h = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
        if ($h === '' && function_exists('getallheaders')) {
            $headers = getallheaders();
            $h = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
        if (!preg_match('/Bearer\s+(.+)/i', $h, $m)) return null;
        $db=Database::connection(); $q=$db->prepare('SELECT u.*,r.name role FROM auth_tokens t JOIN users u ON u.id=t.user_id JOIN roles r ON r.id=u.role_id WHERE t.token_hash=? AND t.expires_at>NOW() AND u.is_active=1'); $q->execute([hash('sha256',$m[1])]); return $q->fetch() ?: null;
    }
    public static function require(array $roles=[]): array { $u=self::user(); if(!$u) Response::error('Authentication required',401); if($roles && !in_array($u['role'],$roles,true)) Response::error('Forbidden',403); return $u; }
}
