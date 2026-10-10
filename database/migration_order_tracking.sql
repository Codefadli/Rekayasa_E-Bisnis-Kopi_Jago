-- Order Tracking Enhancement Migration
USE kopi_jago_db;

-- Add tracking fields to orders table
ALTER TABLE orders
ADD COLUMN estimated_delivery_time DATETIME NULL AFTER updated_at,
ADD COLUMN actual_delivery_time DATETIME NULL AFTER estimated_delivery_time,
ADD COLUMN pickup_time DATETIME NULL AFTER actual_delivery_time,
ADD COLUMN delivery_started_at DATETIME NULL AFTER pickup_time;

-- Table: order_location_history (seller GPS tracking)
CREATE TABLE IF NOT EXISTS order_location_history (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id INT UNSIGNED NOT NULL,
    seller_id INT UNSIGNED NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    speed DECIMAL(5,2) NULL, -- km/h
    accuracy DECIMAL(8,2) NULL, -- meters
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY(seller_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_order_recorded (order_id, recorded_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: delivery_eta_log (ETA calculation history)
CREATE TABLE IF NOT EXISTS delivery_eta_log (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id INT UNSIGNED NOT NULL,
    distance_km DECIMAL(8,3) NOT NULL,
    estimated_minutes INT NOT NULL,
    calculation_method VARCHAR(50) NOT NULL, -- 'haversine', 'google_maps', 'manual'
    seller_latitude DECIMAL(10,7) NOT NULL,
    seller_longitude DECIMAL(10,7) NOT NULL,
    customer_latitude DECIMAL(10,7) NOT NULL,
    customer_longitude DECIMAL(10,7) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_created (order_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add delivery address coordinates to addresses table (if not exists)
ALTER TABLE addresses
ADD COLUMN latitude DECIMAL(10,7) NULL AFTER postal_code,
ADD COLUMN longitude DECIMAL(10,7) NULL AFTER latitude;

-- Create index for faster location queries
CREATE INDEX idx_seller_location ON seller_profiles(last_latitude, last_longitude);

-- Verify installation
SELECT 'Order tracking tables created successfully!' as status;
SELECT TABLE_NAME FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'kopi_jago_db' 
AND TABLE_NAME IN ('order_location_history', 'delivery_eta_log');

-- Show new columns
DESCRIBE orders;
DESCRIBE addresses;
