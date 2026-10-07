<?php
function auth_login(): never {
    $b = body(); need($b, ['email', 'password']);
    $u = one("SELECT * FROM users WHERE email=? AND is_active=1", [trim($b['email'])]);
    if (!$u || !password_verify($b['password'], $u['password_hash'])) fail('Email atau password salah', 401);
    if ((int)$u['role_id'] !== 2) fail('Akses khusus admin', 403);

    $raw = bin2hex(random_bytes(32));
    $ttl = (int) cfg('token_ttl_hours');
    q("INSERT INTO auth_tokens(user_id,token_hash,expires_at) VALUES (?,?,DATE_ADD(NOW(),INTERVAL $ttl HOUR))",
      [$u['id'], hash('sha256', $raw)]);
    q("DELETE FROM auth_tokens WHERE expires_at<NOW()");
    $GLOBALS['__admin'] = $u;
    q("INSERT INTO activity_logs(admin_id,action,entity,entity_id,ip) VALUES (?,?,?,?,?)",
      [$u['id'], 'login', 'auth', $u['id'], $_SERVER['REMOTE_ADDR'] ?? null]);
    out(['token' => $raw, 'expires_in' => $ttl * 3600,
         'user' => ['id' => $u['id'], 'name' => $u['name'], 'email' => $u['email']]]);
}

function auth_me(): never { out(admin()); }

function auth_logout(): never {
    admin();
    q("DELETE FROM auth_tokens WHERE token_hash=?", [hash('sha256', bearer())]);
    audit('logout', 'auth', admin()['id']);
    out(['logged_out' => true]);
}
