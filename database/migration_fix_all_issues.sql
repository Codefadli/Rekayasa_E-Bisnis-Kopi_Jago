-- Migration: Fix All User-Reported Issues
-- Date: 2026-10-11
-- Purpose: Add seller info columns, create 4 sellers with sepeda listrik

-- Step 1: Add required columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS vehicle VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline',
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10,8) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11,8) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS outlet_address TEXT,
ADD COLUMN IF NOT EXISTS outlet_hours VARCHAR(100) DEFAULT 'Senin-Minggu 08:00-22:00',
ADD COLUMN IF NOT EXISTS max_delivery_km INT DEFAULT 5;

-- Step 2: Create 4 new sellers with random names and sepeda listrik
INSERT INTO users (role_id, name, email, phone, password_hash, is_active, vehicle, status, latitude, longitude, outlet_address, outlet_hours) VALUES
(3, 'Rizky Firmansyah', 'rizky.outlet@jagocoffee.id', '0812-9876-5431', '$2y$10$dummyhashrizky123456789', 1, 'Sepeda Listrik', 'available', -6.9175, 107.6191, 'Jl. Asia Afrika No. 125, Bandung', 'Senin-Minggu 07:00-22:00'),
(3, 'Dinda Permata', 'dinda.outlet@jagocoffee.id', '0813-7654-3210', '$2y$10$dummyhashdinda123456789', 1, 'Sepeda Listrik', 'available', -6.8957, 107.6133, 'Jl. Ir. H. Djuanda No. 88, Bandung', 'Senin-Minggu 07:00-22:00'),
(3, 'Andi Setiawan', 'andi.outlet@jagocoffee.id', '0821-5544-3322', '$2y$10$dummyhashandi1234567890', 1, 'Sepeda Listrik', 'busy', -6.8912, 107.5977, 'Jl. Surya Sumantri No. 65, Bandung', 'Senin-Minggu 08:00-23:00'),
(3, 'Maya Lestari', 'maya.outlet@jagocoffee.id', '0856-2233-4455', '$2y$10$dummyhashmaya1234567890', 1, 'Sepeda Listrik', 'offline', -6.9024, 107.6186, 'Jl. Buah Batu No. 212, Bandung', 'Senin-Minggu 08:00-22:00')
ON DUPLICATE KEY UPDATE 
    vehicle = VALUES(vehicle),
    status = VALUES(status),
    latitude = VALUES(latitude),
    longitude = VALUES(longitude),
    outlet_address = VALUES(outlet_address),
    phone = VALUES(phone);

-- Step 3: Update existing sellers to have sepeda listrik
UPDATE users 
SET vehicle = 'Sepeda Listrik',
    outlet_hours = 'Senin-Minggu 08:00-22:00',
    max_delivery_km = 5
WHERE role_id = 3 AND vehicle IS NULL;

SELECT 'Migration completed successfully' AS result;
SELECT COUNT(*) AS total_sellers FROM users WHERE role_id = 3;
