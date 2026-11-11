-- Migration: Add Jago Party Feature Tables
-- This implements the party event ordering feature
-- SAFE: Uses IF NOT EXISTS, can be run multiple times

USE kopi_jago_db;

-- Create jago_party_packages table
CREATE TABLE IF NOT EXISTS jago_party_packages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    min_cups INT UNSIGNED NOT NULL DEFAULT 50,
    max_cups INT UNSIGNED,
    price_per_cup DECIMAL(10,2) NOT NULL,
    includes TEXT COMMENT 'JSON or comma-separated list of included items',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create jago_party_orders table
CREATE TABLE IF NOT EXISTS jago_party_orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    package_id INT UNSIGNED,
    event_name VARCHAR(200) NOT NULL,
    event_date DATE NOT NULL,
    event_time TIME,
    event_location TEXT NOT NULL,
    num_cups INT UNSIGNED NOT NULL,
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    contact_email VARCHAR(100),
    special_requests TEXT,
    status ENUM('pending', 'reviewed', 'quoted', 'confirmed', 'cancelled', 'completed') NOT NULL DEFAULT 'pending',
    quoted_price DECIMAL(12,2),
    final_price DECIMAL(12,2),
    admin_notes TEXT,
    reviewed_by INT UNSIGNED COMMENT 'Admin user ID who reviewed',
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES jago_party_packages(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_status (status),
    INDEX idx_event_date (event_date),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default packages
INSERT INTO jago_party_packages (name, description, min_cups, max_cups, price_per_cup, includes, is_active) VALUES
('Basic Party Package', 'Perfect for small gatherings and casual events', 50, 100, 15000, 'Kopi Jago Signature,Paper cups,Sugar & creamer', 1),
('Premium Party Package', 'Ideal for corporate events and special occasions', 100, 200, 18000, 'Choice of 3 menu items,Premium cups,Sugar & creamer,Ice,Custom labels available', 1),
('Deluxe Party Package', 'Our complete party solution with full service', 200, NULL, 22000, 'Full menu selection,Premium cups & lids,Sugar & creamer,Ice,Custom labels,Dedicated barista for 4 hours,Setup & cleanup', 1)
ON DUPLICATE KEY UPDATE updated_at=CURRENT_TIMESTAMP;

SELECT 'Jago Party tables created successfully' AS status;
