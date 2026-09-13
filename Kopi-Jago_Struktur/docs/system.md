# 1. SYSTEM OVERVIEW

Kopi Jago adalah sistem informasi berbasis web untuk mendukung proses

operasional kedai kopi dan layanan pemesanan pelanggan.

Sistem terdiri dari:

1. Customer Web Interface

2. Admin Web Interface

3. PHP REST API Backend

4. MySQL Database

5. JWT Authentication

6. Role-Based Access Control

7. Order Management

8. Payment Management

9. Shipping Management

10. Table Reservation

11. Inventory Management

12. Supplier Management

13. Promotion Management

14. Customer Support

15. Activity Logging

16. Reporting

17. Analytics

Sistem memiliki dua role utama:

- admin

- customer

---

# 2. SYSTEM ARCHITECTURE

High-level architecture:

Customer / Admin

        |

        v

Frontend Web Application

        |

        | HTTP / HTTPS

        | Fetch API

        v

PHP REST API Backend

        |

        +---- Authentication & Authorization

        |

        +---- Business Modules

        |

        v

MySQL Database

Backend bertanggung jawab terhadap:

- authentication

- authorization

- business logic

- data validation

- database access

- API response

- security

- activity logging

---

# 3. ACTORS

## 3.1 Customer

Customer adalah pengguna yang menggunakan sistem untuk melakukan

aktivitas pemesanan dan pengelolaan akun.

Customer dapat:

- Register

- Login

- Logout

- Forgot password

- Melihat menu

- Melihat detail menu

- Memberikan rating

- Mengelola wishlist

- Mengelola cart

- Membuat pesanan

- Membatalkan pesanan sesuai aturan

- Melihat riwayat pesanan

- Melacak pesanan

- Memilih alamat pengiriman

- Memilih metode pengiriman

- Melihat biaya pengiriman

- Memilih metode pembayaran

- Melakukan pembayaran

- Melihat informasi/status pembayaran

- Melihat invoice

- Melakukan reservasi meja

- Mengecek ketersediaan meja

- Mengelola profil

- Mengubah password

- Mengatur preferensi notifikasi

- Menggunakan customer support chat

## 3.2 Admin

Admin adalah pengguna yang memiliki hak akses untuk mengelola

operasional sistem.

Admin dapat:

- Login

- Melihat dashboard

- Melihat statistik

- Mengelola pesanan

- Mengelola pelanggan

- Mengelola menu

- Mengelola stok

- Mengelola supplier

- Mengelola promo

- Melihat laporan

- Melihat analitik

- Mengelola reservasi

- Membalas customer support

- Melihat activity log

- Mengelola pengaturan sistem

---

# 4. AUTHENTICATION AND AUTHORIZATION

Sistem menggunakan:

- Email

- Password

- JWT

- Role-Based Access Control

Role:

- admin

- customer

## 4.1 Login Flow

Alur login:

Customer/Admin

        |

        v

login.html

        |

        | POST /api/auth/login.php

        v

Backend Authentication

        |

        v

Validate Email

        |

        v

Verify Password

        |

        v

Get User Role

        |

        v

Generate JWT

        |

        v

Return JSON

        |

        v

Frontend

        |

        v

localStorage

        |

        v

auth-guard.js

        |

        v

Check JWT + Role

        |

        +----------------------+

        |                      |

        v                      v

      admin                customer

        |                      |

        v                      v

admin/dashboard.html     customer/home.html

## 4.2 Login Request

Endpoint:

POST /api/auth/login.php

Input:

- email

- password

## 4.3 Login Response

Successful response:

{

  "token": "JWT_TOKEN",

  "role": "admin"

}

atau:

{

  "token": "JWT_TOKEN",

  "role": "customer"

}

## 4.4 JWT

JWT digunakan untuk membawa informasi identitas dan authorization

user pada request API.

JWT minimal mengandung informasi:

