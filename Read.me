# Alur Autentikasi

┌──────────────────┐
│   HALAMAN LOGIN    │
│  (Email + Password)│
└──────────────────┘
          │
          ▼
┌───────────────────────┐
│   BACKEND / AUTH        │
│   - Cek email/password  │
│   - Generate JWT Token  │
│   - Token berisi: role  │
└───────────────────────┘
          │
          ▼
     ┌───────────┐
     │ Cek Role   │
     │ (dari JWT) │
     └───────────┘ 
    ┌─────┴───────┐
    ▼              ▼
role: admin     role: customer
    │              │
    ▼              ▼
/admin/dashboard  /home



# Struktur Folder

frontend/
└── src/
    ├── pages/
    │   ├── auth/
    │   │   ├── Login.tsx
    │   │   └── Register.tsx
    │   │
    │   ├── customer/
    │   │   ├── Home.tsx
    │   │   ├── Menu.tsx
    │   │   ├── Cart.tsx
    │   │   ├── Orders.tsx
    │   │   │
    │   │   ├── settings/                     # Halaman Pengaturan Pengguna
    │   │   │   ├── ProfileSettings.tsx       # Edit profil (nama, email, no. HP, foto)
    │   │   │   ├── Wishlist.tsx              # Daftar menu favorit / disimpan
    │   │   │   ├── ChangePassword.tsx        # Ganti password
    │   │   │   └── NotificationPreferences.tsx # Preferensi notifikasi (promo, order update, dll)
    │   │   │
    │   │   ├── shipping/                     # Halaman Pengaturan Pengiriman
    │   │   │   ├── ShippingSettings.tsx      # Halaman induk/tab pengaturan pengiriman
    │   │   │   ├── OrderHistory.tsx          # Riwayat/histori pesanan yang pernah dibeli
    │   │   │   ├── ShippingAddress.tsx       # Kelola alamat pengiriman
    │   │   │   ├── ShippingMethod.tsx        # Pilihan metode pengiriman (reguler/instan/ambil sendiri)
    │   │   │   └── ShippingCost.tsx          # Kalkulasi & tampilan biaya pengiriman
    │   │   │
    │   │   └── payment/                      # Halaman Pembayaran
    │   │       ├── PaymentMethods.tsx        # Daftar & pilih metode pembayaran digital
    │   │       └── PaymentInfo.tsx           # Detail/konfirmasi info pembayaran (invoice, status)
    │   │
    │   └── admin/
    │       ├── Dashboard.tsx
    │       ├── Menu.tsx
    │       ├── Pesanan.tsx
    │       ├── Pelanggan.tsx
    │       ├── Stok.tsx
    │       ├── Supplier.tsx
    │       ├── Promo.tsx
    │       ├── Laporan.tsx
    │       └── Pengaturan.tsx
    │
    ├── layouts/
    │   ├── AdminLayout.tsx
    │   └── CustomerLayout.tsx
    │
    ├── components/
    │   ├── admin/
    │   │   ├── Sidebar.tsx
    │   │   ├── Header.tsx
    │   │   ├── StatCard.tsx
    │   │   ├── SalesChart.tsx
    │   │   └── RecentOrders.tsx
    │   │
    │   └── customer/
    │       ├── WishlistCard.tsx
    │       ├── AddressCard.tsx
    │       ├── PaymentMethodCard.tsx
    │       └── OrderHistoryItem.tsx
    │
    ├── routes/
    │   └── AppRoutes.tsx
    │
    └── context/
        └── AuthContext.tsx




backend/
└── app/
    ├── api/
    │   └── routes/
    │       ├── auth.py            # Login, register, refresh token
    │       ├── users.py           # Profil, ganti password
    │       ├── menu.py            # CRUD menu (admin) & list menu (customer)
    │       ├── orders.py          # Buat pesanan, riwayat pesanan
    │       ├── inventory.py       # Stok & supplier (admin)
    │       ├── reports.py         # Laporan penjualan (admin)
    │       ├── wishlist.py        # CRUD wishlist customer
    │       ├── shipping.py        # Alamat, metode & biaya pengiriman
    │       ├── payments.py        # Metode pembayaran & status pembayaran
    │       └── notifications.py   # Preferensi & pengiriman notifikasi
    │
    ├── core/
    │   ├── security.py            # Hash password, JWT, dependency cek role
    │   └── database.py
    │
    ├── models/
    │   ├── user.py
    │   ├── order.py
    │   ├── wishlist.py
    │   ├── address.py
    │   ├── shipping_method.py
    │   ├── payment_method.py
    │   └── notification_preference.py
    │
    └── schemas/
        ├── user.py
        ├── order.py
        ├── wishlist.py
        ├── address.py
        ├── shipping.py
        ├── payment.py
        └── notification.py