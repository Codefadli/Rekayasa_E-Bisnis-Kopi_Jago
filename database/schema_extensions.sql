-- Schema Extensions for Kopi Jago
-- Add missing tables for menu sizes and Jago Party functionality

USE kopi_jago_db;

-- Menu sizes table for product variations
CREATE TABLE IF NOT EXISTS menu_sizes (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    menu_id INT UNSIGNED NOT NULL,
    size ENUM('small', 'medium', 'large') NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_menu_size (menu_id, size),
    FOREIGN KEY (menu_id) REFERENCES menu_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jago Party packages reference table
CREATE TABLE IF NOT EXISTS jago_party_packages (
    id VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    min_cups INT UNSIGNED NOT NULL,
    max_cups INT UNSIGNED NOT NULL,
    base_price DECIMAL(12,2) NOT NULL,
    jagoan_count INT UNSIGNED NOT NULL,
    max_duration_hours DECIMAL(3,1) NOT NULL,
    booking_lead_days INT UNSIGNED NOT NULL DEFAULT 2,
    description TEXT,
    is_active BOOLEAN DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default Jago Party packages
INSERT INTO jago_party_packages (id, name, min_cups, max_cups, base_price, jagoan_count, max_duration_hours, booking_lead_days, description) VALUES
('JP50', 'Paket Kecil', 50, 100, 500000, 1, 1.0, 2, 'Paket untuk 50-100 cup dengan 1 Jagoan/Barista'),
('JP100', 'Paket Sedang', 101, 200, 1000000, 2, 1.5, 2, 'Paket untuk 101-200 cup dengan 2 Jagoan/Barista'),
('JP200', 'Paket Besar', 201, 300, 2000000, 3, 2.0, 2, 'Paket untuk 201-300 cup dengan 3 Jagoan/Barista'),
('JP300', 'Paket Extra', 301, 400, 3000000, 4, 2.5, 3, 'Paket untuk 301-400 cup dengan 4 Jagoan/Barista'),
('JP400', 'Paket Premium', 401, 500, 4000000, 5, 3.0, 3, 'Paket untuk 401-500 cup dengan 5 Jagoan/Barista'),
('JP500', 'Paket Corporate', 501, 9999, 5000000, 5, 3.5, 3, 'Paket untuk 501+ cup dengan 5+ Jagoan/Barista')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Jago Party requests table
CREATE TABLE IF NOT EXISTS jago_party_requests (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    request_number VARCHAR(40) UNIQUE NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    package_id VARCHAR(10) NOT NULL,
    
    -- Event details
    event_name VARCHAR(150) NOT NULL,
    event_type VARCHAR(100),
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    estimated_cups INT UNSIGNED NOT NULL,
    
    -- Location
    event_address TEXT NOT NULL,
    event_latitude DECIMAL(10,7),
    event_longitude DECIMAL(10,7),
    
    -- Contact
    contact_name VARCHAR(100) NOT NULL,
    contact_phone VARCHAR(30) NOT NULL,
    contact_email VARCHAR(150),
    
    -- Pricing snapshot (at request time)
    quoted_price DECIMAL(12,2),
    final_price DECIMAL(12,2),
    
    -- Status
    status ENUM('pending', 'reviewing', 'quoted', 'confirmed', 'paid', 'completed', 'cancelled') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'failed', 'refunded') DEFAULT 'pending',
    
    -- Notes
    customer_notes TEXT,
    admin_notes TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (package_id) REFERENCES jago_party_packages(id),
    INDEX idx_event_date (event_date),
    INDEX idx_status (status),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Jago Party menu selections
CREATE TABLE IF NOT EXISTS jago_party_menu_items (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    request_id INT UNSIGNED NOT NULL,
    menu_id INT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 0,
    notes VARCHAR(255),
    FOREIGN KEY (request_id) REFERENCES jago_party_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_id) REFERENCES menu_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update cart_items to support size selection
ALTER TABLE cart_items 
    ADD COLUMN IF NOT EXISTS size ENUM('small', 'medium', 'large') NOT NULL DEFAULT 'medium' AFTER menu_id,
    DROP PRIMARY KEY,
    ADD PRIMARY KEY (user_id, menu_id, size);

-- Update seller_profiles to support outlet information
ALTER TABLE seller_profiles 
    ADD COLUMN IF NOT EXISTS outlet_name VARCHAR(150) AFTER user_id,
    ADD COLUMN IF NOT EXISTS outlet_address VARCHAR(255) AFTER area,
    ADD COLUMN IF NOT EXISTS outlet_phone VARCHAR(30) AFTER outlet_address,
    ADD COLUMN IF NOT EXISTS outlet_hours VARCHAR(100) AFTER outlet_phone,
    ADD COLUMN IF NOT EXISTS max_delivery_km DECIMAL(5,2) DEFAULT 5.0 AFTER last_longitude,
    ADD COLUMN IF NOT EXISTS delivery_fee_per_km DECIMAL(8,2) DEFAULT 0 AFTER max_delivery_km,
    ADD COLUMN IF NOT EXISTS flat_delivery_fee DECIMAL(10,2) DEFAULT 0 AFTER delivery_fee_per_km;