- user identity

- role

- issued time

- expiration time

Frontend menyimpan JWT pada:

localStorage

## 4.5 Authorization Header

Request yang membutuhkan authentication mengirim:

Authorization: Bearer <JWT>

## 4.6 Backend Middleware

Middleware bertugas:

1. Membaca Authorization header.

2. Mengambil JWT.

3. Memvalidasi JWT.

4. Memeriksa expiration.

5. Mengambil identity user.

6. Mengambil role user.

7. Memeriksa permission.

8. Mengizinkan atau menolak request.

## 4.7 Role Protection

Admin-only API harus memverifikasi:

role = admin

Customer API harus memverifikasi:

role = customer

Frontend tidak boleh menjadi satu-satunya mekanisme keamanan.

Authorization wajib dilakukan kembali pada backend.

---

# 5. PASSWORD SECURITY

Password tidak boleh disimpan dalam bentuk plaintext.

Backend harus menggunakan password hashing.

Proses register:

Password

    |

    v

Password Hash

    |

    v

Database

Proses login:

Password Input

    |

    v

Password Verification

    |

    v

Valid / Invalid

---

# 6. FRONTEND ARCHITECTURE

Frontend menggunakan:

- HTML

- CSS

- JavaScript

- Fetch API

- localStorage

## 6.1 Frontend Root

frontend/src/

## 6.2 Landing Page

frontend/src/index.html

Fungsi:

- Landing page

- Informasi Kopi Jago

- Navigasi ke login/register

---

# 7. AUTH FRONTEND MODULE

Directory:

frontend/src/auth/

## login.html

Fungsi:

- Input email

- Input password

- Submit login

- Memanggil login API

- Menyimpan JWT

- Redirect berdasarkan role

## register.html

Fungsi:

- Registrasi customer

- Input data user

- Validasi input

- Mengirim data ke register API

## forgot-password.html

Fungsi:

- Meminta reset password

- Input email

- Menerima OTP atau link reset

- Melakukan proses reset password

---

# 8. CUSTOMER FRONTEND

Directory:

frontend/src/customer/

## home.html

Halaman utama customer.

Menampilkan:

- informasi user

- menu populer

- promo

- status pesanan

- informasi lainnya

## menu.html

Fungsi:

- Menampilkan menu

- Melihat detail menu

- Melihat harga

- Melihat rating

- Menambahkan menu ke cart

- Menambahkan menu ke wishlist

## cart.html

Fungsi:

- Melihat cart

- Mengubah jumlah item

- Menghapus item

- Menghitung subtotal

- Melanjutkan checkout

## orders.html

Fungsi:

- Melihat pesanan

- Melihat status pesanan

- Melihat riwayat pesanan

## order-tracking.html

Fungsi:

- Melacak status pesanan

- Menampilkan progress pesanan

Alur status:

Pending

→ Confirmed

→ Processing

→ Ready

→ Shipped / Served

→ Completed

Pesanan dapat dibatalkan sesuai aturan bisnis.

## reservation.html

Fungsi:

- Memilih tanggal

- Memilih waktu

- Mengecek ketersediaan meja

- Memilih meja

- Membuat reservasi

- Melihat status reservasi

## support.html

Fungsi:

- Customer support

- Live chat

- Mengirim pesan

- Menerima balasan admin

---

# 9. CUSTOMER SETTINGS

Directory:

frontend/src/customer/settings/

## profile.html

Customer dapat:

- Mengubah nama

- Mengubah email

- Mengubah nomor HP

- Mengubah foto profil

## wishlist.html

Customer dapat:

- Melihat menu favorit

- Menambah wishlist

- Menghapus wishlist

## change-password.html

Customer dapat:

- Memasukkan password lama

- Memasukkan password baru

- Mengubah password

## notifications.html

Customer dapat:

- Melihat preferensi notifikasi

- Mengaktifkan/mematikan notifikasi

