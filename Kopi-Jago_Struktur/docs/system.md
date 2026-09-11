# Sistem Kopi Jago

## Technology

Frontend:
- HTML
- CSS
- JavaScript
- Fetch API
- localStorage

Backend:
- PHP REST API

Authentication:
- Email + Password
- JWT
- Role: admin / customer

Database:
- MySQL

## Authentication Flow

1. User membuka login.html
2. User memasukkan email dan password
3. Frontend melakukan POST ke /api/auth/login.php
4. Backend mencari user berdasarkan email
5. Backend melakukan verifikasi password
6. Backend membuat JWT
7. Backend mengembalikan JSON:

{
  "token": "...",
  "role": "admin/customer"
}

8. Frontend menyimpan token di localStorage
9. auth-guard.js membaca JWT
10. Sistem menentukan role
11. Jika admin:
    admin/dashboard.html
12. Jika customer:
    customer/home.html

## Customer

Customer dapat:
- melihat menu
- mengelola cart
- membuat pesanan
- melihat riwayat pesanan
- mengelola profile
- mengelola wishlist
- mengelola alamat
- memilih metode pengiriman
- melakukan pembayaran
- mengatur notifikasi

## Admin

Admin dapat:
- melihat dashboard
- mengelola pesanan
- mengelola pelanggan
- mengelola stok
- mengelola supplier
- mengelola promo
- melihat laporan
- mengelola pengaturan

## API

/api/auth/
/api/users/
/api/wishlist/
/api/notifications/
/api/orders/
/api/shipping/
/api/payment/
/api/menu/
/api/inventory/
/api/promo/
/api/reports/