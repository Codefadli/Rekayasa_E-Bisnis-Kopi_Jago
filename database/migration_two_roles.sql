-- KOPİ JAGO TWO ROLE DATABASE SCHEMA
-- Versi: 2.0 (Two Role Architecture)
-- Date: 12 November 2026

USE kopi_jago_db;

-- Hapus tabel lama
SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS users;
SET FOREIGN_KEY_CHECKS=1;

CREATE TABLE users (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    role_id TINYINT UNSIGNED NOT NULL DEFAULT 1,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(30),
    birth_date DATE NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Perbarui roles table
-- (MariaDB tidak mendukung ADD COLUMN IF NOT EXISTS, jadi gunakan pragmatik per kolom)
DESCRIBE roles;
UPDATE roles SET name='customer' WHERE id=1;
UPDATE roles SET name='admin' WHERE id=2;
DELETE FROM roles WHERE id=3;

-- Insert default roles
INSERT INTO roles (id, name, description) VALUES
(1, 'customer', 'Pembeli'),
(2, 'admin', 'Pengelola platform')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Reset semua user ke role customer (hapus seller)
UPDATE users SET role_id=1 WHERE role_id=3;
DELETE FROM seller_profiles;
DELETE FROM vehicles;
DELETE FROM order_assignment_audit;
DELETE FROM order_location_history;
DELETE FROM delivery_eta_log;

-- Perbaiki struktur cart_items untuk size
ALTER TABLE cart_items 
    ADD COLUMN IF NOT EXISTS size ENUM('small','medium','large') NOT NULL DEFAULT 'medium' AFTER menu_id,
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (user_id, menu_id, size);

-- Verifikasi roles dan user
SELECT * FROM roles;
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS admin_users FROM users WHERE role_id=2;
SELECT COUNT(*) AS customer_users FROM users WHERE role_id=1;

-- Simpan status
SELECT 'Migration complete: Two role architecture (customer + admin only)' AS status;
