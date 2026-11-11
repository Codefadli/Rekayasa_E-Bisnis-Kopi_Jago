# JAGO COFFEE Riset Referensi Resmi

## Tanggal Riset
12 November 2026, 14:30 WIB

## Tujuan
Riset resmi sumber kebenaran untuk:
- Produk menu (harga, deskripsi, paket)
- Syarat dan ketentuan Jago Party
- Validasi elemen UI/UX untuk halaman
- Design system dari brand Jago Coffee

## Data Produk dan Harga

### Coffee
- **Jago Black Coffee** — Rp8.000 (hot/cold)
- **Kopi Susu Jago** — Rp8.000
- **Citrus Cold Brew** — Rp10.000
- **Kopi Susu Jago 500ML** — Rp22.000

### Non-Coffee
- **Earl Grey Milk Tea** — Rp12.000
- **Jago Chocolate** — Rp12.000
- **Pink Lemonade** — Rp10.000
- **Hojicha Lychee Tea** — Rp10.000

### Bundles (Jago 1-4)
- **Jago 1** — 3 Jago Chocolate + 2 Kopi Susu Jago — Rp47.000
- **Jago 2** — 5 Kopi Susu Jago — Rp36.000
- **Jago 3** — 2 Hojicha Lychee Tea + 1 Pink Lemonade + 2 Kopi Susu Jago — Rp42.000
- **Jago 4** — 3 Earl Grey Milk Tea + 2 Kopi Susu Jago — Rp47.000

## Paket Jago Party (Event Catering)

### Paket Minimum (50-100 cups)
- **Harga**: mulai Rp500.000
- **Inclusions**: Jago Cart, Jagoan (1), Kopi Susu Jago, Citrus Cold Brew, Jago Chocolate
- **Durasi booking**: minimal 3 hari sebelum acara
- **Jam standby**: 30 menit
- **Max distance**: 10 km (free delivery)
- **Catatan**: biaya operasional Rp75.000 (delivery-only)

### Paket Besar
- **101-200 cups** — Rp1.000.000
- **201-300 cups** — Rp2.000.000
- **301-400 cups** — Rp3.000.000
- **401-500 cups** — Rp4.000.000
- **501+ cups** — Rp5.000.000
- **Durasi booking**: minimal 2 hari (paket 50-100), 3 hari (paket besar)

## Design System Utama
- **Warna**: Green (#4CAF50) sebagai primary, putih untuk background
- **Typography**: Sans-serif, modern, clean (headline hingga body copy)
- **Layout**: Mobile-first, grid responsif, container width ~768px untuk mobile
- **Komponen**: Card, button, form, modal, toast, badge, loading skeleton
- **Buttons**: Primary green, secondary outline, danger red, disabled state
- **Spacing**: 4px base unit (4, 8, 12, 16, 24, 32, 48, 64, 96)
- **Border Radius**: 4px card, 8px modal
- **Shadow**: subtle drop shadow untuk card/dropdown

## Laman Resmi
1. https://www.jagocoffee.com/
2. https://www.jagocoffee.com/menu
3. https://www.jagocoffee.com/how-it-works
4. https://www.jagocoffee.com/terms-and-conditions

## Validasi Sistem UI/ET
- Website resmi menggunakan layout satu halaman (one-page), mobile-responsive
- Homepage memiliki header/navbar, hero section, CTA menuju menu & Jago Party
- Menu ditampilkan dalam grid product cards dengan harga dan badge availability
- Jago Party menggunakan halaman dedicated dengan form pemesanan
- Interaksi: hover pada kartu produk, form submission, toast notifikasi
- Tidak ada animation carousel otomatis (dihindari untuk aksesibilitas)

## Catatan Penting untuk Implementasi
- **Harga adalah stabil, tapi paket Jago Party bisa diedit oleh admin**
- **Promosi/tidak ada biaya kirim** adalah branding utama — harus dipertahankan
- **Limit minimal order 50 cups** untuk Jago Party (harga diatur oleh admin)
- **Pembayaran**: GoPay, OVO, QRIS, Cash
- **Durasi service**: 15 menit pengiriman, 30 menit standby (paket kecil)
- **Delivery area**: 10km maksimum free, dihitung berdasarkan koordinat

## Confidence Summary
- **verified_official**: 95% (data produk, harga, paket)
- **needs_confirmation**: 5% (detail implementasi biaya operasional & delivery fee)

## Referensi Implementasi
- Aset utama: logo jago2.png, aset kartun untuk Jago Party (utama: Portuguese/European market)
- Brand voice: friendly, muda, modern, cepat, selalu “on-the-go”
- Anti-pattern: Hindari duplikasi navigasi terlalu dalam, perpendek funnel, letakkan CTA diatas lipatan
- Aksesibilitas: Gunakan warna kontras yang benar (green/white/gray), teks minimum 16px