---

# 10. CUSTOMER SHIPPING

Directory:

frontend/src/customer/shipping/

## index.html

Halaman induk pengaturan shipping.

## order-history.html

Menampilkan histori pesanan terkait pengiriman.

## address.html

Customer dapat:

- Menambah alamat

- Mengubah alamat

- Menghapus alamat

- Memilih alamat utama

## method.html

Customer dapat memilih metode pengiriman.

## cost.html

Menampilkan biaya pengiriman berdasarkan:

- alamat

- metode pengiriman

- parameter pengiriman

---

# 11. CUSTOMER PAYMENT

Directory:

frontend/src/customer/payment/

## methods.html

Menampilkan metode pembayaran digital yang tersedia.

## info.html

Menampilkan:

- informasi pembayaran

- total pembayaran

- status pembayaran

- instruksi pembayaran

---

# 12. ADMIN FRONTEND

Directory:

frontend/src/admin/

## dashboard.html

Dashboard utama admin.

Menampilkan informasi seperti:

- total penjualan

- total pesanan

- total pelanggan

- stok

- reservasi

- statistik bisnis

- ringkasan aktivitas

## pesanan.html

Admin dapat:

- melihat pesanan

- melihat detail pesanan

- mengubah status pesanan

- membatalkan pesanan sesuai aturan

## pelanggan.html

Admin dapat:

- melihat pelanggan

- melihat detail pelanggan

- mengelola data pelanggan

## stok.html

Admin dapat:

- melihat stok

- menambah stok

- mengurangi stok

- memperbarui stok

- memonitor stok rendah

## supplier.html

Admin dapat:

- melihat supplier

- menambah supplier

- mengubah supplier

- menghapus supplier

## promo.html

Admin dapat:

- membuat promo

- mengubah promo

- menghapus promo

- mengaktifkan/nonaktifkan promo

## laporan.html

Admin dapat melihat:

- laporan penjualan

- laporan pesanan

- laporan produk

- laporan operasional

## analitik.html

Admin dapat melihat:

- best seller

- forecast stok

- jam ramai

- customer loyalty

## reservasi.html

Admin dapat:

- melihat reservasi

- memeriksa jadwal

- menyetujui reservasi

- mengubah status reservasi

- membatalkan reservasi

## support.html

Admin dapat:

- melihat chat customer

- membalas customer

- mengelola percakapan support

## log-aktivitas.html

Menampilkan audit trail aktivitas admin.

Contoh aktivitas:

- Login

- Logout

- Edit menu

- Edit stok

- Edit promo

- Update pesanan

- Update reservasi

## pengaturan.html

Admin dapat mengelola konfigurasi sistem.

---

# 13. FRONTEND JAVASCRIPT

Directory:

frontend/src/js/

## api.js

Wrapper Fetch API.

Tanggung jawab:

- HTTP request

- Base API URL

- Attach JWT

- Handle response

- Handle error

Alur:

JavaScript

→ api.js

→ Fetch

→ Authorization: Bearer JWT

→ PHP API

## auth.js

Tanggung jawab:

- login

- register

- logout

- forgot password

- save token

- remove token

- membaca authentication state

## auth-guard.js

Tanggung jawab:

- memeriksa token

- memeriksa JWT expiration

- membaca role

- melindungi halaman

- redirect user jika tidak memiliki akses

## cart.js

Mengelola cart customer.

## wishlist.js

Mengelola wishlist customer.

## shipping.js

Mengelola:

- address

- shipping method

- shipping cost

## payment.js

Mengelola proses pembayaran.

## order-tracking.js

Mengelola tracking status pesanan.

## reservation.js

Mengelola reservasi meja.

## support-chat.js

Mengelola customer support chat.

---

# 14. ADMIN JAVASCRIPT

Directory:

frontend/src/js/admin/

## dashboard.js

Mengelola:

- statistik

- chart

