USE kopi_jago_db;
INSERT IGNORE INTO roles(id,name,description) VALUES (1,'customer','Pembeli'),(2,'admin','Pengelola platform'),(3,'seller','Mitra pengantar');
-- Password demo untuk semua akun: password
INSERT IGNORE INTO users(id,role_id,name,email,phone,password_hash) VALUES
(1,2,'Admin Kopi Jago','admin@kopijago.id','0800000000','$2y$10$ioktShRFdtvmxZ7z09ZyjeqRPGmhOtcWPr1/UDTdC/XweQx7gjiZG'),
(2,1,'Siti Aminah','siti@example.com','081211112222','$2y$10$ioktShRFdtvmxZ7z09ZyjeqRPGmhOtcWPr1/UDTdC/XweQx7gjiZG'),
(3,3,'Budi Seller','seller@example.com','081233334444','$2y$10$ioktShRFdtvmxZ7z09ZyjeqRPGmhOtcWPr1/UDTdC/XweQx7gjiZG'),
(4,3,'Ayu Jagoan','seller.electric@example.com','081255556666','$2y$10$ioktShRFdtvmxZ7z09ZyjeqRPGmhOtcWPr1/UDTdC/XweQx7gjiZG');
INSERT IGNORE INTO vehicles(seller_id,type,plate) VALUES (3,'sepeda','JAGO-01'),(4,'sepeda_listrik','JAGO-02');
INSERT IGNORE INTO seller_profiles(user_id,area,status,vehicle_type) VALUES (3,'Kota Bandung','available','sepeda'),(4,'Kota Bandung','available','sepeda_listrik');
INSERT IGNORE INTO menu_categories(id,name,slug) VALUES (1,'Kopi Susu','kopi-susu'),(2,'Kopi Hitam','kopi-hitam'),(3,'Non Kopi','non-kopi');
INSERT IGNORE INTO menu_items(category_id,name,description,price,is_featured) VALUES
(1,'Kopi Jago Signature','Kopi susu gula aren khas Kopi Jago',18000,1),(1,'Kopi Susu Vanilla','Kopi susu vanilla',19000,0),(2,'Americano','Espresso dan air',15000,0),(3,'Chocolate Latte','Cokelat dan susu',20000,1);
INSERT IGNORE INTO inventory_stock(menu_id,stock) SELECT id,100 FROM menu_items;
INSERT IGNORE INTO promos(code,name,discount_type,discount_value,min_purchase,start_date,end_date) VALUES ('JAGO10','Diskon 10%','percentage',10,20000,'2026-01-01','2026-12-31');
