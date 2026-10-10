-- Seed Demo Sellers with Outlets
-- Run this to populate demo seller data with photos

-- Update existing sellers with proper outlet data
UPDATE seller_profiles 
SET 
    outlet_name = 'Jago Coffee Senopati',
    outlet_address = 'Jl. Senopati No. 45, Jakarta Selatan',
    outlet_phone = '021-72791234',
    outlet_hours = '08:00-22:00',
    last_latitude = -6.2297,
    last_longitude = 106.8111,
    max_delivery_km = 5.0,
    delivery_fee_per_km = 0,
    flat_delivery_fee = 0,
    status = 'available'
WHERE user_id = 3;

UPDATE seller_profiles 
SET 
    outlet_name = 'Jago Coffee Kemang',
    outlet_address = 'Jl. Kemang Raya No. 88, Jakarta Selatan',
    outlet_phone = '021-71792345',
    outlet_hours = '07:00-23:00',
    last_latitude = -6.2659,
    last_longitude = 106.7837,
    max_delivery_km = 5.0,
    delivery_fee_per_km = 0,
    flat_delivery_fee = 0,
    status = 'available'
WHERE user_id = 4;

UPDATE seller_profiles 
SET 
    outlet_name = 'Jago Coffee Menteng',
    outlet_address = 'Jl. Menteng Raya No. 12, Jakarta Pusat',
    outlet_phone = '021-31903456',
    outlet_hours = '08:00-22:00',
    last_latitude = -6.1951,
    last_longitude = 106.8318,
    max_delivery_km = 5.0,
    delivery_fee_per_km = 0,
    flat_delivery_fee = 0,
    status = 'available'
WHERE user_id = 9;

-- Verify outlets
SELECT 
    sp.user_id,
    u.name as seller_name,
    sp.outlet_name,
    sp.outlet_address,
    sp.status,
    sp.last_latitude,
    sp.last_longitude
FROM seller_profiles sp
JOIN users u ON u.id = sp.user_id
ORDER BY sp.user_id;