- dashboard data

## table.js

Mengelola:

- tabel data

- filter

- sorting

- pagination jika diperlukan

## analitik.js

Mengelola visualisasi analytics.

---

# 15. FRONTEND COMPONENTS

Directory:

frontend/src/components/

## navbar-customer.html

Navbar customer.

## sidebar-admin.html

Sidebar admin.

## footer.html

Footer website.

Component dapat di-inject menggunakan JavaScript.

---

# 16. BACKEND ARCHITECTURE

Backend menggunakan:

- PHP

- REST API

- MySQL

- JWT

Root:

backend/api/

Setiap endpoint bertanggung jawab terhadap modul tertentu.

---

# 17. AUTH API

Directory:

backend/api/auth/

## login.php

Method:

POST

Fungsi:

- menerima email/password

- mencari user

- memverifikasi password

- mengambil role

- generate JWT

- mengembalikan token dan role

## register.php

Method:

POST

Fungsi:

- menerima data registrasi

- validasi

- hash password

- membuat user

## logout.php

Method:

POST

Fungsi:

- menangani logout

- mengakhiri authentication session pada sisi aplikasi

## forgot-password.php

Method:

POST

Fungsi:

- menerima email

- membuat OTP/token reset

- mengirim OTP/link reset

- memproses reset password

---

# 18. USER API

Directory:

backend/api/users/

## profile.php

Fungsi:

- GET profile

- UPDATE profile

## change-password.php

Fungsi:

- verifikasi password lama

- hash password baru

- update password

---

# 19. WISHLIST API

Directory:

backend/api/wishlist/

## index.php

Mendukung:

- GET wishlist

- POST wishlist

- DELETE wishlist

---

# 20. NOTIFICATION API

Directory:

backend/api/notifications/

## preferences.php

Mendukung:

- GET preferences

- UPDATE preferences

## send.php

Fungsi:

- mengirim notifikasi aktual

- email notification

- WhatsApp notification jika integrasi tersedia

---

# 21. ORDER API

Directory:

backend/api/orders/

## index.php

Fungsi:

- membuat pesanan

- melihat detail pesanan

## history.php

Fungsi:

- mengambil riwayat pesanan customer

## update-status.php

Fungsi:

- mengubah status pesanan

- terutama untuk admin

## cancel.php

Fungsi:

- membatalkan pesanan

- memvalidasi aturan pembatalan

---

# 22. RESERVATION API

Directory:

backend/api/reservation/

## index.php

Fungsi:

- create reservation

- read reservation

- update reservation

- cancel/delete reservation

## availability.php

Fungsi:

- mengecek ketersediaan meja

- mengecek tanggal

- mengecek waktu

- mengecek konflik reservasi

---

# 23. SHIPPING API

Directory:

backend/api/shipping/

## address.php

CRUD alamat customer.

## method.php

Mengambil metode pengiriman.

## cost.php

Menghitung atau mengambil biaya pengiriman.

---

# 24. PAYMENT API

Directory:

backend/api/payment/

## methods.php

Mengambil metode pembayaran.

## checkout.php

Memproses checkout/payment.

## status.php

Mengambil status pembayaran.

Payment flow:

Customer

→ Checkout

→ Select Payment Method

→ Payment API

→ Payment Processing

→ Payment Status

→ Order

---

# 25. INVOICE API

Directory:

backend/api/invoice/

## print.php

Fungsi:

- membuat invoice

- menampilkan invoice

- mencetak invoice

Invoice berhubungan dengan:

- order

- customer

- payment

---

# 26. MENU API

Directory:

backend/api/menu/

## index.php

Customer:

- GET menu

- GET detail menu

Admin:

- CREATE menu

- READ menu

- UPDATE menu

- DELETE menu

## rating.php

Fungsi:

- customer memberikan rating

- customer memberikan review jika digunakan

- mengambil rating menu

---

# 27. INVENTORY API

