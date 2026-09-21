-- =====================================================================
-- SEED DATA: Kopi Jago
-- Jalankan setelah schema.sql
-- =====================================================================

USE kopi_jago_db;

-- ROLES
INSERT INTO roles (id, name, description) VALUES
(1, 'customer', 'Pelanggan aplikasi'),
(2, 'admin', 'Pemilik / manajer UMKM'),
(3, 'kasir', 'Petugas kasir/POS'),
(4, 'dapur', 'Petugas dapur/barista');

-- USERS (password_hash contoh: bcrypt dummy, ganti dengan hash asli saat integrasi)
INSERT INTO users (id, role_id, name, email, phone, password_hash) VALUES
(1, 2, 'Budi Santoso', 'budi@kopijago.id', '081234567890', '$2y$10$dummyhashadminbudi'),
(2, 1, 'Siti Aminah', 'siti@gmail.com', '081211112222', '$2y$10$dummyhashsiti'),
(3, 1, 'Andi Wijaya', 'andi@gmail.com', '081233334444', '$2y$10$dummyhashandi'),
(4, 3, 'Rina Kasir', 'rina@kopijago.id', '081255556666', '$2y$10$dummyhashrina');

INSERT INTO notification_preferences (user_id, email_enabled, wa_enabled) VALUES
(2, 1, 1), (3, 1, 0);

-- MENU CATEGORIES
INSERT INTO menu_categories (id, name, slug, sort_order) VALUES
(1, 'Kopi Susu', 'kopi-susu', 1),
(2, 'Kopi Hitam', 'kopi-hitam', 2),
(3, 'Non Kopi', 'non-kopi', 3),
(4, 'Cemilan', 'cemilan', 4);

-- MENU ITEMS
INSERT INTO menu_items (id, category_id, name, description, price, is_featured) VALUES
(1, 1, 'Kopi Jago Signature', 'Kopi susu gula aren khas Kopi Jago', 18000, 1),
(2, 1, 'Kopi Susu Vanilla', 'Kopi susu dengan sirup vanilla', 19000, 0),
(3, 2, 'Kopi Hitam Robusta', 'Kopi hitam single origin robusta lokal', 12000, 0),
(4, 2, 'Americano', 'Espresso dengan air panas/dingin', 15000, 0),
(5, 3, 'Matcha Latte', 'Matcha premium dengan susu segar', 20000, 0),
(6, 3, 'Chocolate Latte', 'Coklat premium dengan susu segar', 20000, 0),
(7, 4, 'Roti Bakar Coklat Keju', 'Roti bakar isi coklat dan keju parut', 15000, 1),
(8, 4, 'Pisang Goreng Crispy', 'Pisang goreng crispy dengan topping madu', 13000, 0);

-- INVENTORY: suppliers & ingredients
INSERT INTO suppliers (id, name, contact_person, phone) VALUES
(1, 'CV Kopi Nusantara', 'Pak Herman', '081298761234'),
(2, 'Toko Susu Segar Jaya', 'Bu Wati', '081387654321');

INSERT INTO ingredients (id, supplier_id, name, unit, stock_qty, min_stock, price_per_unit) VALUES
(1, 1, 'Biji Kopi Robusta', 'kg', 25.00, 5.00, 90000),
(2, 2, 'Susu UHT Full Cream', 'liter', 40.00, 10.00, 18000),
(3, 1, 'Gula Aren Cair', 'liter', 10.00, 3.00, 35000),
(4, 2, 'Bubuk Matcha', 'kg', 3.00, 1.00, 250000),
(5, 2, 'Roti Tawar', 'pcs', 60.00, 15.00, 2000);

INSERT INTO menu_ingredients (menu_id, ingredient_id, qty_used) VALUES
(1, 1, 0.02), (1, 2, 0.15), (1, 3, 0.03),
(3, 1, 0.02),
(5, 4, 0.02), (5, 2, 0.15),
(7, 5, 2);

-- TABLES (reservasi)
INSERT INTO tables_master (id, table_number, capacity, location) VALUES
(1, 'A1', 2, 'Indoor'),
(2, 'A2', 4, 'Indoor'),
(3, 'B1', 6, 'Outdoor');

-- SHIPPING METHODS
INSERT INTO shipping_methods (id, name, description, base_cost, estimated_time) VALUES
(1, 'Ambil Sendiri', 'Pelanggan ambil langsung di toko', 0, '10-15 menit'),
(2, 'GoSend Instant', 'Pengiriman instan via GoSend', 12000, '20-40 menit'),
(3, 'GrabExpress', 'Pengiriman instan via Grab', 13000, '20-40 menit');

-- PAYMENT METHODS
INSERT INTO payment_methods (id, name, type) VALUES
(1, 'Tunai (Cash)', 'cash'),
(2, 'QRIS', 'qris'),
(3, 'Transfer BCA', 'bank_transfer'),
(4, 'GoPay', 'ewallet');

-- PROMO
INSERT INTO promos (id, code, name, discount_type, discount_value, min_purchase, start_date, end_date, usage_limit) VALUES
(1, 'JAGO10', 'Diskon 10% Pembukaan', 'percentage', 10, 20000, '2026-09-01', '2026-09-30', 100),
(2, 'GRATISONGKIR', 'Gratis Ongkir Min 50rb', 'fixed', 12000, 50000, '2026-09-01', '2026-12-31', NULL);

-- CONTOH TRANSAKSI (order)
INSERT INTO orders (id, order_number, user_id, order_type, status, subtotal, discount_amount, shipping_cost, total_amount, payment_status) VALUES
(1, 'INV-20260901-0001', 2, 'delivery', 'completed', 37000, 3700, 12000, 45300, 'paid'),
(2, 'INV-20260901-0002', 3, 'dine_in', 'completed', 33000, 0, 0, 33000, 'paid');

INSERT INTO order_items (order_id, menu_id, qty, price, subtotal) VALUES
(1, 1, 1, 18000, 18000),
(1, 7, 1, 15000, 15000),
(2, 3, 1, 12000, 12000),
(2, 8, 1, 13000, 13000);

INSERT INTO promo_usages (promo_id, user_id, order_id) VALUES (1, 2, 1);

INSERT INTO order_shipping (order_id, method_id, cost, status) VALUES
(1, 2, 12000, 'delivered');

INSERT INTO payments (order_id, method_id, amount, status, paid_at) VALUES
(1, 4, 45300, 'success', '2026-09-01 10:15:00'),
(2, 1, 33000, 'success', '2026-09-01 11:00:00');

INSERT INTO invoices (order_id, invoice_number, pdf_path) VALUES
(1, 'INV-20260901-0001', '/invoices/INV-20260901-0001.pdf'),
(2, 'INV-20260901-0002', '/invoices/INV-20260901-0002.pdf');

-- RATING
INSERT INTO menu_ratings (menu_id, user_id, order_id, rating, review) VALUES
(1, 2, 1, 5, 'Enak banget, gula arennya pas!'),
(7, 2, 1, 4, 'Roti bakarnya mantap tapi agak kurang manis');

-- ACTIVITY LOG contoh
INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES
(1, 'edit_stok', 'Update stok Biji Kopi Robusta', '192.168.1.10'),
(4, 'update_status_order', 'Update status order INV-20260901-0002 ke completed', '192.168.1.20');
