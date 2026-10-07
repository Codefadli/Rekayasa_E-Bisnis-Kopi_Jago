USE kopi_jago_db;

CREATE TABLE IF NOT EXISTS suppliers (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  contact_name VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(150),
  address VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  menu_id INT UNSIGNED NOT NULL,
  supplier_id INT UNSIGNED NULL,
  type ENUM('in','out','adjust','order','order_cancel') NOT NULL,
  qty INT NOT NULL,
  stock_after INT UNSIGNED NOT NULL,
  note VARCHAR(255),
  admin_id INT UNSIGNED NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_menu (menu_id),
  FOREIGN KEY(menu_id) REFERENCES menu_items(id) ON DELETE CASCADE,
  FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY(admin_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  table_no SMALLINT UNSIGNED NULL,
  guests TINYINT UNSIGNED NOT NULL,
  reserved_at DATETIME NOT NULL,
  status ENUM('pending','confirmed','rejected','cancelled','completed') NOT NULL DEFAULT 'pending',
  notes VARCHAR(255),
  admin_note VARCHAR(255),
  handled_by INT UNSIGNED NULL,
  handled_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_status_time (status, reserved_at),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(handled_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  admin_id INT UNSIGNED NULL,
  action VARCHAR(40) NOT NULL,
  entity VARCHAR(40) NOT NULL,
  entity_id INT UNSIGNED NULL,
  detail JSON NULL,
  ip VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_entity (entity, entity_id),
  INDEX idx_created (created_at),
  FOREIGN KEY(admin_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS store_settings (
  k VARCHAR(50) PRIMARY KEY,
  v TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT IGNORE INTO store_settings(k,v) VALUES
('store_name','Kopi Jago'),
('store_address','Bandung'),
('store_phone','0800000000'),
('open_time','08:00'),
('close_time','22:00'),
('is_open','1'),
('delivery_fee','5000'),
('tax_percent','0'),
('low_stock_threshold','10'),
('reservation_slot_minutes','120');

INSERT IGNORE INTO suppliers(id,name,contact_name,phone,email,address) VALUES
(1,'Tani Arabika Lembang','Pak Dedi','081300000001','dedi@taniarabika.id','Lembang, Bandung'),
(2,'Susu Segar Pangalengan','Bu Rini','081300000002','rini@susupangalengan.id','Pangalengan, Bandung');