Directory:

backend/api/inventory/

## stok.php

Admin dapat:

- melihat stok

- menambah stok

- mengurangi stok

- update stok

## supplier.php

Admin dapat:

- CRUD supplier

- melihat supplier

- menghubungkan supplier dengan inventory

---

# 28. PROMO API

Directory:

backend/api/promo/

## index.php

Admin:

- CRUD promo

Customer:

- melihat promo

## apply.php

Fungsi:

- validasi promo

- menghitung discount

- menerapkan promo ke order

---

# 29. REPORT API

Directory:

backend/api/reports/

## index.php

Menghasilkan laporan:

- penjualan

- pesanan

- produk

- customer

- operasional

Data report berasal dari database.

---

# 30. ANALYTICS API

Directory:

backend/api/analytics/

## best-seller.php

Mengidentifikasi menu dengan penjualan tertinggi.

## forecast-stok.php

Menganalisis data inventory untuk membantu memperkirakan kebutuhan stok.

## jam-ramai.php

Mengidentifikasi waktu dengan jumlah transaksi/pesanan tertinggi.

## customer-loyalty.php

Menganalisis loyalitas customer berdasarkan histori transaksi.

Analytics digunakan oleh:

admin/analitik.html

admin/dashboard.html

---

# 31. SUPPORT API

Directory:

backend/api/support/

## index.php

Digunakan untuk:

- mengirim pesan customer

- menerima pesan customer

- admin membaca pesan

- admin membalas pesan

Flow:

Customer

→ support.html

→ support API

→ Database

→ Admin support.html

→ Reply

→ Database

→ Customer

---

# 32. ACTIVITY LOG API

Directory:

backend/api/logs/

## activity.php

Menyimpan audit trail aktivitas.

Contoh:

- admin login

- admin logout

- create menu

- update menu

- delete menu

- update stock

- update order

- update reservation

- update promotion

Log minimal memiliki:

- actor/user

- action

- module

- timestamp

- target/data reference

---

# 33. BACKEND CORE

Directory:

backend/api/core/

## Database.php

Tanggung jawab:

- koneksi MySQL

- database access

## Auth.php

Tanggung jawab:

- password hashing

- password verification

- JWT generation

- JWT verification

## Middleware.php

Tanggung jawab:

- membaca Authorization header

- memvalidasi JWT

- authentication

- role authorization

## Response.php

Tanggung jawab:

- standard JSON response

- HTTP status code

- error response

---

# 34. BACKEND CONFIGURATION

Directory:

backend/api/config/

## config.php

Berisi konfigurasi:

- database host

- database name

- database username

- database password

- JWT secret

- JWT expiration

- API configuration

Secret dan credential tidak boleh dikirim ke frontend.

---

# 35. DATABASE

Directory:

database/

## schema.sql

Berisi struktur database lengkap.

## seed.sql

Berisi data dummy/testing.

---

# 36. DATABASE DOMAIN

Database minimal mencakup domain:

## User

Menyimpan:

- user

- email

- password hash

- role

- profile

## Menu

Menyimpan:

- menu

- category

- price

- description

- availability

- rating

## Order

Menyimpan:

- customer

- order

- order items

- total

- status

- timestamp

## Payment

Menyimpan:

- order

- payment method

- payment amount

- payment status

- transaction information

## Shipping

Menyimpan:

- customer address

- shipping method

- shipping cost

- shipping status

## Reservation

Menyimpan:

- customer

- table

- date

- time

- reservation status

## Wishlist

Menyimpan:

- customer

- menu

## Notification

Menyimpan:

- customer

- notification

- preference

- status

## Promotion

Menyimpan:

- promo

- discount

- validity

- usage rules

## Inventory

Menyimpan:

- item

- stock

- stock movement

## Supplier

Menyimpan:

- supplier

- contact

- supplied items

## Support

Menyimpan:

- customer

