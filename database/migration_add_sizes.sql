-- Migration: Add size support for menu items
USE kopi_jago_db;

-- Create menu_sizes table
CREATE TABLE IF NOT EXISTS menu_sizes (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    menu_id INT UNSIGNED NOT NULL,
    size ENUM('small','medium','large') NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    UNIQUE KEY unique_menu_size(menu_id, size),
    FOREIGN KEY(menu_id) REFERENCES menu_items(id) ON DELETE CASCADE
);

-- Add size column to cart_items
ALTER TABLE cart_items 
    DROP PRIMARY KEY,
    ADD COLUMN size ENUM('small','medium','large') NOT NULL DEFAULT 'medium',
    ADD PRIMARY KEY(user_id, menu_id, size);

-- Add size column to order_items
ALTER TABLE order_items 
    DROP PRIMARY KEY,
    ADD COLUMN size ENUM('small','medium','large') NOT NULL DEFAULT 'medium',
    ADD PRIMARY KEY(order_id, menu_id, size);

-- Populate menu_sizes with default data based on existing menu items
INSERT INTO menu_sizes (menu_id, size, price)
SELECT id, 'small', ROUND(price * 0.8, 0) FROM menu_items
UNION ALL
SELECT id, 'medium', price FROM menu_items
UNION ALL
SELECT id, 'large', ROUND(price * 1.3, 0) FROM menu_items;
