<?php
require __DIR__.'/../core/Database.php';
require __DIR__.'/../core/Response.php';
require __DIR__.'/../core/Auth.php';

$config = require __DIR__.'/../config/config.php';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$isLocalDevelopmentOrigin = $origin !== '' && preg_match('#^https?://(?:localhost|127\.0\.0\.1)(?::\d+)?$#i', $origin) === 1;
if ($origin !== '' && (in_array($origin, $config['allowed_origins'], true) || $isLocalDevelopmentOrigin)) {
    header('Access-Control-Allow-Origin: '.$origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$requestPath = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$path = preg_replace('#^.*?/backend/api/#','',$requestPath);
$path = preg_replace('#^index\.php/?#','',$path);
$path = preg_replace('#\.php$#','',$path);
$body = json_decode(file_get_contents('php://input'), true) ?: [];

if (in_array($path, ['auth/login','auth/register','auth/logout','auth/forgot-password','auth/reset-password'], true) && $method !== 'POST') {
    Response::error('Method tidak diizinkan.', 405);
}

function input_string(array $body, string $key, string $default = ''): string {
    return trim((string)($body[$key] ?? $default));
}
function notify(PDO $db, int $userId, string $title, string $message): void {
    $q = $db->prepare('INSERT INTO notifications(user_id,title,message) VALUES(?,?,?)');
    $q->execute([$userId, $title, $message]);
}
function order_for(PDO $db, int $id, array $user): ?array {
    $sql = 'SELECT o.*,u.name customer,u.email customer_email,a.recipient_name,a.phone address_phone,a.address_line,a.city,a.province,a.postal_code
            FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN addresses a ON a.id=o.address_id WHERE o.id=?';
    if ($user['role'] === 'customer') $sql .= ' AND o.user_id=?';
    if ($user['role'] === 'seller') $sql .= ' AND o.vehicle_id IN (SELECT id FROM vehicles WHERE seller_id=?)';
    $q = $db->prepare($sql); $q->execute($user['role'] === 'customer' || $user['role'] === 'seller' ? [$id,$user['id']] : [$id]);
    $row = $q->fetch();
    if (!$row) return null;
    $q = $db->prepare('SELECT oi.*,m.name FROM order_items oi JOIN menu_items m ON m.id=oi.menu_id WHERE oi.order_id=?');
    $q->execute([$id]); $row['items'] = $q->fetchAll();
    return $row;
}
function require_order(PDO $db, int $id, array $user): array {
    $order = order_for($db, $id, $user);
    if (!$order) Response::error('Order tidak ditemukan', 404);
    return $order;
}

try {
    $db = Database::connection();
    if ($path === 'auth/register' && $method === 'POST') {
        $name=input_string($body,'name'); $email=strtolower(input_string($body,'email')); $password=(string)($body['password']??'');
        if ($name==='' || !filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($password)<8) Response::error('Nama, email valid, dan password minimal 8 karakter wajib diisi',422);
        $birthDate=input_string($body,'birth_date');
        $parsedBirthDate=DateTimeImmutable::createFromFormat('!Y-m-d',$birthDate);
        $dateErrors=DateTimeImmutable::getLastErrors();
        $validBirthDate=$parsedBirthDate && ($dateErrors===false || ($dateErrors['warning_count']===0 && $dateErrors['error_count']===0)) && $parsedBirthDate->format('Y-m-d')===$birthDate;
        if (!$validBirthDate) Response::error('Tanggal lahir wajib valid dengan format YYYY-MM-DD',422);
        $q=$db->prepare('INSERT INTO users(role_id,name,email,phone,birth_date,password_hash) VALUES(1,?,?,?,?,?)');
        $q->execute([$name,$email,$body['phone']??null,$birthDate,password_hash($password,PASSWORD_DEFAULT)]);
        Response::json(['id'=>$db->lastInsertId()],201);
    }
    if ($path === 'auth/login' && $method === 'POST') {
        $q=$db->prepare('SELECT u.*,r.name role FROM users u JOIN roles r ON r.id=u.role_id WHERE u.email=? AND u.is_active=1');
        $q->execute([strtolower(input_string($body,'email'))]); $u=$q->fetch();
        if (!$u || !password_verify((string)($body['password']??''),$u['password_hash'])) Response::error('Email atau password salah',401);
        $token=bin2hex(random_bytes(32)); $c=$config;
        $s=$db->prepare('INSERT INTO auth_tokens(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(NOW(),INTERVAL ? SECOND))');
        $s->execute([$u['id'],hash('sha256',$token),$c['token_ttl']]); unset($u['password_hash']);
        Response::json([
            'token'=>$token,
            'role'=>$u['role'],
            'user'=>[
                'id'=>(int)$u['id'],
                'name'=>$u['name'],
                'email'=>$u['email'],
                'phone'=>$u['phone']
            ]
        ],200,'Login berhasil.');
    }
    if ($path === 'auth/logout' && $method === 'POST') {
        Auth::require(); preg_match('/Bearer\s+(.+)/i',$_SERVER['HTTP_AUTHORIZATION']??'',$m);
        $db->prepare('DELETE FROM auth_tokens WHERE token_hash=?')->execute([hash('sha256',$m[1]??'')]);
        Response::json(['message'=>'Logged out']);
    }
    if ($path === 'auth/forgot-password' && $method === 'POST') {
        $email=strtolower(input_string($body,'email')); $q=$db->prepare('SELECT id FROM users WHERE email=? AND is_active=1'); $q->execute([$email]); $u=$q->fetch();
        $response=['message'=>'Jika email terdaftar, token reset telah dibuat'];
        if ($u) {
            $raw=bin2hex(random_bytes(32)); $db->prepare('INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES(?,?,DATE_ADD(NOW(),INTERVAL 30 MINUTE))')->execute([$u['id'],hash('sha256',$raw)]);
            $response['reset_token']=$raw; // Email delivery is intentionally not faked.
        }
        Response::json($response);
    }
    if ($path === 'auth/reset-password' && $method === 'POST') {
        $token=input_string($body,'token'); $password=(string)($body['password']??'');
        if (strlen($password)<8 || $token==='') Response::error('Token dan password minimal 8 karakter wajib diisi',422);
        $q=$db->prepare('SELECT * FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>NOW()'); $q->execute([hash('sha256',$token)]); $r=$q->fetch();
        if (!$r) Response::error('Token reset tidak valid atau kedaluwarsa',422);
        $db->beginTransaction(); $db->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([password_hash($password,PASSWORD_DEFAULT),$r['user_id']]);
        $db->prepare('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=?')->execute([$r['id']]); $db->prepare('DELETE FROM auth_tokens WHERE user_id=?')->execute([$r['user_id']]); $db->commit();
        Response::json(['message'=>'Password berhasil direset']);
    }
    if ($path === 'users/profile' && in_array($method,['GET','PUT'],true)) {
        $u=Auth::require(); if ($method==='PUT') { $name=input_string($body,'name',$u['name']); if (!$name) Response::error('Nama wajib diisi',422); $db->prepare('UPDATE users SET name=?,phone=? WHERE id=?')->execute([$name,input_string($body,'phone',(string)($u['phone']??''))?:null,$u['id']]); $u['name']=$name; }
        unset($u['password_hash']); Response::json($u);
    }
    if ($path === 'users/change-password' && $method === 'POST') {
        $u=Auth::require(); $new=(string)($body['new_password']??'');
        if (strlen($new)<8 || !password_verify((string)($body['current_password']??''),$u['password_hash'])) Response::error('Password lama salah atau password baru terlalu pendek',422);
        $db->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([password_hash($new,PASSWORD_DEFAULT),$u['id']]); $db->prepare('DELETE FROM auth_tokens WHERE user_id=?')->execute([$u['id']]); Response::json(['message'=>'Password changed; please login again']);
    }
    if ($path === 'menu' && $method === 'GET') {
        $q=$db->query('SELECT m.*,c.name category,COALESCE(i.stock,0) stock FROM menu_items m JOIN menu_categories c ON c.id=m.category_id LEFT JOIN inventory_stock i ON i.menu_id=m.id WHERE m.is_available=1 ORDER BY m.is_featured DESC,m.name'); Response::json($q->fetchAll());
    }
    if ($path === 'cart' && in_array($method,['GET','POST','DELETE'],true)) {
        $u=Auth::require(['customer']); if($method==='POST'){ $id=(int)($body['menu_id']??0);$qty=filter_var($body['qty']??1,FILTER_VALIDATE_INT);if($id<1||$qty===false||$qty<1||$qty>99)Response::error('Menu dan jumlah tidak valid',422);$m=$db->prepare('SELECT id FROM menu_items WHERE id=? AND is_available=1');$m->execute([$id]);if(!$m->fetch())Response::error('Menu tidak tersedia',422);$db->prepare('INSERT INTO cart_items(user_id,menu_id,qty) VALUES(?,?,?) ON DUPLICATE KEY UPDATE qty=VALUES(qty)')->execute([$u['id'],$id,$qty]); } elseif($method==='DELETE')$db->prepare('DELETE FROM cart_items WHERE user_id=? AND menu_id=?')->execute([$u['id'],(int)($body['menu_id']??$_GET['menu_id']??0)]);$q=$db->prepare('SELECT c.menu_id,c.qty,m.name,m.price,c.qty*m.price subtotal FROM cart_items c JOIN menu_items m ON m.id=c.menu_id WHERE c.user_id=? AND m.is_available=1');$q->execute([$u['id']]);Response::json($q->fetchAll());
    }
    if ($path === 'wishlist' && in_array($method,['GET','POST','DELETE'],true)) {
        $u=Auth::require(['customer']);$id=(int)($body['menu_id']??$_GET['menu_id']??0);if($method==='POST'){$m=$db->prepare('SELECT id FROM menu_items WHERE id=? AND is_available=1');$m->execute([$id]);if(!$m->fetch())Response::error('Menu tidak tersedia',422);$db->prepare('INSERT IGNORE INTO wishlist(user_id,menu_id) VALUES(?,?)')->execute([$u['id'],$id]);}if($method==='DELETE')$db->prepare('DELETE FROM wishlist WHERE user_id=? AND menu_id=?')->execute([$u['id'],$id]);$q=$db->prepare('SELECT w.menu_id,m.name,m.price FROM wishlist w JOIN menu_items m ON m.id=w.menu_id WHERE w.user_id=?');$q->execute([$u['id']]);Response::json($q->fetchAll());
    }
    if ($path === 'addresses' && in_array($method,['GET','POST'],true)) { $u=Auth::require(['customer']);if($method==='POST'){$recipient=input_string($body,'recipient_name',$u['name']);$phone=input_string($body,'phone',(string)($u['phone']??''));$line=input_string($body,'address_line');$city=input_string($body,'city');$province=input_string($body,'province');if(!$recipient||!$phone||!$line||!$city||!$province)Response::error('Data alamat belum lengkap',422);$db->prepare('INSERT INTO addresses(user_id,label,recipient_name,phone,address_line,city,province,postal_code,is_default) VALUES(?,?,?,?,?,?,?,?,?)')->execute([$u['id'],input_string($body,'label')?:null,$recipient,$phone,$line,$city,$province,input_string($body,'postal_code')?:null,(int)($body['is_default']??0)]);} $q=$db->prepare('SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC,id');$q->execute([$u['id']]);Response::json($q->fetchAll()); }
    if ($path === 'orders' && $method === 'POST') {
        $u=Auth::require(['customer']); $db->beginTransaction(); $q=$db->prepare('SELECT c.menu_id,c.qty,m.price,COALESCE(i.stock,0) stock FROM cart_items c JOIN menu_items m ON m.id=c.menu_id LEFT JOIN inventory_stock i ON i.menu_id=m.id WHERE c.user_id=? AND m.is_available=1 FOR UPDATE'); $q->execute([$u['id']]); $items=$q->fetchAll();
        if (!$items) { $db->rollBack(); Response::error('Cart kosong'); } foreach($items as $x) if ((int)$x['stock'] < (int)$x['qty']) { $db->rollBack(); Response::error('Stok menu tidak mencukupi',422); }
        $sub=array_sum(array_map(fn($i)=>(float)$i['qty']*(float)$i['price'],$items)); $discount=0; $payment=$body['payment_method']??'cash'; $fulfillment=$body['fulfillment_type']??'delivery';
        if (!in_array($payment,['cash','qris','bank_transfer','ewallet'],true) || !in_array($fulfillment,['pickup','delivery'],true)) { $db->rollBack(); Response::error('Pilihan checkout tidak valid',422); }
        $address=$body['address_id']??null; if ($fulfillment==='delivery' && !$address) { $db->rollBack(); Response::error('Alamat wajib untuk delivery',422); } if ($fulfillment==='pickup') $address=null;
        if ($address) { $a=$db->prepare('SELECT id FROM addresses WHERE id=? AND user_id=?'); $a->execute([(int)$address,$u['id']]); if (!$a->fetch()) { $db->rollBack(); Response::error('Alamat tidak valid',422); } }
        if (!empty($body['promo_code'])) { $p=$db->prepare('SELECT * FROM promos WHERE code=? AND is_active=1 AND CURDATE() BETWEEN start_date AND end_date AND min_purchase<=?'); $p->execute([strtoupper(trim($body['promo_code'])),$sub]); if($r=$p->fetch()) $discount=$r['discount_type']==='percentage'?round($sub*$r['discount_value']/100,2):min($sub,$r['discount_value']); }
        $num='INV-'.date('YmdHis').'-'.bin2hex(random_bytes(3)); $o=$db->prepare('INSERT INTO orders(order_number,user_id,status,fulfillment_type,subtotal,discount_amount,total_amount,payment_method,payment_status,address_id,notes) VALUES(?,?,?, ?,?,?,?, ?,?,?,?)'); $o->execute([$num,$u['id'],'pending',$fulfillment,$sub,$discount,max(0,$sub-$discount),$payment,'pending',$address,$body['notes']??null]); $id=$db->lastInsertId();
        foreach($items as $x){$db->prepare('INSERT INTO order_items(order_id,menu_id,qty,price) VALUES(?,?,?,?)')->execute([$id,$x['menu_id'],$x['qty'],$x['price']]);$db->prepare('UPDATE inventory_stock SET stock=stock-? WHERE menu_id=? AND stock>=?')->execute([$x['qty'],$x['menu_id'],$x['qty']]);} notify($db,$u['id'],'Order dibuat','Order '.$num.' berhasil dibuat dan menunggu konfirmasi.'); $db->prepare('DELETE FROM cart_items WHERE user_id=?')->execute([$u['id']]); $db->commit(); Response::json(['id'=>$id,'order_number'=>$num,'total_amount'=>max(0,$sub-$discount),'payment_status'=>'pending'],201);
    }
    if ($path === 'orders' && $method === 'GET') { $u=Auth::require(); $sql=$u['role']==='customer'?'SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC':($u['role']==='seller'?'SELECT o.*,u.name customer FROM orders o JOIN users u ON u.id=o.user_id JOIN vehicles v ON v.id=o.vehicle_id WHERE v.seller_id=? ORDER BY o.created_at DESC':'SELECT o.*,u.name customer FROM orders o JOIN users u ON u.id=o.user_id ORDER BY o.created_at DESC'); $q=$db->prepare($sql);$q->execute($u['role']==='admin'?[]:[$u['id']]);Response::json($q->fetchAll()); }
    if (preg_match('#^orders/(\d+)$#',$path,$m) && $method==='GET') { $u=Auth::require(); Response::json(require_order($db,(int)$m[1],$u)); }
    if (preg_match('#^orders/(\d+)/cancel$#',$path,$m) && $method==='PATCH') { $u=Auth::require(['customer','admin']); $o=require_order($db,(int)$m[1],$u); if(!in_array($o['status'],['pending','confirmed'],true)) Response::error('Order tidak dapat dibatalkan',422); $db->beginTransaction();$db->prepare("UPDATE orders SET status='cancelled' WHERE id=?")->execute([$m[1]]);$items=$db->prepare('SELECT menu_id,qty FROM order_items WHERE order_id=?');$items->execute([$m[1]]);foreach($items as $item)$db->prepare('UPDATE inventory_stock SET stock=stock+? WHERE menu_id=?')->execute([$item['qty'],$item['menu_id']]);$db->commit(); notify($db,(int)$o['user_id'],'Order dibatalkan','Order '.$o['order_number'].' telah dibatalkan.'); Response::json(['message'=>'Order cancelled']); }
    if (preg_match('#^orders/(\d+)/assign$#',$path,$m) && $method==='PATCH') { $u=Auth::require(['admin']); $vid=(int)($body['vehicle_id']??0); $q=$db->prepare("UPDATE orders o JOIN vehicles v ON v.id=? JOIN users s ON s.id=v.seller_id JOIN roles r ON r.id=s.role_id SET o.vehicle_id=? WHERE o.id=? AND v.is_available=1 AND r.name='seller' AND o.status='pending'");$q->execute([$vid,$vid,$m[1]]);if(!$q->rowCount())Response::error('Order atau kendaraan tidak valid',422);$db->prepare('INSERT INTO order_assignment_audit(order_id,vehicle_id,admin_id,action) VALUES(?,?,?,?)')->execute([$m[1],$vid,$u['id'],'assigned']);$o=$db->prepare('SELECT user_id,order_number FROM orders WHERE id=?');$o->execute([$m[1]]);if($assigned=$o->fetch())notify($db,(int)$assigned['user_id'],'Seller ditugaskan','Seller telah ditugaskan untuk order '.$assigned['order_number'].'.');Response::json(['message'=>'Seller assigned']); }
    if (preg_match('#^orders/(\d+)/status$#',$path,$m) && $method==='PATCH') { $u=Auth::require(['admin','seller']); $o=require_order($db,(int)$m[1],$u); $allowed=['pending'=>['confirmed','cancelled'],'confirmed'=>['processing','cancelled'],'processing'=>['ready','cancelled'],'ready'=>['on_delivery','completed'],'on_delivery'=>['completed'],'completed'=>[],'cancelled'=>[]];$new=$body['status']??'';if(!in_array($new,$allowed[$o['status']],true))Response::error('Transisi status tidak valid',422);$db->prepare('UPDATE orders SET status=? WHERE id=?')->execute([$new,$m[1]]);notify($db,(int)$o['user_id'],'Status order diperbarui','Order '.$o['order_number'].' sekarang '.$new.'.');Response::json(['message'=>'Status updated']); }
    if (preg_match('#^seller/orders/(\d+)/action$#',$path,$m) && $method==='POST') { $u=Auth::require(['seller']); $actions=['accepted'=>'confirmed','preparing'=>'processing','ready'=>'ready','on_the_way'=>'on_delivery','delivered'=>'completed','failed'=>'cancelled'];$action=$body['action']??'';if(!isset($actions[$action]))Response::error('Aksi seller tidak valid',422);$o=require_order($db,(int)$m[1],$u);$new=$actions[$action];$allowed=['pending'=>['confirmed'],'confirmed'=>['processing'],'processing'=>['ready'],'ready'=>['on_delivery','completed'],'on_delivery'=>['completed'],'completed'=>[],'cancelled'=>[]];if(!in_array($new,$allowed[$o['status']],true))Response::error('Aksi tidak sesuai status order',422);$db->prepare('UPDATE orders SET status=? WHERE id=?')->execute([$new,$m[1]]);notify($db,(int)$o['user_id'],'Status order diperbarui','Order '.$o['order_number'].' sekarang '.$new.'.');Response::json(['message'=>'Seller action accepted','status'=>$new]); }
    if ($path === 'notifications' && in_array($method,['GET','PATCH'],true)) { $u=Auth::require(); if($method==='PATCH')$db->prepare('UPDATE notifications SET read_at=NOW() WHERE id=? AND user_id=?')->execute([(int)($body['id']??0),$u['id']]);$q=$db->prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC');$q->execute([$u['id']]);Response::json($q->fetchAll()); }
    if ($path === 'support' && in_array($method,['GET','POST'],true)) { $u=Auth::require(['customer','admin']); if($method==='POST'){ $msg=input_string($body,'message');if(!$msg)Response::error('Pesan wajib diisi',422);$db->prepare('INSERT INTO support_messages(user_id,sender_role,message) VALUES(?,?,?)')->execute([$u['id'],$u['role'],$msg]); }$q=$db->prepare('SELECT * FROM support_messages WHERE user_id=? ORDER BY created_at');$q->execute([$u['id']]);Response::json($q->fetchAll()); }
    if ($path === 'ratings/eligibility' && $method==='GET') { $u=Auth::require(['customer']);$q=$db->prepare("SELECT oi.menu_id,m.name,o.id order_id FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN menu_items m ON m.id=oi.menu_id LEFT JOIN ratings r ON r.order_id=o.id AND r.menu_id=oi.menu_id WHERE o.user_id=? AND o.status='completed' AND r.id IS NULL");$q->execute([$u['id']]);Response::json($q->fetchAll()); }
    if ($path === 'ratings' && $method==='POST') { $u=Auth::require(['customer']);$order=(int)($body['order_id']??0);$menu=(int)($body['menu_id']??0);$score=(int)($body['score']??0);if($score<1||$score>5)Response::error('Rating harus 1-5',422);$q=$db->prepare("SELECT 1 FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.order_id=? AND i.menu_id=? AND o.user_id=? AND o.status='completed'");$q->execute([$order,$menu,$u['id']]);if(!$q->fetch())Response::error('Rating hanya untuk menu yang selesai dibeli',403);$db->prepare('INSERT INTO ratings(order_id,menu_id,user_id,score,review) VALUES(?,?,?,?,?)')->execute([$order,$menu,$u['id'],$score,input_string($body,'review')?:null]);Response::json(['message'=>'Rating tersimpan'],201); }
    if ($path === 'menu/rating' && $method==='POST') { $u=Auth::require(['customer']);$order=(int)($body['order_id']??0);$menu=(int)($body['menu_id']??0);$score=(int)($body['score']??0);if($score<1||$score>5)Response::error('Rating harus 1-5',422);$q=$db->prepare("SELECT 1 FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.order_id=? AND i.menu_id=? AND o.user_id=? AND o.status='completed'");$q->execute([$order,$menu,$u['id']]);if(!$q->fetch())Response::error('Rating hanya untuk menu yang selesai dibeli',403);$db->prepare('INSERT INTO ratings(order_id,menu_id,user_id,score,review) VALUES(?,?,?,?,?)')->execute([$order,$menu,$u['id'],$score,input_string($body,'review')?:null]);Response::json(['message'=>'Rating tersimpan'],201); }
    if (preg_match('#^admin/orders/(\d+)/payment$#',$path,$m) && $method==='PATCH') { Auth::require(['admin']);$status=$body['payment_status']??'';if(!in_array($status,['pending','paid','failed','refunded'],true))Response::error('Status pembayaran tidak valid',422);$q=$db->prepare('UPDATE orders SET payment_status=? WHERE id=?');$q->execute([$status,$m[1]]);if(!$q->rowCount())Response::error('Order tidak ditemukan',404);$o=$db->prepare('SELECT user_id,order_number FROM orders WHERE id=?');$o->execute([$m[1]]);if($row=$o->fetch())notify($db,(int)$row['user_id'],'Status pembayaran diperbarui','Pembayaran order '.$row['order_number'].' berstatus '.$status.'.');Response::json(['message'=>'Payment status updated']); }
    if ($path === 'seller/profile' && in_array($method,['GET','PUT'],true)) { $u=Auth::require(['seller']);if($method==='PUT'){$current=$db->prepare('SELECT * FROM seller_profiles WHERE user_id=?');$current->execute([$u['id']]);$profile=$current->fetch();$type=$body['vehicle_type']??$profile['vehicle_type'];$status=$body['status']??$profile['status'];if(!in_array($type,['sepeda','sepeda_listrik'],true)||!in_array($status,['offline','available','busy','inactive'],true))Response::error('Profil seller tidak valid',422);$db->prepare('UPDATE seller_profiles SET area=?,status=?,vehicle_type=?,last_latitude=?,last_longitude=? WHERE user_id=?')->execute([$body['area']??$profile['area'],$status,$type,$body['latitude']??$profile['last_latitude'],$body['longitude']??$profile['last_longitude'],$u['id']]);}$q=$db->prepare('SELECT u.name,u.email,u.phone,p.* FROM users u JOIN seller_profiles p ON p.user_id=u.id WHERE u.id=?');$q->execute([$u['id']]);Response::json($q->fetch()); }
    if ($path === 'seller/orders' && $method==='GET') { $u=Auth::require(['seller']);$q=$db->prepare('SELECT o.*,u.name customer FROM orders o JOIN users u ON u.id=o.user_id JOIN vehicles v ON v.id=o.vehicle_id WHERE v.seller_id=? ORDER BY o.created_at DESC');$q->execute([$u['id']]);Response::json($q->fetchAll()); }
    if ($path === 'seller/location' && $method==='PUT') { $u=Auth::require(['seller']);$db->prepare('UPDATE seller_profiles SET last_latitude=?,last_longitude=? WHERE user_id=?')->execute([$body['latitude']??null,$body['longitude']??null,$u['id']]);Response::json(['message'=>'Location updated']); }
    if ($path === 'admin/sellers' && in_array($method,['GET','POST','PATCH'],true)) { Auth::require(['admin']);if($method==='GET'){$q=$db->query("SELECT u.id,u.name,u.email,u.phone,u.is_active,p.* FROM users u JOIN seller_profiles p ON p.user_id=u.id WHERE u.role_id=3");Response::json($q->fetchAll());}if($method==='POST'){$name=input_string($body,'name');$email=strtolower(input_string($body,'email'));$type=$body['vehicle_type']??'sepeda';if(!$name||!filter_var($email,FILTER_VALIDATE_EMAIL)||!in_array($type,['sepeda','sepeda_listrik'],true))Response::error('Data seller tidak valid',422);$q=$db->prepare('INSERT INTO users(role_id,name,email,phone,password_hash) VALUES(3,?,?,?,?)');$q->execute([$name,$email,$body['phone']??null,password_hash((string)($body['password']??bin2hex(random_bytes(8))),PASSWORD_DEFAULT)]);$id=(int)$db->lastInsertId();$db->prepare('INSERT INTO seller_profiles(user_id,area,status,vehicle_type) VALUES(?,?,?,?)')->execute([$id,$body['area']??null,'offline',$type]);$db->prepare('INSERT INTO vehicles(seller_id,type,plate,is_available) VALUES(?,?,?,0)')->execute([$id,$type,$body['plate']??null]);Response::json(['id'=>$id],201);} $id=(int)($body['id']??0);$type=$body['vehicle_type']??'sepeda';$status=$body['status']??'offline';if($id<1||!in_array($type,['sepeda','sepeda_listrik'],true)||!in_array($status,['offline','available','busy','inactive'],true))Response::error('Data seller tidak valid',422);$db->prepare('UPDATE users SET name=?,email=?,phone=?,is_active=? WHERE id=? AND role_id=3')->execute([$body['name'],$body['email'],$body['phone']??null,(int)($body['is_active']??1),$id]);$db->prepare('UPDATE seller_profiles SET area=?,status=?,vehicle_type=? WHERE user_id=?')->execute([$body['area']??null,$status,$type,$id]);Response::json(['message'=>'Seller updated']); }
    if ($path === 'admin/menu' && in_array($method,['GET','POST','PATCH'],true)) { Auth::require(['admin']);if($method==='GET'){ $q=$db->query('SELECT m.*,COALESCE(i.stock,0) stock FROM menu_items m LEFT JOIN inventory_stock i ON i.menu_id=m.id ORDER BY m.id DESC');Response::json($q->fetchAll()); }$id=(int)($body['id']??0);if($method==='POST'){$db->prepare('INSERT INTO menu_items(category_id,name,description,price,is_available,is_featured) VALUES(?,?,?,?,?,?)')->execute([(int)$body['category_id'],input_string($body,'name'),$body['description']??null,(float)$body['price'],(int)($body['is_available']??1),(int)($body['is_featured']??0)]);$id=$db->lastInsertId();$db->prepare('INSERT INTO inventory_stock(menu_id,stock) VALUES(?,?)')->execute([$id,max(0,(int)($body['stock']??0))]);Response::json(['id'=>$id],201);} $db->prepare('UPDATE menu_items SET category_id=?,name=?,description=?,price=?,is_available=?,is_featured=? WHERE id=?')->execute([(int)$body['category_id'],input_string($body,'name'),$body['description']??null,(float)$body['price'],(int)($body['is_available']??1),(int)($body['is_featured']??0),$id]);if(isset($body['stock']))$db->prepare('INSERT INTO inventory_stock(menu_id,stock) VALUES(?,?) ON DUPLICATE KEY UPDATE stock=VALUES(stock)')->execute([$id,max(0,(int)$body['stock'])]);Response::json(['message'=>'Menu updated']); }
    Response::error('Endpoint not found',404);
} catch (PDOException $e) {
    if ($e->getCode()==='23000') Response::error('Data sudah ada atau tidak valid',422);
    error_log($e->getMessage());
    Response::error('Database tidak dapat dihubungi.',503);
} catch (Throwable $e) {
    error_log($e->getMessage());
    Response::error('Terjadi kesalahan server.',500);
}
