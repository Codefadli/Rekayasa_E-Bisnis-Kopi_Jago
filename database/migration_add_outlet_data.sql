-- Migration: Add outlet/location data for pickup & delivery
USE kopi_jago_db;

-- Extend seller_profiles dengan data outlet
ALTER TABLE seller_profiles 
    ADD COLUMN outlet_name VARCHAR(120) DEFAULT NULL AFTER user_id,
    ADD COLUMN outlet_address VARCHAR(255) DEFAULT NULL AFTER outlet_name,
    ADD COLUMN outlet_phone VARCHAR(30) DEFAULT NULL AFTER outlet_address,
    ADD COLUMN outlet_hours VARCHAR(100) DEFAULT NULL AFTER outlet_phone,
    ADD COLUMN max_delivery_km DECIMAL(5,2) DEFAULT 5.0 AFTER last_longitude,
    ADD COLUMN delivery_fee_per_km DECIMAL(10,2) DEFAULT 2000 AFTER max_delivery_km,
    ADD COLUMN flat_delivery_fee DECIMAL(10,2) DEFAULT NULL AFTER delivery_fee_per_km;

-- Update existing sellers dengan data PLACEHOLDER (perlu konfirmasi dengan data asli)
UPDATE seller_profiles SET 
    outlet_name = CONCAT('Outlet Jago ', user_id),
    outlet_address = '[PERLU KONFIRMASI] Alamat outlet belum diisi',
    outlet_phone = '081234567890',
    outlet_hours = 'Senin-Minggu 08:00-22:00',
    last_latitude = -6.9175,  -- Placeholder: Jakarta center
    last_longitude = 107.6191, -- Placeholder: Bandung center
    max_delivery_km = 5.0,
    delivery_fee_per_km = 2000
WHERE outlet_name IS NULL;

-- NOTE: Koordinat dan alamat di atas adalah PLACEHOLDER.
-- Harus diganti dengan data asli outlet Kopi Jago sebelum production.
