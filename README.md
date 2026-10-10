# Kopi Jago - E-Commerce Platform

Website pemesanan kopi keliling dengan sistem delivery dan pickup.

## 🚀 Quick Start

### 1. Setup Database
```sql
-- Jalankan di phpMyAdmin/MySQL CLI:
database/schema.sql
database/seed.sql
database/migration_add_sizes.sql
database/seed_update_pricing.sql
```

### 2. Start Server
```bash
# Start Apache & MySQL di XAMPP
# Akses: http://localhost/kopi-jago/Rekayasa_E-Bisnis-Kopi_Jago/
```

### 3. Test URLs

**Customer:**
- Homepage: `/customer/home.html`
- Cart: `/customer/cart.html`
- Checkout: `/customer/checkout.html`

**Admin Dashboard (Demo):**
- `/admin/dashboard.html` - Langsung masuk tanpa login

**Seller Dashboard (Demo):**
- `/seller/dashboard.html` - Langsung masuk tanpa login

## 🔑 Demo Accounts

Password untuk semua akun: `password`

- **Admin**: admin@kopijago.id
- **Seller**: seller@example.com
- **Customer**: siti@example.com

## ✅ Fitur Utama

- ✅ Register & Login
- ✅ Browse menu dengan filter kategori
- ✅ Pilih ukuran (Small/Medium/Large) dengan harga dinamis
- ✅ Cart management (add, update qty, remove)
- ✅ Checkout dengan pickup/delivery
- ✅ Interactive map dengan marker Jagoan 🚲
- ✅ Simulasi pembayaran (QRIS, GoPay, ShopeePay, Bank Transfer)
- ✅ Struk pembayaran (print-friendly)
- ✅ Admin dashboard (orders, menu, customers)
- ✅ Seller dashboard (assigned orders)

## 📊 Status

**Last Updated**: 10 Oktober 2026  
**Status**: ✅ READY FOR DEMO  
**Mode**: DEMO (simulasi pembayaran tanpa transaksi uang sungguhan)

## 📝 Dokumentasi Lengkap

Lihat **AUDIT_REPORT.md** untuk:
- Daftar lengkap bug fixes
- Detail perubahan file
- Hasil pengujian
- Batasan dan rekomendasi

## ⚠️ Important Notes

1. **DEMO MODE**: Payment menggunakan simulasi. Tidak ada transaksi uang sungguhan.
2. **Admin/Seller Access**: Dashboard bisa diakses langsung tanpa login untuk testing.
3. **Production**: Ubah `DEMO_MODE = false` di admin-core.js dan seller-core.js sebelum deployment.

## 🛠️ Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: PHP REST API
- **Database**: MySQL
- **Maps**: Leaflet.js
- **Payment**: Midtrans (production mode, skipped in demo)

## 📞 Support

Untuk pertanyaan teknis, lihat source code atau AUDIT_REPORT.md.

---

**Developed for**: Rekayasa E-Bisnis Project  
**Platform**: Kopi Jago - Coffee on Wheels 🚲☕