- conversation

- messages

- timestamps

## Activity Log

Menyimpan:

- actor

- action

- module

- timestamp

- reference

---

# 37. CUSTOMER ORDER FLOW

Customer

    |

    v

Login

    |

    v

Customer Home

    |

    v

Menu

    |

    v

Select Product

    |

    v

Cart

    |

    v

Checkout

    |

    +----> Select Address

    |

    +----> Select Shipping

    |

    +----> Apply Promo

    |

    +----> Select Payment

    |

    v

Payment

    |

    v

Create Order

    |

    v

Order Status

    |

    v

Order Tracking

    |

    v

Completed

    |

    v

Invoice

---

# 38. ADMIN ORDER FLOW

Admin

    |

    v

Admin Dashboard

    |

    v

Pesanan

    |

    v

View Order

    |

    v

Validate Order

    |

    v

Update Order Status

    |

    v

Customer receives updated status

---

# 39. RESERVATION FLOW

Customer

    |

    v

Reservation Page

    |

    v

Select Date

    |

    v

Select Time

    |

    v

Check Availability

    |

    v

Available?

    |

    +---- No ----> Select another time/table

    |

    +---- Yes

          |

          v

     Create Reservation

          |

          v

       Database

          |

          v

    Reservation Status

Admin

    |

    v

Reservation Management

    |

    v

View Reservation

    |

    v

Approve / Update / Cancel

---

# 40. FORGOT PASSWORD FLOW

Customer

    |

    v

Forgot Password

    |

    v

Enter Email

    |

    v

POST /api/auth/forgot-password.php

    |

    v

Backend

    |

    v

Generate OTP / Reset Token

    |

    v

Send Email / Notification

    |

    v

Customer verifies OTP / Reset Link

    |

    v

Set New Password

    |

    v

Password Updated

---

# 41. SUPPORT CHAT FLOW

Customer

    |

    v

Support Page

    |

    v

Send Message

    |

    v

Support API

    |

    v

Database

    |

    v

Admin Support

    |

    v

Admin Reply

    |

    v

Database

    |

    v

Customer

---

# 42. ANALYTICS FLOW

Database

    |

    +---- Orders

    |

    +---- Order Items

    |

    +---- Menu

    |

    +---- Inventory

    |

    +---- Customers

    |

    v

Analytics API

    |

    +---- Best Seller

    |

    +---- Forecast Stock

    |

    +---- Peak Hours

    |

    +---- Customer Loyalty

    |

    v

Admin Dashboard / Analytics

---

# 43. DATA FLOW

General data flow:

Customer/Admin

        |

        v

Frontend

        |

        | Fetch API

        | JWT

        v

PHP REST API

        |

        v

Middleware

        |

        v

Authorization

        |

        v

Business Logic

        |

        v

Database

        |

        v

JSON Response

        |

        v

Frontend

---

# 44. MAIN SYSTEM PROCESSES

Untuk DFD Level 0, sistem dapat dibagi menjadi proses utama:

1.0 Authentication & Authorization

2.0 User & Customer Management

3.0 Menu Management

4.0 Order Management

5.0 Payment Management

6.0 Shipping Management

7.0 Reservation Management

8.0 Inventory & Supplier Management

9.0 Promotion Management

10.0 Customer Support

11.0 Reporting & Analytics

12.0 Notification Management

13.0 Invoice Management

14.0 Activity Logging

---

# 45. DFD LEVEL 0 - EXTERNAL ENTITIES

External entities:

E1 Customer

E2 Admin

---

# 46. DFD LEVEL 0 - DATA STORES

Data stores:

D1 User Data

D2 Menu Data

D3 Order Data

D4 Payment Data

D5 Shipping Data

D6 Reservation Data

D7 Inventory Data

D8 Supplier Data

D9 Promotion Data

D10 Wishlist Data

D11 Notification Data

D12 Support Data

D13 Activity Log Data

