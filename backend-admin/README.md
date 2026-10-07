# Kopi Jago Admin API

Jalankan:
1. Import schema awal, lalu `sql/admin_extension.sql`
2. `DB_USER=root DB_PASS=xxx php -S 127.0.0.1:8000 router_dev.php`
3. Login: `POST /api/auth/login` body `{"email":"admin@kopijago.id","password":"password"}`
4. Kirim header `Authorization: Bearer <token>` di semua endpoint lain

Env: DB_HOST DB_PORT DB_NAME DB_USER DB_PASS CORS_ORIGIN APP_DEBUG
Semua respons: `{ok, data, meta?}` atau `{ok:false, error, errors?}`
Apache: pakai `.htaccess`, taruh folder ini di `/api`.
