# AUDIT AWAL DUA ROLE — DELETE SELLER & TRACKING

## Temuan Utama (Per 12 November 2026)
1. Role di database saat ini: customer (1), admin (2), seller (3)
2. Registri publik memberikan role customer (role_id 1) sesuai blueprint
3. Seller role digunakan di: customer (find-jagoan), backend (seller orders), API (seller endpoints), UI (seller.* halaman)
4. Tracking/X implementasi dalam:
   - customer/tracking.html, tracking.js (juga GPS polling, order_location_history)
   - admin/jagoans.html, jagoans.js (dashboard seller)
   - backend seller/profile, orders/active, location endpoints
   - seller.* folder (seller dashboard)

## File/File yang Berpotensi Dihapus (Setelah Analisis Dependency)

### Customer (Potensi Save)
- customer/tracking.html — absen dari halaman utama customer, fitur khusus seller
- customer/tracking.js — terkait polling GPS, order_location_history
- customer/find-jagoan.html, find-jagoan.js — fitur pencarian assignment seller
- customer/energy.html, energy.js — loyalty / QR scan (bukan fitur wajib)
- customer/order-tracking.html, tracking.css — halaman khusus tracking (mungkin pertahankan sebagai placeholder dengan status saja)

### Seller (Akan Dihapus)
- seller/dashboard.html, seller/orders.html, seller/order-detail.html, seller/profile.html
- seller/seller-core.js
- seller/seller folder (lalu hapus folder jika tidak ada referensi)

### Backend (Potensi Pemangkasan)
- seller/profile, seller/orders, seller/location update di index.php
- order_location_history, delivery_eta_log, GPS polling endpoints
- seller profiles: seller_profiles, vehicles, order_assignment_audit

### Admin (Potensi Save)
- admin/jagoans.html, jagoans.js (dashboard seller — pertahankan sebagai bagian admin di UI tetapi sembunyikan jika seller dihapus)
- admin/jagoans-data-loader.js (jika tidak ada backend)

## Status saat ini dari Tables (SQL)
```
SELECT TABLE_NAME FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'kopi_jago_db'
ORDER BY TABLE_NAME;
```

Hasil:
- addresses
- auth_tokens
- cart_items
- inventory_stock
- menu_categories
- menu_items
- password_reset_tokens
- promos
- roles
- seller_profiles
- users

## Dependency Analysis Berdasarkan Periksa File
- customer/home.js tidak mereferensi tracking/find-jagoan langsung
- customer/cart.js menggunakan seller_profiles.outlets endpoint (tersimpan di menu.html) — tetap butuh seller_profiles untuk outlet picking? Evaluasi
- customer/jago-party.html menggunakan party requests endpoints, bukan seller
- customer/checkout.html melakukan pencarian seller_profiles.outlets (via menu.html?) — bisa pertahankan seller_profiles hanya untuk Jago Party lookup? Jaga setidaknya outlet_name, outlet_address

## Keputusan (Akan Diimplementasikan)
- Hapus: seller folder, seller core, seller API, seller role pengguna, seller_profiles (kecuali field outlet untuk checkout)
- Pertahankan: customer order list tanpa GPS/tracking, admin dashboard vendor
- Ubah seller_profiles menjadi public outlet table (untuk pickup/delivery selection)
- Pertahankan customer energy & QR? — berdasarkan repository, bukan halaman wajib; hapus jika tidak dipakai halaman customer

## File Cleanup Planning (Berdasar Dependency Analysis)

### File yang Akan Dihapus (Setelah Memverifikasi Referensi)
1. customer/order-tracking.html (tracking.html)
2. customer/tracking.css
3. customer/tracking.js
4. customer/find-jagoan.html
5. customer/find-jagoan.js
6. customer/energy.html (atau pertahankan sebagai loyalty jika tidak ada dependency)
7. customer/energy.js
8. seller folder (lalu hapus folder jika aman)
9. seller/seller-core.js
10. backend seller profile/order/location endpoints

### File yang Dipertahankan (dengan perubahan)
1. customer/home.html, cart.html, checkout.html, jago-party.html (tipe checkout melibatkan seller, pertahankan UI saja)
2. admin/jagoans.html (jika tidak ada backend, hapus konten saja)
3. database schema (hapus seller_role referensi di users table)
4. roles table — hapus seller role (role_id 3)
5. seller_profiles → ubah menjadi outlets untuk customer checkout
6. vehicles, order_assignment_audit (hapus jika tidak ada referensi)
7. order_location_history, delivery_eta_log (hapus jika tidak ada halaman pelanggan)

## Rencana Pelaksanaan (Setelah Dependency Analysis)
1. Gunakan database schema (schema.sql) untuk memahami referential integrity
2. Jalankan SELECT queries untuk memeriksa referensi yang masih ada
3. Jalankan script pembersihan berdasarkan flowchart di atas
4. Update customer frontend untuk HANYA menggunakan halaman wajib
5. Persiapkan pengembangan design system yang konsisten