---

# 47. DFD LEVEL 0 - MAIN DATA FLOWS

Customer → Authentication & Authorization

Customer → Menu Management

Customer → Order Management

Customer → Payment Management

Customer → Shipping Management

Customer → Reservation Management

Customer → Wishlist

Customer → Notification Management

Customer → Support

Customer → Profile Management

Admin → Authentication & Authorization

Admin → User & Customer Management

Admin → Menu Management

Admin → Order Management

Admin → Inventory & Supplier Management

Admin → Promotion Management

Admin → Reservation Management

Admin → Customer Support

Admin → Reporting & Analytics

Admin → Activity Log

---

# 48. ADMIN DASHBOARD DECISION SUPPORT

Admin dashboard digunakan sebagai decision support system.

Dashboard membantu admin:

- Mengidentifikasi produk terlaris

- Mengidentifikasi produk kurang laku

- Mengidentifikasi stok rendah

- Memperkirakan kebutuhan stok

- Mengidentifikasi jam ramai

- Menganalisis loyalitas customer

- Memantau penjualan

- Memantau pesanan

- Memantau reservasi

- Memantau aktivitas sistem

---

# 49. SECURITY REQUIREMENTS

Sistem wajib:

1. Menggunakan password hashing.

2. Menggunakan JWT untuk authentication.

3. Memvalidasi JWT di backend.

4. Memeriksa role di backend.

5. Tidak mempercayai role hanya dari frontend.

6. Menggunakan Authorization Bearer token.

7. Melakukan validasi input.

8. Menggunakan prepared statements untuk database query.

9. Tidak menyimpan password plaintext.

10. Tidak menyimpan JWT secret di frontend.

11. Tidak menyimpan database credential di frontend.

12. Menggunakan HTTPS pada production.

13. Mencatat aktivitas penting admin.

14. Memvalidasi akses terhadap resource milik user.

---

# 50. API RESPONSE STANDARD

API menggunakan JSON.

Success:

{

  "success": true,

  "data": {}

}

Error:

{

  "success": false,

  "message": "Error message"

}

HTTP status code harus digunakan sesuai kondisi:

200 - Success

201 - Created

400 - Bad Request

401 - Unauthorized

403 - Forbidden

404 - Not Found

409 - Conflict

422 - Validation Error

500 - Internal Server Error

---

# 51. FRONTEND-BACKEND RESPONSIBILITY

Frontend bertanggung jawab terhadap:

- UI

- user interaction

- form

- navigation

- displaying data

- calling API

- storing JWT locally

- client-side validation

Backend bertanggung jawab terhadap:

- authentication

- authorization

- business logic

- validation

- database

- security

- JWT verification

- API response

- activity logging

Database bertanggung jawab terhadap:

- persistent data

- relationships

- constraints

- data integrity

---

# 52. SYSTEM DEPENDENCIES

Frontend depends on:

Backend REST API

Backend depends on:

MySQL Database

Authentication depends on:

JWT

Admin dashboard depends on:

Reporting API

Analytics API

Order API

Inventory API

Reservation API

---

# 53. IMPORTANT ARCHITECTURE RULES

1. Frontend tidak boleh mengakses database secara langsung.

2. Semua akses database dilakukan melalui backend.

3. Frontend menggunakan Fetch API untuk komunikasi dengan backend.

4. JWT digunakan untuk authenticated API request.

5. Backend Middleware melakukan validasi JWT.

6. Backend melakukan role authorization.

7. Customer tidak boleh mengakses endpoint admin.

8. Admin dapat mengakses endpoint administratif sesuai permission.

9. Database menjadi sumber data utama.

10. Business logic tidak boleh hanya berada di frontend.

11. Activity penting admin dicatat ke activity log.

12. Analytics mengambil data dari data transaksi dan operasional.

13. File HTML tidak dianggap sebagai business process dalam DFD Level 0.

