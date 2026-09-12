![System Architecture](kopi-jago-high-level-architecture.visual-check.1440x900.dark.png
)
```text
frontend/
│   └── src/
│       ├── index.html
│       │
│       ├── auth/
│       │   ├── login.html
│       │   ├── register.html
│       │   └── forgot-password.html       # Reset password via email/OTP
│       │
│       ├── customer/
│       │   ├── home.html
│       │   ├── menu.html
│       │   ├── cart.html
│       │   ├── orders.html
│       │   ├── order-tracking.html
│       │   ├── reservation.html           # Reservasi meja (dine-in)
│       │   ├── support.html               # ive chat/CS ke admin
│       │   │
│       │   ├── settings/
│       │   │   ├── profile.html
│       │   │   ├── wishlist.html
│       │   │   ├── change-password.html
│       │   │   └── notifications.html
│       │   │
│       │   ├── shipping/
│       │   │   ├── index.html
│       │   │   ├── order-history.html
│       │   │   ├── address.html
│       │   │   ├── method.html
│       │   │   └── cost.html
│       │   │
│       │   └── payment/
│       │       ├── methods.html
│       │       └── info.html
│       │
│       ├── admin/
│       │   ├── dashboard.html
│       │   ├── pesanan.html
│       │   ├── pelanggan.html
│       │   ├── stok.html
│       │   ├── supplier.html
│       │   ├── promo.html
│       │   ├── laporan.html
│       │   ├── analitik.html
│       │   ├── reservasi.html             # Kelola reservasi meja
│       │   ├── karyawan.html              # Manajemen staff/shift
│       │   ├── support.html               # Balas chat customer
│       │   ├── log-aktivitas.html         # Audit trail aksi admin
│       │   └── pengaturan.html
│       │
│       ├── css/
│       │   ├── style.css
│       │   └── admin.css
│       │
│       ├── js/
│       │   ├── api.js
│       │   ├── auth.js
│       │   ├── auth-guard.js
│       │   ├── cart.js
│       │   ├── wishlist.js
│       │   ├── shipping.js
│       │   ├── payment.js
│       │   ├── order-tracking.js
│       │   ├── reservation.js             
│       │   ├── support-chat.js            
│       │   └── admin/
│       │       ├── dashboard.js
│       │       ├── table.js
│       │       ├── analitik.js
│       │       └── karyawan.js           
│       │
│       ├── components/
│       │   ├── navbar-customer.html
│       │   ├── sidebar-admin.html
│       │   └── footer.html
│       │
│       └── assets/
│           └── images/
│
└── backend/
    └── api/
        ├── auth/
        │   ├── login.php
        │   ├── register.php
        │   ├── logout.php
        │   └── forgot-password.php        # Kirim OTP/link reset
        │
        ├── users/
        │   ├── profile.php
        │   └── change-password.php
        │
        ├── wishlist/
        │   └── index.php
        │
        ├── notifications/
        │   ├── preferences.php
        │   └── send.php                   #  Kirim notif aktual (email/WA)
        │
        ├── orders/
        │   ├── index.php
        │   ├── history.php
        │   ├── update-status.php
        │   └── cancel.php
        │
        ├── reservation/                   # Modul reservasi meja
        │   ├── index.php                  # CRUD reservasi
        │   └── availability.php           # Cek ketersediaan meja/jam
        │
        ├── shipping/
        │   ├── address.php
        │   ├── method.php
        │   └── cost.php
        │
        ├── payment/
        │   ├── methods.php
        │   ├── checkout.php
        │   └── status.php
        │
        ├── invoice/
        │   └── print.php
        │
        ├── menu/
        │   ├── index.php
        │   └── rating.php
        │
        ├── inventory/
        │   ├── stok.php
        │   └── supplier.php
        │
        ├── promo/
        │   ├── index.php
        │   └── apply.php
        │
        ├── reports/
        │   └── index.php
        │
        ├── analytics/
        │   ├── best-seller.php
        │   ├── forecast-stok.php
        │   ├── jam-ramai.php
        │   └── customer-loyalty.php
        │
        ├── staff/                         # Manajemen karyawan/shift
        │   ├── index.php                  # CRUD data karyawan
        │   └── shift.php                  # Jadwal shift
        │
        ├── support/                       # Live chat/CS
        │   └── index.php                  # Kirim/terima pesan chat
        │
        ├── logs/                          # Audit trail
        │   └── activity.php               # Catat aksi admin (login, edit stok, dll)
        │
        ├── core/
        │   ├── Database.php
        │   ├── Auth.php
        │   ├── Middleware.php
        │   └── Response.php
        │
        └── config/
            └── config.php

database/                                  
├── schema.sql                             # Struktur tabel lengkap
└── seed.sql                               # Data dummy

```
