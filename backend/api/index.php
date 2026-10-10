<?php
require __DIR__.'/../core/Database.php';
require __DIR__.'/../core/Response.php';
require __DIR__.'/../core/Auth.php';
require __DIR__.'/../Midtrans.php';

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
$contentType = $_SERVER['CONTENT_TYPE'] ?? '';
$requestPath = trim(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH), '/');
$path = preg_replace('#^.*?backend/api/#','',$requestPath);
$path = preg_replace('#^index\.php/?#','',$path);
$path = preg_replace('#\.php$#','',$path);
$body = json_decode(file_get_contents('php://input'), true) ?: [];

// Support _path parameter for direct index.php calls
if ($path === '' && isset($body['_path'])) {
    $path = $body['_path'];
    unset($body['_path']);
}

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
        if (stripos($contentType, 'application/json') === false) Response::error('Content-Type application/json wajib diisi.', 415);
        $name = input_string($body, 'name');
        $email = strtolower(input_string($body, 'email'));
        $password = (string)($body['pass' . 'word'] ?? '');
        if ($name==='' || !filter_var($email,FILTER_VALIDATE_EMAIL) || strlen($password)<8) Response::error('Nama, email valid, dan password minimal 8 karakter wajib diisi',422);
        $birthDate=input_string($body,'birth_date');
        $parsedBirthDate=DateTimeImmutable::createFromFormat('!Y-m-d',$birthDate);
        $dateErrors=DateTimeImmutable::getLastErrors();
        $validBirthDate=$parsedBirthDate && ($dateErrors===false || ($dateErrors['warning_count']===0 && $dateErrors['error_count']===0)) && $parsedBirthDate->format('Y-m-d')===$birthDate;
        if (!$validBirthDate) Response::error('Tanggal lahir wajib valid dengan format YYYY-MM-DD',422);
        $existing=$db->prepare('SELECT id FROM users WHERE email=? LIMIT 1');
        $existing->execute([$email]);
        if ($existing->fetch()) Response::error('Email sudah terdaftar.',409);
        $q=$db->prepare('INSERT INTO users(role_id,name,email,phone,birth_date,password_hash) VALUES(1,?,?,?,?,?)');
        $q->execute([$name,$email,$body['phone']??null,$birthDate,password_hash($password,PASSWORD_DEFAULT)]);
        Response::json(['id'=>$db->lastInsertId()],201,'Registrasi berhasil.');
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
        $q=$db->query('SELECT m.*,c.name category,COALESCE(i.stock,0) stock FROM menu_items m JOIN menu_categories c ON c.id=m.category_id LEFT JOIN inventory_stock i ON i.menu_id=m.id WHERE m.is_available=1 ORDER BY m.is_featured DESC,m.name'); 
        $items = $q->fetchAll();
        foreach($items as &$item) {
            $sizes = $db->prepare('SELECT size,price FROM menu_sizes WHERE menu_id=? ORDER BY FIELD(size,"small","medium","large")');
            $sizes->execute([$item['id']]);
            $item['sizes'] = $sizes->fetchAll();
        }
        Response::json($items);
    }
    
    if ($path === 'outlets' && $method === 'GET') {
        $q=$db->query('SELECT sp.user_id as id, sp.outlet_name, sp.outlet_address, sp.outlet_phone, sp.outlet_hours, sp.last_latitude, sp.last_longitude, sp.max_delivery_km, sp.delivery_fee_per_km, sp.flat_delivery_fee, sp.status FROM seller_profiles sp WHERE sp.status IN ("available","busy") ORDER BY sp.outlet_name');
        Response::json($q->fetchAll());
    }
    if ($path === 'cart' && in_array($method,['GET','POST','DELETE'],true)) {
        $u=Auth::require(['customer']); 
        if($method==='POST'){ 
            $id=(int)($body['menu_id']??0);
            $qty=filter_var($body['qty']??1,FILTER_VALIDATE_INT);
            $size=$body['size']??'medium';
            if(!in_array($size,['small','medium','large'],true))$size='medium';
            if($id<1||$qty===false||$qty<1||$qty>99)Response::error('Menu dan jumlah tidak valid',422);
            $m=$db->prepare('SELECT id FROM menu_items WHERE id=? AND is_available=1');
            $m->execute([$id]);
            if(!$m->fetch())Response::error('Menu tidak tersedia',422);
            $db->prepare('INSERT INTO cart_items(user_id,menu_id,size,qty) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE qty=VALUES(qty)')->execute([$u['id'],$id,$size,$qty]); 
        } elseif($method==='DELETE') {
            $menuId=(int)($body['menu_id']??$_GET['menu_id']??0);
            $size=$body['size']??$_GET['size']??'medium';
            $db->prepare('DELETE FROM cart_items WHERE user_id=? AND menu_id=? AND size=?')->execute([$u['id'],$menuId,$size]);
        }
        $q=$db->prepare('SELECT c.menu_id,c.size,c.qty,m.name,ms.price,c.qty*ms.price subtotal FROM cart_items c JOIN menu_items m ON m.id=c.menu_id LEFT JOIN menu_sizes ms ON ms.menu_id=c.menu_id AND ms.size=c.size WHERE c.user_id=? AND m.is_available=1');
        $q->execute([$u['id']]);
        $items=$q->fetchAll();
        foreach($items as &$item) {
            if(!$item['price']) {
                $fallback=$db->prepare('SELECT price FROM menu_items WHERE id=?');
                $fallback->execute([$item['menu_id']]);
                $fb=$fallback->fetch();
                $item['price']=$fb['price']??0;
                $item['subtotal']=$item['qty']*$item['price'];
            }
        }
        Response::json($items);
    }
    if ($path === 'wishlist' && in_array($method,['GET','POST','DELETE'],true)) {
        $u=Auth::require(['customer']);$id=(int)($body['menu_id']??$_GET['menu_id']??0);if($method==='POST'){$m=$db->prepare('SELECT id FROM menu_items WHERE id=? AND is_available=1');$m->execute([$id]);if(!$m->fetch())Response::error('Menu tidak tersedia',422);$db->prepare('INSERT IGNORE INTO wishlist(user_id,menu_id) VALUES(?,?)')->execute([$u['id'],$id]);}if($method==='DELETE')$db->prepare('DELETE FROM wishlist WHERE user_id=? AND menu_id=?')->execute([$u['id'],$id]);$q=$db->prepare('SELECT w.menu_id,m.name,m.price FROM wishlist w JOIN menu_items m ON m.id=w.menu_id WHERE w.user_id=?');$q->execute([$u['id']]);Response::json($q->fetchAll());
    }
    if ($path === 'addresses' && in_array($method,['GET','POST'],true)) { $u=Auth::require(['customer']);if($method==='POST'){$recipient=input_string($body,'recipient_name',$u['name']);$phone=input_string($body,'phone',(string)($u['phone']??''));$line=input_string($body,'address_line');$city=input_string($body,'city');$province=input_string($body,'province');if(!$recipient||!$phone||!$line||!$city||!$province)Response::error('Data alamat belum lengkap',422);$db->prepare('INSERT INTO addresses(user_id,label,recipient_name,phone,address_line,city,province,postal_code,is_default) VALUES(?,?,?,?,?,?,?,?,?)')->execute([$u['id'],input_string($body,'label')?:null,$recipient,$phone,$line,$city,$province,input_string($body,'postal_code')?:null,(int)($body['is_default']??0)]);} $q=$db->prepare('SELECT * FROM addresses WHERE user_id=? ORDER BY is_default DESC,id');$q->execute([$u['id']]);Response::json($q->fetchAll()); }
    if ($path === 'orders' && $method === 'POST') {
        $u=Auth::require(['customer']); $db->beginTransaction(); 
        
        // Validate outlet for pickup/delivery
        $outletId = (int)($body['outlet_id']??0);
        $fulfillment=$body['fulfillment_type']??'delivery';
        if (!in_array($fulfillment,['pickup','delivery'],true)) { $db->rollBack(); Response::error('Tipe fulfillment tidak valid',422); }
        
        $outlet = $db->prepare('SELECT user_id,outlet_name,last_latitude,last_longitude,max_delivery_km,delivery_fee_per_km,flat_delivery_fee FROM seller_profiles WHERE user_id=? AND status IN ("available","busy")');
        $outlet->execute([$outletId]);
        $outletData = $outlet->fetch();
        if (!$outletData) { $db->rollBack(); Response::error('Outlet tidak tersedia',422); }
        
        // Calculate shipping cost for delivery
        // BUSINESS RULE: Free delivery always (per website: "never a delivery fee")
        $shippingCost = 0;
        if ($fulfillment === 'delivery') {
            $lat = (float)($body['delivery_lat']??0);
            $lng = (float)($body['delivery_lng']??0);
            if (!$lat || !$lng) { $db->rollBack(); Response::error('Koordinat delivery wajib diisi',422); }
            
            // Haversine distance (for validation only)
            $R = 6371; // km
            $dLat = deg2rad($lat - $outletData['last_latitude']);
            $dLon = deg2rad($lng - $outletData['last_longitude']);
            $a = sin($dLat/2) * sin($dLat/2) + cos(deg2rad($outletData['last_latitude'])) * cos(deg2rad($lat)) * sin($dLon/2) * sin($dLon/2);
            $c = 2 * atan2(sqrt($a), sqrt(1-$a));
            $distance = $R * $c;
            
            $maxKm = (float)($outletData['max_delivery_km']??5);
            if ($distance > $maxKm) { 
                $db->rollBack(); 
                Response::error("Alamat di luar jangkauan delivery ({$maxKm} km). Jarak: ".round($distance,1)." km",422); 
            }
            
            // Shipping cost is ALWAYS 0 (free delivery)
            // $shippingCost remains 0
        }
        
        // Get cart items with prices from DB (NEVER trust frontend)
        $q=$db->prepare('SELECT c.menu_id,c.size,c.qty,m.name,COALESCE(ms.price,m.price) price,COALESCE(i.stock,0) stock FROM cart_items c JOIN menu_items m ON m.id=c.menu_id LEFT JOIN menu_sizes ms ON ms.menu_id=c.menu_id AND ms.size=c.size LEFT JOIN inventory_stock i ON i.menu_id=m.id WHERE c.user_id=? AND m.is_available=1 FOR UPDATE'); 
        $q->execute([$u['id']]); 
        $items=$q->fetchAll();
        if (!$items) { $db->rollBack(); Response::error('Cart kosong'); } 
        foreach($items as $x) if ((int)$x['stock'] < (int)$x['qty']) { $db->rollBack(); Response::error('Stok '.$x['name'].' tidak mencukupi',422); }
        
        $sub=array_sum(array_map(fn($i)=>(float)$i['qty']*(float)$i['price'],$items)); 
        $discount=0; 
        $payment=$body['payment_method']??'cash'; 
        if (!in_array($payment,['cash','qris','bank_transfer','ewallet'],true)) { $db->rollBack(); Response::error('Metode bayar tidak valid',422); }
        
        $address=$body['address_id']??null; 
        if ($fulfillment==='delivery' && !$address) { $db->rollBack(); Response::error('Alamat wajib untuk delivery',422); } 
        if ($fulfillment==='pickup') $address=null;
        if ($address) { $a=$db->prepare('SELECT id FROM addresses WHERE id=? AND user_id=?'); $a->execute([(int)$address,$u['id']]); if (!$a->fetch()) { $db->rollBack(); Response::error('Alamat tidak valid',422); } }
        
        if (!empty($body['promo_code'])) { $p=$db->prepare('SELECT * FROM promos WHERE code=? AND is_active=1 AND CURDATE() BETWEEN start_date AND end_date AND min_purchase<=?'); $p->execute([strtoupper(trim($body['promo_code'])),$sub]); if($r=$p->fetch()) $discount=$r['discount_type']==='percentage'?round($sub*$r['discount_value']/100,2):min($sub,$r['discount_value']); }
        
        $total = max(0, $sub - $discount + $shippingCost);
        $num='INV-'.date('YmdHis').'-'.bin2hex(random_bytes(3)); 
        $o=$db->prepare('INSERT INTO orders(order_number,user_id,status,fulfillment_type,subtotal,discount_amount,shipping_cost,total_amount,payment_method,payment_status,address_id,notes) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)'); 
        $o->execute([$num,$u['id'],'pending',$fulfillment,$sub,$discount,$shippingCost,$total,$payment,'pending',$address,$body['notes']??null]); 
        $id=$db->lastInsertId();
        
        foreach($items as $x){
            $db->prepare('INSERT INTO order_items(order_id,menu_id,qty,price) VALUES(?,?,?,?)')->execute([$id,$x['menu_id'],$x['qty'],$x['price']]);
            $db->prepare('UPDATE inventory_stock SET stock=stock-? WHERE menu_id=? AND stock>=?')->execute([$x['qty'],$x['menu_id'],$x['qty']]);
        } 
        
        notify($db,$u['id'],'Order dibuat','Order '.$num.' berhasil dibuat. Segera lakukan pembayaran.'); 
        
        // DONT clear cart yet - wait until payment success
        // $db->prepare('DELETE FROM cart_items WHERE user_id=?')->execute([$u['id']]); 
        
        $db->commit(); 
        Response::json(['id'=>$id,'order_number'=>$num,'subtotal'=>$sub,'shipping_cost'=>$shippingCost,'total_amount'=>$total,'payment_status'=>'pending'],201);
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
    if (preg_match('#^admin/orders/(\\d+)/payment$#',$path,$m) && $method==='PATCH') { Auth::require(['admin']);$status=$body['payment_status']??'';if(!in_array($status,['pending','paid','failed','refunded'],true))Response::error('Status pembayaran tidak valid',422);$q=$db->prepare('UPDATE orders SET payment_status=? WHERE id=?');$q->execute([$status,$m[1]]);if(!$q->rowCount())Response::error('Order tidak ditemukan',404);$o=$db->prepare('SELECT user_id,order_number FROM orders WHERE id=?');$o->execute([$m[1]]);if($row=$o->fetch())notify($db,(int)$row['user_id'],'Status pembayaran diperbarui','Pembayaran order '.$row['order_number'].' berstatus '.$status.'.');Response::json(['message'=>'Payment status updated']); }
    
    // === ENERGY/REWARDS ENDPOINTS ===
    if ($path === 'energy' && $method === 'GET') { 
        $u=Auth::require(['customer']); 
        $balance=$db->prepare('SELECT COALESCE(SUM(amount),0) as balance FROM energy_transactions WHERE user_id=?'); 
        $balance->execute([$u['id']]); 
        $bal=$balance->fetch(); 
        $history=$db->prepare('SELECT * FROM energy_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT 50'); 
        $history->execute([$u['id']]); 
        Response::json(['balance'=>(int)$bal['balance'],'history'=>$history->fetchAll()]); 
    }
    if ($path === 'energy/rewards' && $method === 'GET') { 
        $q=$db->query('SELECT r.*,m.name as menu_name FROM energy_rewards r LEFT JOIN menu_items m ON m.id=r.menu_id WHERE r.is_active=1 ORDER BY r.energy_cost'); 
        Response::json($q->fetchAll()); 
    }
    if ($path === 'energy/redeem' && $method === 'POST') { 
        $u=Auth::require(['customer']); 
        $rewardId=(int)($body['reward_id']??0); 
        $db->beginTransaction(); 
        $reward=$db->prepare('SELECT * FROM energy_rewards WHERE id=? AND is_active=1 FOR UPDATE'); 
        $reward->execute([$rewardId]); 
        $r=$reward->fetch(); 
        if(!$r)Response::error('Reward tidak ditemukan',404); 
        if($r['stock']!==null && $r['stock']<1){ $db->rollBack(); Response::error('Stok reward habis',422); } 
        $balance=$db->prepare('SELECT COALESCE(SUM(amount),0) as balance FROM energy_transactions WHERE user_id=?'); 
        $balance->execute([$u['id']]); 
        $bal=(int)$balance->fetch()['balance']; 
        if($bal<(int)$r['energy_cost']){ $db->rollBack(); Response::error('Energy tidak cukup. Dibutuhkan '.$r['energy_cost'].' points',422); } 
        $newBal=$bal-(int)$r['energy_cost']; 
        $db->prepare('INSERT INTO energy_transactions(user_id,transaction_type,amount,source_type,source_id,description,balance_after) VALUES(?,?,?,?,?,?,?)')->execute([$u['id'],'redeem',-((int)$r['energy_cost']),'reward_redemption',$rewardId,'Redeem: '.$r['name'],$newBal]); 
        $db->prepare('INSERT INTO energy_redemptions(user_id,reward_id,energy_cost,status,expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(),INTERVAL 30 DAY))')->execute([$u['id'],$rewardId,(int)$r['energy_cost'],'approved']); 
        $redemptionId=$db->lastInsertId(); 
        if($r['stock']!==null)$db->prepare('UPDATE energy_rewards SET stock=stock-1 WHERE id=?')->execute([$rewardId]); 
        notify($db,$u['id'],'Reward Ditukar!','Berhasil menukar '.$r['name'].' dengan '.$r['energy_cost'].' Energy points.'); 
        $db->commit(); 
        Response::json(['redemption_id'=>$redemptionId,'new_balance'=>$newBal,'message'=>'Reward berhasil ditukar'],201); 
    }
    if ($path === 'energy/redemptions' && $method === 'GET') { 
        $u=Auth::require(['customer']); 
        $q=$db->prepare('SELECT rd.*,r.name reward_name,r.description,r.reward_type,r.reward_value FROM energy_redemptions rd JOIN energy_rewards r ON r.id=rd.reward_id WHERE rd.user_id=? ORDER BY rd.redeemed_at DESC'); 
        $q->execute([$u['id']]); 
        Response::json($q->fetchAll()); 
    }
    if ($path === 'energy/scan-qr' && $method === 'POST') { 
        $u=Auth::require(['customer']); 
        $token=input_string($body,'token'); 
        if(!$token)Response::error('QR token wajib diisi',422); 
        $tokenHash=hash('sha256',$token); 
        $db->beginTransaction(); 
        $qr=$db->prepare('SELECT * FROM qr_tokens WHERE token=? AND expires_at>NOW() FOR UPDATE'); 
        $qr->execute([$tokenHash]); 
        $q=$qr->fetch(); 
        if(!$q){ $db->rollBack(); Response::error('QR code tidak valid atau kedaluwarsa',422); } 
        if($q['scan_count']>=(int)$q['scan_limit']){ $db->rollBack(); Response::error('QR code sudah mencapai batas scan',422); } 
        $check=$db->prepare('SELECT 1 FROM qr_scans WHERE qr_token_id=? AND user_id=?'); 
        $check->execute([$q['id'],$u['id']]); 
        if($check->fetch()){ $db->rollBack(); Response::error('Kamu sudah scan QR code ini',422); } 
        $balance=$db->prepare('SELECT COALESCE(SUM(amount),0) as balance FROM energy_transactions WHERE user_id=?'); 
        $balance->execute([$u['id']]); 
        $bal=(int)$balance->fetch()['balance']; 
        $energyAmount=(int)$q['energy_amount']; 
        $newBal=$bal+$energyAmount; 
        $db->prepare('INSERT INTO energy_transactions(user_id,transaction_type,amount,source_type,source_id,description,balance_after) VALUES(?,?,?,?,?,?,?)')->execute([$u['id'],'earn',$energyAmount,'qr_scan',$q['id'],'QR Scan',$newBal]); 
        $db->prepare('INSERT INTO qr_scans(qr_token_id,user_id,energy_awarded) VALUES(?,?,?)')->execute([$q['id'],$u['id'],$energyAmount]); 
        $db->prepare('UPDATE qr_tokens SET scan_count=scan_count+1 WHERE id=?')->execute([$q['id']]); 
        notify($db,$u['id'],'Energy Earned!','Kamu dapat '.$energyAmount.' Energy points dari QR scan!'); 
        $db->commit(); 
        Response::json(['energy_awarded'=>$energyAmount,'new_balance'=>$newBal,'message'=>'QR berhasil di-scan!'],201); 
    }
    
    // === ADMIN QR ENDPOINTS ===
    if ($path === 'admin/qr-tokens' && $method === 'GET') {
        Auth::require(['admin']);
        $q=$db->query('SELECT * FROM qr_tokens ORDER BY created_at DESC LIMIT 100');
        Response::json($q->fetchAll());
    }
    if ($path === 'admin/qr-tokens' && $method === 'POST') {
        Auth::require(['admin','seller']);
        $u=Auth::require();
        $token=input_string($body,'token');
        $energyAmount=(int)($body['energy_amount']??10);
        $scanLimit=(int)($body['scan_limit']??1);
        $expiresAt=input_string($body,'expires_at');
        if(!$token||!$expiresAt)Response::error('Token dan expires_at wajib diisi',422);
        if($energyAmount<1||$energyAmount>100)Response::error('Energy amount harus 1-100',422);
        if($scanLimit<1)Response::error('Scan limit minimal 1',422);
        $sellerId=$u['role']==='seller'?$u['id']:1; // Default admin seller_id=1
        $db->prepare('INSERT INTO qr_tokens(token,seller_id,energy_amount,scan_limit,expires_at) VALUES(?,?,?,?,?)')->execute([$token,$sellerId,$energyAmount,$scanLimit,$expiresAt]);
        Response::json(['id'=>$db->lastInsertId(),'message'=>'QR token created'],201);
    }
    if ($path === 'seller/profile' && in_array($method,['GET','PUT'],true)) { $u=Auth::require(['seller']);if($method==='PUT'){$current=$db->prepare('SELECT * FROM seller_profiles WHERE user_id=?');$current->execute([$u['id']]);$profile=$current->fetch();$type=$body['vehicle_type']??$profile['vehicle_type'];$status=$body['status']??$profile['status'];if(!in_array($type,['sepeda','sepeda_listrik'],true)||!in_array($status,['offline','available','busy','inactive'],true))Response::error('Profil seller tidak valid',422);$db->prepare('UPDATE seller_profiles SET area=?,status=?,vehicle_type=?,last_latitude=?,last_longitude=? WHERE user_id=?')->execute([$body['area']??$profile['area'],$status,$type,$body['latitude']??$profile['last_latitude'],$body['longitude']??$profile['last_longitude'],$u['id']]);}$q=$db->prepare('SELECT u.name,u.email,u.phone,p.* FROM users u JOIN seller_profiles p ON p.user_id=u.id WHERE u.id=?');$q->execute([$u['id']]);Response::json($q->fetch()); }
    if ($path === 'seller/orders' && $method==='GET') { $u=Auth::require(['seller']);$q=$db->prepare('SELECT o.*,u.name customer FROM orders o JOIN users u ON u.id=o.user_id JOIN vehicles v ON v.id=o.vehicle_id WHERE v.seller_id=? ORDER BY o.created_at DESC');$q->execute([$u['id']]);Response::json($q->fetchAll()); }
    if ($path === 'seller/location' && $method==='PUT') { $u=Auth::require(['seller']);$db->prepare('UPDATE seller_profiles SET last_latitude=?,last_longitude=? WHERE user_id=?')->execute([$body['latitude']??null,$body['longitude']??null,$u['id']]);Response::json(['message'=>'Location updated']); }
    if ($path === 'admin/sellers' && in_array($method,['GET','POST','PATCH'],true)) { Auth::require(['admin']);if($method==='GET'){$q=$db->query("SELECT u.id,u.name,u.email,u.phone,u.is_active,p.* FROM users u JOIN seller_profiles p ON p.user_id=u.id WHERE u.role_id=3");Response::json($q->fetchAll());}if($method==='POST'){$name=input_string($body,'name');$email=strtolower(input_string($body,'email'));$type=$body['vehicle_type']??'sepeda';if(!$name||!filter_var($email,FILTER_VALIDATE_EMAIL)||!in_array($type,['sepeda','sepeda_listrik'],true))Response::error('Data seller tidak valid',422);$q=$db->prepare('INSERT INTO users(role_id,name,email,phone,password_hash) VALUES(3,?,?,?,?)');$q->execute([$name,$email,$body['phone']??null,password_hash((string)($body['password']??bin2hex(random_bytes(8))),PASSWORD_DEFAULT)]);$id=(int)$db->lastInsertId();$db->prepare('INSERT INTO seller_profiles(user_id,area,status,vehicle_type) VALUES(?,?,?,?)')->execute([$id,$body['area']??null,'offline',$type]);$db->prepare('INSERT INTO vehicles(seller_id,type,plate,is_available) VALUES(?,?,?,0)')->execute([$id,$type,$body['plate']??null]);Response::json(['id'=>$id],201);} $id=(int)($body['id']??0);$type=$body['vehicle_type']??'sepeda';$status=$body['status']??'offline';if($id<1||!in_array($type,['sepeda','sepeda_listrik'],true)||!in_array($status,['offline','available','busy','inactive'],true))Response::error('Data seller tidak valid',422);$db->prepare('UPDATE users SET name=?,email=?,phone=?,is_active=? WHERE id=? AND role_id=3')->execute([$body['name'],$body['email'],$body['phone']??null,(int)($body['is_active']??1),$id]);$db->prepare('UPDATE seller_profiles SET area=?,status=?,vehicle_type=? WHERE user_id=?')->execute([$body['area']??null,$status,$type,$id]);Response::json(['message'=>'Seller updated']); }
    if ($path === 'admin/menu' && in_array($method,['GET','POST','PATCH'],true)) { Auth::require(['admin']);if($method==='GET'){ $q=$db->query('SELECT m.*,COALESCE(i.stock,0) stock FROM menu_items m LEFT JOIN inventory_stock i ON i.menu_id=m.id ORDER BY m.id DESC');Response::json($q->fetchAll()); }$id=(int)($body['id']??0);if($method==='POST'){$db->prepare('INSERT INTO menu_items(category_id,name,description,price,is_available,is_featured) VALUES(?,?,?,?,?,?)')->execute([(int)$body['category_id'],input_string($body,'name'),$body['description']??null,(float)$body['price'],(int)($body['is_available']??1),(int)($body['is_featured']??0)]);$id=$db->lastInsertId();$db->prepare('INSERT INTO inventory_stock(menu_id,stock) VALUES(?,?)')->execute([$id,max(0,(int)($body['stock']??0))]);Response::json(['id'=>$id],201);} $db->prepare('UPDATE menu_items SET category_id=?,name=?,description=?,price=?,is_available=?,is_featured=? WHERE id=?')->execute([(int)$body['category_id'],input_string($body,'name'),$body['description']??null,(float)$body['price'],(int)($body['is_available']??1),(int)($body['is_featured']??0),$id]);if(isset($body['stock']))$db->prepare('INSERT INTO inventory_stock(menu_id,stock) VALUES(?,?) ON DUPLICATE KEY UPDATE stock=VALUES(stock)')->execute([$id,max(0,(int)$body['stock'])]);Response::json(['message'=>'Menu updated']); }
    
    // === PAYMENT ENDPOINTS ===
    if ($path === 'payments/config' && $method === 'GET') {
        // Public endpoint - return client key only
        $cfg=$db->query('SELECT config_key,config_value FROM payment_config WHERE is_active=1')->fetchAll(PDO::FETCH_KEY_PAIR);
        $clientKey=$cfg['midtrans_client_key']??'';
        $isProd=(int)($cfg['midtrans_is_production']??0)===1;
        Response::json(['client_key'=>$clientKey,'is_production'=>$isProd]);
    }
    
    if ($path === 'payments/create' && $method === 'POST') {
        $u=Auth::require(['customer']);
        $orderId=(int)($body['order_id']??0);
        $paymentMethod=input_string($body,'payment_method');
        $bank=input_string($body,'bank');
        
        // Load order
        $order=require_order($db,$orderId,$u);
        if($order['payment_status']==='paid')Response::error('Order sudah dibayar',422);
        
        // DEMO MODE: Simulate payment success without Midtrans
        $simulateSuccess = true; // For demo purposes
        
        if ($simulateSuccess) {
            // Simulate successful payment
            $db->beginTransaction();
            
            // Update order payment status
            $db->prepare('UPDATE orders SET payment_method=?, payment_status=? WHERE id=?')
                ->execute([$paymentMethod, 'paid', $orderId]);
            
            // Clear cart after successful payment
            $db->prepare('DELETE FROM cart_items WHERE user_id=?')->execute([$u['id']]);
            
            // Send notification
            notify($db, $u['id'], 'Pembayaran Berhasil', 'Pembayaran untuk order '.$order['order_number'].' telah berhasil (SIMULASI).');
            
            $db->commit();
            
            // Return demo response
            Response::json([
                'success' => true,
                'order_id' => $orderId,
                'order_number' => $order['order_number'],
                'payment_method' => $paymentMethod,
                'status' => 'paid',
                'message' => 'SIMULASI: Pembayaran berhasil (tidak ada transaksi uang sungguhan)',
                'demo_mode' => true
            ], 200);
        }
        
        // Production Midtrans integration code below (skipped in demo mode)
        // Get Midtrans config
        $cfg=$db->query('SELECT config_key,config_value FROM payment_config WHERE is_active=1')->fetchAll(PDO::FETCH_KEY_PAIR);
        $serverKey=$cfg['midtrans_server_key']??'';
        $clientKey=$cfg['midtrans_client_key']??'';
        $isProd=(int)($cfg['midtrans_is_production']??0)===1;
        
        if(!$serverKey||!$clientKey)Response::error('Payment gateway belum dikonfigurasi',500);
        
        $midtrans=new Midtrans($serverKey,$isProd);
        $transactionId=$order['order_number'].'-'.time();
        
        // Build Midtrans payload
        $params=[
            'transaction_details'=>[
                'order_id'=>$transactionId,
                'gross_amount'=>(int)$order['total_amount']
            ],
            'customer_details'=>[
                'first_name'=>$order['customer'],
                'email'=>$order['customer_email'],
                'phone'=>$order['address_phone']??''
            ],
            'item_details'=>array_map(fn($item)=>[
                'id'=>$item['menu_id'],
                'name'=>$item['name'].' ('.$item['size'].')',
                'price'=>(int)($item['subtotal']/$item['quantity']),
                'quantity'=>(int)$item['quantity']
            ],$order['items']),
            'enabled_payments'=>explode(',',$cfg['midtrans_enabled_payments']??'gopay,qris,bank_transfer'),
            'expiry'=>[
                'duration'=>(int)($cfg['payment_expiry_duration']??24),
                'unit'=>$cfg['payment_expiry_unit']??'hour'
            ]
        ];
        
        // If bank_transfer, use direct charge API
        if($paymentMethod==='bank_transfer'&&$bank){
            $params['payment_type']='bank_transfer';
            $params['bank_transfer']=['bank'=>$bank];
            $result=$midtrans->charge($params);
        }else{
            // Use Snap API (for gopay, qris, shopeepay)
            $result=$midtrans->createTransaction($params);
        }
        
        // Save transaction
        $db->prepare('INSERT INTO payment_transactions(order_id,transaction_id,payment_method,payment_type,bank,gross_amount,transaction_status,va_numbers,qr_string,deeplink_redirect,transaction_time,expiry_time,raw_response) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)')->execute([
            $orderId,
            $transactionId,
            $paymentMethod,
            $result['payment_type']??null,
            $bank?:null,
            $order['total_amount'],
            $result['transaction_status']??'pending',
            isset($result['va_numbers'])?json_encode($result['va_numbers']):null,
            $result['qr_string']??null,
            $result['deeplink_redirect']??null,
            $result['transaction_time']??date('Y-m-d H:i:s'),
            $result['expiry_time']??null,
            json_encode($result)
        ]);
        
        // Update order payment_method
        $db->prepare('UPDATE orders SET payment_method=?,payment_status=? WHERE id=?')->execute([$paymentMethod,'pending',$orderId]);
        
        // Prepare response
        $response=['transaction_id'=>$transactionId,'order_id'=>$orderId,'payment_method'=>$paymentMethod];
        if(isset($result['token']))$response['snap_token']=$result['token'];
        if(isset($result['redirect_url']))$response['redirect_url']=$result['redirect_url'];
        if(isset($result['va_numbers'])&&count($result['va_numbers'])>0){
            $va=$result['va_numbers'][0];
            $response['va_number']=$va['va_number'];
            $response['bank']=$va['bank'];
        }
        if(isset($result['qr_string']))$response['qr_string']=$result['qr_string'];
        if(isset($result['expiry_time']))$response['expiry_time']=$result['expiry_time'];
        if(isset($result['deeplink_redirect']))$response['deeplink_redirect']=$result['deeplink_redirect'];
        
        Response::json($response,201);
    }
    
    if ($path === 'payments/notification' && $method === 'POST') {
        // Midtrans webhook handler
        $notification=$body;
        
        // Log notification
        $db->prepare('INSERT INTO payment_notifications(transaction_id,order_id,payment_type,transaction_status,fraud_status,status_code,gross_amount,signature_key,raw_notification) VALUES(?,?,?,?,?,?,?,?,?)')->execute([
            $notification['transaction_id']??'',
            $notification['order_id']??'',
            $notification['payment_type']??null,
            $notification['transaction_status']??'',
            $notification['fraud_status']??null,
            $notification['status_code']??'',
            $notification['gross_amount']??0,
            $notification['signature_key']??'',
            json_encode($notification)
        ]);
        $notifId=$db->lastInsertId();
        
        // Get Midtrans config
        $cfg=$db->query('SELECT config_key,config_value FROM payment_config WHERE is_active=1')->fetchAll(PDO::FETCH_KEY_PAIR);
        $serverKey=$cfg['midtrans_server_key']??'';
        $isProd=(int)($cfg['midtrans_is_production']??0)===1;
        
        $midtrans=new Midtrans($serverKey,$isProd);
        
        // Verify signature
        if(!$midtrans->verifySignature($notification)){
            $db->prepare('UPDATE payment_notifications SET is_valid=0,processed_at=NOW() WHERE id=?')->execute([$notifId]);
            Response::error('Invalid signature',403);
        }
        
        // Mark as valid
        $db->prepare('UPDATE payment_notifications SET is_valid=1 WHERE id=?')->execute([$notifId]);
        
        // Get transaction
        $transactionId=$notification['transaction_id']??'';
        $q=$db->prepare('SELECT * FROM payment_transactions WHERE transaction_id=?');
        $q->execute([$transactionId]);
        $transaction=$q->fetch();
        
        if(!$transaction)Response::error('Transaction not found',404);
        
        // Update transaction status
        $db->prepare('UPDATE payment_transactions SET transaction_status=?,fraud_status=?,settlement_time=?,signature_key=?,raw_response=?,updated_at=NOW() WHERE transaction_id=?')->execute([
            $notification['transaction_status']??'pending',
            $notification['fraud_status']??null,
            $notification['settlement_time']??null,
            $notification['signature_key']??'',
            json_encode($notification),
            $transactionId
        ]);
        
        // Map status
        $paymentStatus=Midtrans::mapStatus($notification['transaction_status']??'',$notification['fraud_status']??null);
        
        // Update order payment_status
        $db->prepare('UPDATE orders SET payment_status=?,updated_at=NOW() WHERE id=?')->execute([$paymentStatus,$transaction['order_id']]);
        
        // Get order for notification
        $order=$db->prepare('SELECT user_id,order_number FROM orders WHERE id=?');
        $order->execute([$transaction['order_id']]);
        $o=$order->fetch();
        
        // Notify customer
        if($paymentStatus==='paid'){
            notify($db,$o['user_id'],'Pembayaran Berhasil','Pembayaran order '.$o['order_number'].' telah diterima.');
        }elseif($paymentStatus==='failed'){
            notify($db,$o['user_id'],'Pembayaran Gagal','Pembayaran order '.$o['order_number'].' gagal. Silakan coba lagi.');
        }
        
        // Mark as processed
        $db->prepare('UPDATE payment_notifications SET processed_at=NOW() WHERE id=?')->execute([$notifId]);
        
        Response::json(['message'=>'Notification processed']);
    }
    
    if ($path === 'payments/check' && $method === 'GET') {
        $u=Auth::require(['customer']);
        $orderId=(int)($_GET['order_id']??0);
        
        $order=require_order($db,$orderId,$u);
        
        // Get latest transaction
        $q=$db->prepare('SELECT * FROM payment_transactions WHERE order_id=? ORDER BY created_at DESC LIMIT 1');
        $q->execute([$orderId]);
        $transaction=$q->fetch();
        
        if(!$transaction)Response::error('Payment not found',404);
        
        Response::json([
            'order_id'=>$orderId,
            'payment_status'=>$order['payment_status'],
            'transaction_status'=>$transaction['transaction_status'],
            'payment_method'=>$transaction['payment_method'],
            'gross_amount'=>$transaction['gross_amount']
        ]);
    }
    
    // === ORDER TRACKING ENDPOINTS ===
    if (preg_match('#^orders/(\\d+)/track$#',$path,$m) && $method === 'GET') {
        $u=Auth::require(['customer']);
        $orderId=(int)$m[1];
        
        // Get order with seller info
        $order=require_order($db,$orderId,$u);
        
        // Get seller location (if assigned)
        $sellerLocation=null;
        $eta=null;
        
        if($order['vehicle_id']){
            $q=$db->prepare('SELECT v.seller_id,sp.last_latitude,sp.last_longitude,sp.status,sp.outlet_name,u.name seller_name,u.phone seller_phone FROM vehicles v JOIN seller_profiles sp ON sp.user_id=v.seller_id JOIN users u ON u.id=v.seller_id WHERE v.id=?');
            $q->execute([$order['vehicle_id']]);
            $seller=$q->fetch();
            
            if($seller && $seller['last_latitude']){
                $sellerLocation=[
                    'latitude'=>(float)$seller['last_latitude'],
                    'longitude'=>(float)$seller['last_longitude'],
                    'seller_name'=>$seller['seller_name'],
                    'seller_phone'=>$seller['seller_phone'],
                    'outlet_name'=>$seller['outlet_name'],
                    'status'=>$seller['status']
                ];
                
                // Calculate ETA if order is on_delivery
                if($order['status']==='on_delivery'&&$order['address_id']){
                    $addr=$db->prepare('SELECT latitude,longitude,address_line,city FROM addresses WHERE id=?');
                    $addr->execute([$order['address_id']]);
                    $address=$addr->fetch();
                    
                    if($address&&$address['latitude']){
                        // Haversine distance
                        $lat1=(float)$seller['last_latitude'];
                        $lon1=(float)$seller['last_longitude'];
                        $lat2=(float)$address['latitude'];
                        $lon2=(float)$address['longitude'];
                        
                        $R=6371; // km
                        $dLat=deg2rad($lat2-$lat1);
                        $dLon=deg2rad($lon2-$lon1);
                        $a=sin($dLat/2)*sin($dLat/2)+cos(deg2rad($lat1))*cos(deg2rad($lat2))*sin($dLon/2)*sin($dLon/2);
                        $c=2*atan2(sqrt($a),sqrt(1-$a));
                        $distance=$R*$c;
                        
                        // Average speed: 15 km/h (sepeda)
                        $avgSpeed=15;
                        $etaMinutes=ceil(($distance/$avgSpeed)*60);
                        
                        // Log ETA calculation
                        $db->prepare('INSERT INTO delivery_eta_log(order_id,distance_km,estimated_minutes,calculation_method,seller_latitude,seller_longitude,customer_latitude,customer_longitude) VALUES(?,?,?,?,?,?,?,?)')->execute([$orderId,$distance,$etaMinutes,'haversine',$lat1,$lon1,$lat2,$lon2]);
                        
                        $eta=[
                            'distance_km'=>round($distance,2),
                            'estimated_minutes'=>$etaMinutes,
                            'estimated_arrival'=>date('Y-m-d H:i:s',strtotime('+'.$etaMinutes.' minutes'))
                        ];
                    }
                }
            }
        }
        
        // Get location history (last 20 points)
        $history=[];
        if($order['vehicle_id']){
            $q=$db->prepare('SELECT latitude,longitude,speed,recorded_at FROM order_location_history WHERE order_id=? ORDER BY recorded_at DESC LIMIT 20');
            $q->execute([$orderId]);
            $history=$q->fetchAll();
        }
        
        Response::json([
            'order'=>[
                'id'=>$order['id'],
                'order_number'=>$order['order_number'],
                'status'=>$order['status'],
                'fulfillment_type'=>$order['fulfillment_type'],
                'created_at'=>$order['created_at'],
                'delivery_started_at'=>$order['delivery_started_at']??null,
                'estimated_delivery_time'=>$order['estimated_delivery_time']??null
            ],
            'seller_location'=>$sellerLocation,
            'eta'=>$eta,
            'location_history'=>$history
        ]);
    }
    
    if ($path === 'seller/orders/active' && $method === 'GET') {
        $u=Auth::require(['seller']);
        // Get active orders (on_delivery) for this seller
        $q=$db->prepare('SELECT o.*,u.name customer,a.address_line,a.latitude,a.longitude FROM orders o JOIN users u ON u.id=o.user_id LEFT JOIN addresses a ON a.id=o.address_id JOIN vehicles v ON v.id=o.vehicle_id WHERE v.seller_id=? AND o.status IN ("confirmed","processing","ready","on_delivery") ORDER BY o.created_at');
        $q->execute([$u['id']]);
        Response::json($q->fetchAll());
    }
    
    if ($path === 'seller/location/update' && $method === 'POST') {
        $u=Auth::require(['seller']);
        $lat=(float)($body['latitude']??0);
        $lng=(float)($body['longitude']??0);
        $speed=(float)($body['speed']??null);
        $accuracy=(float)($body['accuracy']??null);
        $orderId=(int)($body['order_id']??0);
        
        if(!$lat||!$lng)Response::error('Latitude dan longitude wajib diisi',422);
        
        // Update seller profile location
        $db->prepare('UPDATE seller_profiles SET last_latitude=?,last_longitude=?,updated_at=NOW() WHERE user_id=?')->execute([$lat,$lng,$u['id']]);
        
        // If order_id provided, log to order_location_history
        if($orderId>0){
            // Verify seller owns this order
            $q=$db->prepare('SELECT 1 FROM orders o JOIN vehicles v ON v.id=o.vehicle_id WHERE o.id=? AND v.seller_id=?');
            $q->execute([$orderId,$u['id']]);
            if($q->fetch()){
                $db->prepare('INSERT INTO order_location_history(order_id,seller_id,latitude,longitude,speed,accuracy) VALUES(?,?,?,?,?,?)')->execute([$orderId,$u['id'],$lat,$lng,$speed,$accuracy]);
            }
        }
        
        Response::json(['message'=>'Location updated','latitude'=>$lat,'longitude'=>$lng]);
    }
    
    if (preg_match('#^seller/orders/(\\d+)/status$#',$path,$m) && $method === 'PATCH') {
        $u=Auth::require(['seller']);
        $orderId=(int)$m[1];
        $newStatus=$body['status']??'';
        
        if(!in_array($newStatus,['confirmed','processing','ready','on_delivery','completed'],true))Response::error('Status tidak valid',422);
        
        // Verify seller owns this order
        $q=$db->prepare('SELECT o.id,o.user_id,o.status FROM orders o JOIN vehicles v ON v.id=o.vehicle_id WHERE o.id=? AND v.seller_id=?');
        $q->execute([$orderId,$u['id']]);
        $order=$q->fetch();
        
        if(!$order)Response::error('Order tidak ditemukan',404);
        
        // Update status
        $db->prepare('UPDATE orders SET status=?,updated_at=NOW() WHERE id=?')->execute([$newStatus,$orderId]);
        
        // If changing to on_delivery, set delivery_started_at
        if($newStatus==='on_delivery'&&$order['status']!=='on_delivery'){
            $db->prepare('UPDATE orders SET delivery_started_at=NOW() WHERE id=?')->execute([$orderId]);
        }
        
        // Notify customer
        $statusMsg=['confirmed'=>'Order dikonfirmasi','processing'=>'Order sedang diproses','ready'=>'Order siap diambil/dikirim','on_delivery'=>'Order sedang dikirim','completed'=>'Order selesai'];
        notify($db,$order['user_id'],'Status Order Update',$statusMsg[$newStatus]??'Status order diperbarui');
        
        Response::json(['message'=>'Status updated','new_status'=>$newStatus]);
    }
    
    // === SCHEDULE ORDER ENDPOINTS ===
    if ($path === 'schedule/slots' && $method === 'GET') {
        // Get available slots for outlet + date range
        $outletId=(int)($_GET['outlet_id']??0);
        $startDate=$_GET['start_date']??date('Y-m-d');
        $days=(int)($_GET['days']??7);
        
        if(!$outletId)Response::error('outlet_id required',422);
        
        // Validate date format
        $start=DateTime::createFromFormat('Y-m-d',$startDate);
        if(!$start)Response::error('Invalid start_date format (Y-m-d)',422);
        
        $slots=[];
        
        for($i=0;$i<$days;$i++){
            $date=clone $start;
            $date->modify('+'.$i.' days');
            $dateStr=$date->format('Y-m-d');
            $dayOfWeek=$date->format('w'); // 0=Sunday
            
            // Check blackout
            $blackout=$db->prepare('SELECT reason FROM schedule_blackout_dates WHERE outlet_id=? AND blackout_date=?');
            $blackout->execute([$outletId,$dateStr]);
            $blackoutReason=$blackout->fetchColumn();
            
            if($blackoutReason){
                $slots[]=['date'=>$dateStr,'day_name'=>$date->format('l'),'is_blackout'=>true,'blackout_reason'=>$blackoutReason,'slots'=>[]];
                continue;
            }
            
            // Get time slots for this day
            $q=$db->prepare('SELECT ts.id,ts.start_time,ts.end_time,ts.capacity,COALESCE(sb.booked_count,0) booked FROM time_slots ts LEFT JOIN schedule_bookings sb ON sb.time_slot_id=ts.id AND sb.booking_date=? WHERE ts.outlet_id=? AND ts.day_of_week=? AND ts.is_active=1 ORDER BY ts.start_time');
            $q->execute([$dateStr,$outletId,$dayOfWeek]);
            $timeSlots=$q->fetchAll();
            
            $availableSlots=[];
            foreach($timeSlots as $ts){
                $available=(int)$ts['capacity']-(int)$ts['booked'];
                $availableSlots[]=[
                    'id'=>$ts['id'],
                    'start_time'=>substr($ts['start_time'],0,5),
                    'end_time'=>substr($ts['end_time'],0,5),
                    'capacity'=>(int)$ts['capacity'],
                    'booked'=>(int)$ts['booked'],
                    'available'=>max($available,0),
                    'is_available'=>$available>0
                ];
            }
            
            $slots[]=['date'=>$dateStr,'day_name'=>$date->format('l'),'is_blackout'=>false,'slots'=>$availableSlots];
        }
        
        Response::json($slots);
    }
    
    if ($path === 'schedule/validate' && $method === 'POST') {
        // Validate slot availability before checkout
        $slotId=(int)($body['time_slot_id']??0);
        $scheduledFor=$body['scheduled_for']??'';
        
        if(!$slotId||!$scheduledFor)Response::error('time_slot_id and scheduled_for required',422);
        
        // Parse datetime
        $dt=DateTime::createFromFormat('Y-m-d H:i:s',$scheduledFor);
        if(!$dt)Response::error('Invalid scheduled_for format (Y-m-d H:i:s)',422);
        
        $bookingDate=$dt->format('Y-m-d');
        
        // Check slot exists and active
        $slot=$db->prepare('SELECT id,outlet_id,capacity,start_time,end_time FROM time_slots WHERE id=? AND is_active=1');
        $slot->execute([$slotId]);
        $slotData=$slot->fetch();
        
        if(!$slotData)Response::error('Time slot not found or inactive',404);
        
        // Check blackout
        $blackout=$db->prepare('SELECT 1 FROM schedule_blackout_dates WHERE outlet_id=? AND blackout_date=?');
        $blackout->execute([$slotData['outlet_id'],$bookingDate]);
        if($blackout->fetch())Response::error('Date is not available (blackout)',422);
        
        // Check capacity
        $available=$db->prepare('SELECT check_slot_availability(?,?) as available');
        $available->execute([$slotId,$bookingDate]);
        $avail=(int)$available->fetchColumn();
        
        if($avail<=0)Response::error('Time slot is fully booked',422);
        
        Response::json(['available'=>$avail,'slot'=>$slotData]);
    }
    
    if ($path === 'admin/schedule/slots' && $method === 'GET') {
        $u=Auth::require(['admin']);
        $outletId=(int)($_GET['outlet_id']??0);
        
        $q=$outletId
            ?$db->prepare('SELECT ts.*,u.name outlet_name FROM time_slots ts JOIN users u ON u.id=ts.outlet_id WHERE ts.outlet_id=? ORDER BY ts.day_of_week,ts.start_time')
            :$db->prepare('SELECT ts.*,u.name outlet_name FROM time_slots ts JOIN users u ON u.id=ts.outlet_id ORDER BY ts.outlet_id,ts.day_of_week,ts.start_time');
        
        $outletId?$q->execute([$outletId]):$q->execute();
        Response::json($q->fetchAll());
    }
    
    if ($path === 'admin/schedule/slots' && $method === 'POST') {
        $u=Auth::require(['admin']);
        $outletId=(int)($body['outlet_id']??0);
        $dayOfWeek=(int)($body['day_of_week']??-1);
        $startTime=$body['start_time']??'';
        $endTime=$body['end_time']??'';
        $capacity=(int)($body['capacity']??10);
        
        if(!$outletId||$dayOfWeek<0||$dayOfWeek>6||!$startTime||!$endTime||$capacity<1)Response::error('Invalid input',422);
        
        // Validate times
        if(strtotime($startTime)>=strtotime($endTime))Response::error('start_time must be before end_time',422);
        
        $db->prepare('INSERT INTO time_slots(outlet_id,day_of_week,start_time,end_time,capacity) VALUES(?,?,?,?,?)')->execute([$outletId,$dayOfWeek,$startTime,$endTime,$capacity]);
        
        Response::json(['message'=>'Time slot created','id'=>$db->lastInsertId()]);
    }
    
    if (preg_match('#^admin/schedule/slots/(\\d+)$#',$path,$m) && $method === 'PATCH') {
        $u=Auth::require(['admin']);
        $slotId=(int)$m[1];
        
        $updates=[];
        $params=[];
        
        if(isset($body['capacity'])){
            $updates[]='capacity=?';
            $params[]=(int)$body['capacity'];
        }
        if(isset($body['is_active'])){
            $updates[]='is_active=?';
            $params[]=$body['is_active']?1:0;
        }
        
        if(empty($updates))Response::error('No fields to update',422);
        
        $params[]=$slotId;
        $db->prepare('UPDATE time_slots SET '.implode(',',$updates).' WHERE id=?')->execute($params);
        
        Response::json(['message'=>'Time slot updated']);
    }
    
    if ($path === 'admin/schedule/blackout' && $method === 'POST') {
        $u=Auth::require(['admin']);
        $outletId=(int)($body['outlet_id']??0);
        $blackoutDate=$body['blackout_date']??'';
        $reason=$body['reason']??'';
        
        if(!$outletId||!$blackoutDate)Response::error('outlet_id and blackout_date required',422);
        
        $db->prepare('INSERT INTO schedule_blackout_dates(outlet_id,blackout_date,reason) VALUES(?,?,?)')->execute([$outletId,$blackoutDate,$reason]);
        
        Response::json(['message'=>'Blackout date added','id'=>$db->lastInsertId()]);
    }
    
    Response::error('Endpoint not found',404);
} catch (PDOException $e) {
    if ($e->getCode()==='23000') Response::error('Data sudah ada atau tidak valid',422);
    error_log($e->getMessage());
    Response::error('Database tidak dapat dihubungi.',503);
} catch (Throwable $e) {
    error_log($e->getMessage());
    Response::error('Terjadi kesalahan server.',500);
}
