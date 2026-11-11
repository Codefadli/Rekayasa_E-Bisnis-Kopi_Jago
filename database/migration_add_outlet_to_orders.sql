-- Migration: Add outlet_id/seller_id to orders table
-- This fixes the critical issue where orders don't track which outlet they belong to
-- SAFE: Can be run multiple times (uses IF NOT EXISTS pattern)

USE kopi_jago_db;

-- Add seller_id column to orders table if it doesn't exist
-- We use seller_id (references users.id where role=seller) instead of vehicle_id
-- because an outlet/seller can have multiple vehicles

ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS seller_id INT UNSIGNED NULL AFTER user_id,
    ADD CONSTRAINT IF NOT EXISTS fk_orders_seller 
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for faster seller order queries
CREATE INDEX IF NOT EXISTS idx_orders_seller ON orders(seller_id);

-- Update existing orders that have vehicle_id to set seller_id
UPDATE orders o
JOIN vehicles v ON v.id = o.vehicle_id
SET o.seller_id = v.seller_id
WHERE o.seller_id IS NULL AND o.vehicle_id IS NOT NULL;

SELECT 'Migration completed: orders now track seller/outlet assignment' AS status;
