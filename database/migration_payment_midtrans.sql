-- Payment Integration Migration
USE kopi_jago_db;

-- Table: payment_transactions (detailed payment records)
CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    order_id INT UNSIGNED NOT NULL,
    transaction_id VARCHAR(100) UNIQUE NOT NULL, -- Midtrans transaction_id
    payment_method VARCHAR(50) NOT NULL, -- gopay, qris, bank_transfer, etc
    payment_type VARCHAR(50) NULL, -- Midtrans payment_type
    bank VARCHAR(50) NULL, -- For bank_transfer
    gross_amount DECIMAL(12,2) NOT NULL,
    transaction_status VARCHAR(50) NOT NULL, -- pending, settlement, capture, deny, cancel, expire
    fraud_status VARCHAR(50) NULL,
    va_numbers TEXT NULL, -- JSON array for VA numbers
    bill_key VARCHAR(100) NULL,
    biller_code VARCHAR(100) NULL,
    qr_string TEXT NULL,
    deeplink_redirect VARCHAR(500) NULL,
    transaction_time DATETIME NULL,
    settlement_time DATETIME NULL,
    expiry_time DATETIME NULL,
    signature_key VARCHAR(255) NULL,
    raw_response TEXT NULL, -- Full Midtrans response for debugging
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order (order_id),
    INDEX idx_transaction_status (transaction_id, transaction_status),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: payment_notifications (webhook log)
CREATE TABLE IF NOT EXISTS payment_notifications (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    transaction_id VARCHAR(100) NOT NULL,
    order_id VARCHAR(100) NOT NULL,
    payment_type VARCHAR(50) NULL,
    transaction_status VARCHAR(50) NOT NULL,
    fraud_status VARCHAR(50) NULL,
    status_code VARCHAR(10) NULL,
    gross_amount DECIMAL(12,2) NULL,
    signature_key VARCHAR(255) NULL,
    is_valid BOOLEAN DEFAULT 0,
    raw_notification TEXT NOT NULL,
    processed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transaction (transaction_id),
    INDEX idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add Midtrans config table (optional - untuk dynamic config)
CREATE TABLE IF NOT EXISTS payment_config (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default config (PLACEHOLDER - ganti dengan real credentials)
INSERT INTO payment_config (config_key, config_value, is_active) VALUES
('midtrans_server_key', 'SB-Mid-server-YOUR_SERVER_KEY_HERE', 1),
('midtrans_client_key', 'SB-Mid-client-YOUR_CLIENT_KEY_HERE', 1),
('midtrans_is_production', '0', 1), -- 0 = sandbox, 1 = production
('midtrans_enabled_payments', 'gopay,qris,bank_transfer,shopeepay,cstore', 1),
('payment_expiry_duration', '24', 1), -- hours
('payment_expiry_unit', 'hour', 1);

-- Verify installation
SELECT 'Payment tables created successfully!' as status;
SELECT TABLE_NAME FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'kopi_jago_db' 
AND TABLE_NAME IN ('payment_transactions', 'payment_notifications', 'payment_config');

-- Show config
SELECT * FROM payment_config;
