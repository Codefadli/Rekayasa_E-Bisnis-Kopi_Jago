-- Update pricing to match website (8k-12k entry point)
-- Run this after initial seed.sql

USE kopi_jago_db;

-- Update menu items pricing (website reference: 8k-12k range)
UPDATE menu_items SET price = 8000 WHERE name = 'Kopi Jago Signature';
UPDATE menu_items SET price = 8000 WHERE name = 'Kopi Susu Vanilla';
UPDATE menu_items SET price = 8000 WHERE name = 'Americano';
UPDATE menu_items SET price = 12000 WHERE name = 'Chocolate Latte';
UPDATE menu_items SET price = 12000 WHERE name = 'Pink Coco';
UPDATE menu_items SET price = 15000 WHERE name = 'Mont Blanc Shake';
UPDATE menu_items SET price = 12000 WHERE name = 'Matcha Latte';
UPDATE menu_items SET price = 10000 WHERE name = 'Citrus Cold Brew';

-- Recalculate menu_sizes based on new base prices
-- Small: base * 0.8, Medium: base, Large: base * 1.3
UPDATE menu_sizes ms
JOIN menu_items m ON m.id = ms.menu_id
SET ms.price = CASE
    WHEN ms.size = 'small' THEN ROUND(m.price * 0.8, 0)
    WHEN ms.size = 'medium' THEN m.price
    WHEN ms.size = 'large' THEN ROUND(m.price * 1.3, 0)
END;

-- Verify results
SELECT m.name, m.price as base_price, ms.size, ms.price as size_price
FROM menu_items m
LEFT JOIN menu_sizes ms ON ms.menu_id = m.id
ORDER BY m.id, FIELD(ms.size, 'small', 'medium', 'large');
