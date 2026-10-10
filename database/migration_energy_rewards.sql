-- Energy/Rewards System Migration
USE kopi_jago_db;

-- Table: energy_transactions (transaction history)
CREATE TABLE IF NOT EXISTS energy_transactions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    transaction_type ENUM('earn','redeem','admin_adjustment') NOT NULL,
    amount INT NOT NULL, -- Energy points (positive for earn, negative for redeem)
    source_type ENUM('order','qr_scan','reward_redemption','admin') NOT NULL,
    source_id INT UNSIGNED NULL, -- order_id or reward_id reference
    description VARCHAR(255),
    balance_after INT NOT NULL, -- Balance snapshot after transaction
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_created (user_id, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: energy_rewards (rewards catalog)
CREATE TABLE IF NOT EXISTS energy_rewards (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    description TEXT,
    energy_cost INT UNSIGNED NOT NULL, -- Points required to redeem
    reward_type ENUM('free_drink','discount','merchandise','voucher') NOT NULL,
    reward_value DECIMAL(12,2) NULL, -- For discount/voucher (e.g., 10000 = Rp 10k off)
    menu_id INT UNSIGNED NULL, -- For free_drink type
    stock INT UNSIGNED DEFAULT NULL, -- NULL = unlimited
    is_active BOOLEAN DEFAULT 1,
    image_url VARCHAR(255) NULL,
    terms TEXT NULL, -- Terms & conditions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY(menu_id) REFERENCES menu_items(id) ON DELETE SET NULL,
    INDEX idx_active_cost (is_active, energy_cost)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: energy_redemptions (user reward claims)
CREATE TABLE IF NOT EXISTS energy_redemptions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    reward_id INT UNSIGNED NOT NULL,
    energy_cost INT NOT NULL, -- Snapshot of cost at redemption time
    status ENUM('pending','approved','claimed','expired','cancelled') DEFAULT 'pending',
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    claimed_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    notes VARCHAR(255) NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(reward_id) REFERENCES energy_rewards(id),
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: qr_tokens (for QR scan validation)
CREATE TABLE IF NOT EXISTS qr_tokens (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    token CHAR(64) UNIQUE NOT NULL, -- SHA256 hash of random token
    seller_id INT UNSIGNED NOT NULL, -- Jagoan who generates QR
    energy_amount INT UNSIGNED NOT NULL DEFAULT 10, -- Points to award
    scan_limit INT UNSIGNED DEFAULT 1, -- How many times can be scanned
    scan_count INT UNSIGNED DEFAULT 0,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(seller_id) REFERENCES users(id),
    INDEX idx_token (token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table: qr_scans (scan history)
CREATE TABLE IF NOT EXISTS qr_scans (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    qr_token_id BIGINT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    energy_awarded INT NOT NULL,
    scanned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(qr_token_id) REFERENCES qr_tokens(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_token (user_id, qr_token_id), -- Prevent double scan
    INDEX idx_user_scanned (user_id, scanned_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default rewards (sample data)
INSERT INTO energy_rewards (name, description, energy_cost, reward_type, reward_value, is_active) VALUES
('Diskon Rp 5.000', 'Potongan harga Rp 5.000 untuk pembelian berikutnya', 50, 'discount', 5000, 1),
('Diskon Rp 10.000', 'Potongan harga Rp 10.000 untuk pembelian berikutnya', 100, 'discount', 10000, 1),
('Free Americano', 'Gratis 1 cup Americano (Medium)', 150, 'free_drink', NULL, 1),
('Free Kopi Susu Jago', 'Gratis 1 cup Kopi Susu Jago (Medium)', 200, 'free_drink', NULL, 1),
('Tumbler Jago Coffee', 'Tumbler eksklusif Jago Coffee 500ml', 500, 'merchandise', NULL, 1),
('T-Shirt Jago Coffee', 'Kaos eksklusif Jago Coffee (Size M/L/XL)', 800, 'merchandise', NULL, 1);

-- Update free_drink rewards dengan menu_id (after menu seeded)
UPDATE energy_rewards SET menu_id = (SELECT id FROM menu_items WHERE name = 'Americano' LIMIT 1) WHERE name = 'Free Americano';
UPDATE energy_rewards SET menu_id = (SELECT id FROM menu_items WHERE name = 'Kopi Jago Signature' LIMIT 1) WHERE name = 'Free Kopi Susu Jago';

-- Function: Get user energy balance (computed from transactions)
DELIMITER $$
CREATE FUNCTION IF NOT EXISTS get_energy_balance(p_user_id INT UNSIGNED)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_balance INT DEFAULT 0;
    
    SELECT COALESCE(SUM(amount), 0) INTO v_balance
    FROM energy_transactions
    WHERE user_id = p_user_id;
    
    RETURN v_balance;
END$$
DELIMITER ;

-- Trigger: Auto-award Energy after order completion
DELIMITER $$
CREATE TRIGGER IF NOT EXISTS award_energy_after_order
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    DECLARE v_energy_amount INT;
    DECLARE v_current_balance INT;
    
    -- Award energy only when order status changes to 'completed' (from any other status)
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        -- Energy formula: 1 point per Rp 1000 spent (minimum 10 points)
        SET v_energy_amount = GREATEST(FLOOR(NEW.total_amount / 1000), 10);
        
        -- Get current balance
        SET v_current_balance = get_energy_balance(NEW.user_id);
        
        -- Insert transaction
        INSERT INTO energy_transactions (user_id, transaction_type, amount, source_type, source_id, description, balance_after)
        VALUES (
            NEW.user_id,
            'earn',
            v_energy_amount,
            'order',
            NEW.id,
            CONCAT('Order #', NEW.order_number, ' completed'),
            v_current_balance + v_energy_amount
        );
        
        -- Send notification
        INSERT INTO notifications (user_id, title, message)
        VALUES (
            NEW.user_id,
            'Energy Earned!',
            CONCAT('Kamu dapat ', v_energy_amount, ' Energy points dari order #', NEW.order_number)
        );
    END IF;
END$$
DELIMITER ;

-- Verify installation
SELECT 'Energy/Rewards tables created successfully!' as status;
SELECT TABLE_NAME FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'kopi_jago_db' 
AND TABLE_NAME IN ('energy_transactions', 'energy_rewards', 'energy_redemptions', 'qr_tokens', 'qr_scans');
