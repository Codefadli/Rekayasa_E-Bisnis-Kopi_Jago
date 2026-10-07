<?php
function chat_conversations(): never {
    $w = ['1=1']; $p = [];
    if (!empty($_GET['q'])) { $w[] = 'u.name LIKE ?'; $p[] = '%' . $_GET['q'] . '%'; }
    $W = implode(' AND ', $w);
    paged("SELECT u.id AS user_id, u.name AS customer_name, lm.message AS last_message,
                  lm.sender_role AS last_sender, lm.created_at AS last_at,
                  (lm.sender_role='customer') AS needs_reply
           FROM users u
           JOIN support_messages lm ON lm.id=(SELECT MAX(id) FROM support_messages WHERE user_id=u.id)
           WHERE $W",
          "SELECT COUNT(DISTINCT u.id) FROM users u JOIN support_messages sm ON sm.user_id=u.id WHERE $W", $p,
          'ORDER BY needs_reply DESC, lm.id DESC');
}
function chat_thread(int $userId): never {
    $u = one("SELECT id,name,email,phone FROM users WHERE id=?", [$userId]) ?? fail('Pelanggan tidak ada', 404);
    $after = (int)($_GET['after_id'] ?? 0); // untuk polling pesan baru
    $msgs = all("SELECT id,sender_role,message,created_at FROM support_messages
                 WHERE user_id=? AND id>? ORDER BY id ASC LIMIT 200", [$userId, $after]);
    out(['customer' => $u, 'messages' => $msgs]);
}
function chat_reply(int $userId): never {
    $b = body(); need($b, ['message']);
    $msg = trim($b['message']);
    if (mb_strlen($msg) > 2000) fail('Pesan terlalu panjang', 422, ['message' => 'maks 2000 karakter']);
    one("SELECT 1 FROM users WHERE id=? AND role_id=1", [$userId]) ?? fail('Pelanggan tidak ada', 404);
    q("INSERT INTO support_messages(user_id,sender_role,message) VALUES (?,'admin',?)", [$userId, $msg]);
    $id = (int) db()->lastInsertId();
    notify($userId, 'Balasan dari Kopi Jago', mb_strimwidth($msg, 0, 120, '...'));
    audit('reply', 'chat', $userId, ['message_id' => $id]);
    out(one("SELECT id,sender_role,message,created_at FROM support_messages WHERE id=?", [$id]), 201);
}