14. Endpoint PHP dikelompokkan berdasarkan business domain.

15. DFD Level 0 harus menampilkan proses utama, external entity,

data store, dan data flow tanpa menampilkan setiap file HTML/PHP.

---

# 54. PROJECT STRUCTURE

frontend/

└── src/

    ├── index.html

    │

    ├── auth/

    │   ├── login.html

    │   ├── register.html

    │   └── forgot-password.html

    │

    ├── customer/

    │   ├── home.html

    │   ├── menu.html

    │   ├── cart.html

    │   ├── orders.html

    │   ├── order-tracking.html

    │   ├── reservation.html

    │   ├── support.html

    │   │

    │   ├── settings/

    │   │   ├── profile.html

    │   │   ├── wishlist.html

    │   │   ├── change-password.html

    │   │   └── notifications.html

    │   │

    │   ├── shipping/

    │   │   ├── index.html

    │   │   ├── order-history.html

    │   │   ├── address.html

    │   │   ├── method.html

    │   │   └── cost.html

    │   │

    │   └── payment/

    │       ├── methods.html

    │       └── info.html

    │

    ├── admin/

    │   ├── dashboard.html

    │   ├── pesanan.html

    │   ├── pelanggan.html

    │   ├── stok.html

    │   ├── supplier.html

    │   ├── promo.html

    │   ├── laporan.html

    │   ├── analitik.html

    │   ├── reservasi.html

    │   ├── support.html

    │   ├── log-aktivitas.html

    │   └── pengaturan.html

    │

    ├── css/

    │   ├── style.css

    │   └── admin.css

    │

    ├── js/

    │   ├── api.js

    │   ├── auth.js

    │   ├── auth-guard.js

    │   ├── cart.js

    │   ├── wishlist.js

    │   ├── shipping.js

    │   ├── payment.js

    │   ├── order-tracking.js

    │   ├── reservation.js

    │   ├── support-chat.js

    │   │

    │   └── admin/

    │       ├── dashboard.js

    │       ├── table.js

    │       ├── analitik.js

    │

    ├── components/

    │   ├── navbar-customer.html

    │   ├── sidebar-admin.html

    │   └── footer.html

    │

    └── assets/

        └── images/

backend/

└── api/

    ├── auth/

    │   ├── login.php

    │   ├── register.php

    │   ├── logout.php

    │   └── forgot-password.php

    │

    ├── users/

    │   ├── profile.php

    │   └── change-password.php

    │

    ├── wishlist/

    │   └── index.php

    │

    ├── notifications/

    │   ├── preferences.php

    │   └── send.php

    │

    ├── orders/

    │   ├── index.php

    │   ├── history.php

    │   ├── update-status.php

    │   └── cancel.php

    │

    ├── reservation/

    │   ├── index.php

    │   └── availability.php

    │

    ├── shipping/

    │   ├── address.php

    │   ├── method.php

    │   └── cost.php

    │

    ├── payment/

    │   ├── methods.php

    │   ├── checkout.php

    │   └── status.php

    │

    ├── invoice/

    │   └── print.php

    │

    ├── menu/

    │   ├── index.php

    │   └── rating.php

    │

    ├── inventory/

    │   ├── stok.php

    │   └── supplier.php

    │

    ├── promo/

    │   ├── index.php

    │   └── apply.php

    │

    ├── reports/

    │   └── index.php

    │

    ├── analytics/

    │   ├── best-seller.php

    │   ├── forecast-stok.php

    │   ├── jam-ramai.php

    │   └── customer-loyalty.php

    │

    │

    ├── support/

    │   └── index.php

    │

    ├── logs/

    │   └── activity.php

    │

    ├── core/

    │   ├── Database.php

    │   ├── Auth.php

    │   ├── Middleware.php

    │   └── Response.php

    │

    └── config/

        └── config.php

database/

├── schema.sql

└── seed.sql