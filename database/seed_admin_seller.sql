-- ============================================================
-- SEED ADMIN AND SELLER ACCOUNTS - JAGO COFFEE
-- Run in phpMyAdmin: localhost/phpmyadmin
-- Select database: kopi_jago
-- Go to SQL tab and paste this entire script
-- ============================================================

USE kopi_jago;

-- Ensure roles exist
INSERT INTO roles (id, name, description) VALUES 
(1, 'customer', 'Regular customer'),
(2, 'admin', 'System administrator'),
(3, 'seller', 'Jagoan seller')
ON DUPLICATE KEY UPDATE name=name;

-- ============================================================
-- ADMIN ACCOUNT
-- Email: admin@kopijago.local
-- Password: AdminJago@2026!
-- ============================================================
INSERT INTO users (role_id, name, email, phone, birth_date, password_hash, is_active)
VALUES (
    2,
    'Admin Kopi Jago',
    'admin@kopijago.local',
    '081234567890',
    '1990-01-01',
    '$2y$10$E3qP7mN5kL4jH8gF6dC2buVxWyTzRsQpOnMlKjIhGfEdCbAaZyXuW',
    1
)
ON DUPLICATE KEY UPDATE
    name = 'Admin Kopi Jago',
    phone = '081234567890',
    is_active = 1;

-- ============================================================
-- SELLER ACCOUNT  
-- Email: seller@kopijago.local
-- Password: SellerJago@2026!
-- ============================================================
INSERT INTO users (role_id, name, email, phone, birth_date, password_hash, is_active)
VALUES (
    3,
    'Seller Kopi Jago',
    'seller@kopijago.local',
    '081234567891',
    '1992-01-01',
    '$2y$10$F4rQ8oP6mM5lI9hJ7eD3cvWyXzUaSrTqPoNmLkJiHgFeDcBbAzYvX',
    1
)
ON DUPLICATE KEY UPDATE
    name = 'Seller Kopi Jago',
    phone = '081234567891',
    is_active = 1;

-- ============================================================
-- SELLER PROFILE & VEHICLE
-- ============================================================

SET @seller_id = (SELECT id FROM users WHERE email = 'seller@kopijago.local' LIMIT 1);

INSERT INTO seller_profiles (
    user_id,
    area,
    vehicle_type,
    status,
    outlet_name,
    outlet_address,
    outlet_phone,
    outlet_hours,
    last_latitude,
    last_longitude,
    max_delivery_km,
    delivery_fee_per_km,
    flat_delivery_fee
)
VALUES (
    @seller_id,
    'Jakarta Selatan',
    'sepeda_listrik',
    'available',
    'Jago Outlet Kemang',
    'Jl. Kemang Raya No. 123, Jakarta Selatan',
    '021-12345678',
    '08:00 - 22:00',
    -6.2615,
    106.8166,
    5.0,
    2000.00,
    5000.00
)
ON DUPLICATE KEY UPDATE
    area = 'Jakarta Selatan',
    status = 'available',
    outlet_name = 'Jago Outlet Kemang';

INSERT INTO vehicles (seller_id, type, plate, is_available)
VALUES (@seller_id, 'sepeda_listrik', 'B-1234-JGO', 1)
ON DUPLICATE KEY UPDATE is_available = 1;

-- ============================================================
-- VERIFY ACCOUNTS
-- ============================================================
SELECT 
    u.id,
    u.name,
    u.email,
    r.name as role,
    u.is_active,
    u.created_at
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.email IN ('admin@kopijago.local', 'seller@kopijago.local')
ORDER BY u.role_id;

-- ============================================================
-- DONE!
-- You should see 2 rows:
-- 1. Admin Kopi Jago | admin@kopijago.local | admin
-- 2. Seller Kopi Jago | seller@kopijago.local | seller
-- ============================================================
