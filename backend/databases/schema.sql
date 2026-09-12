-- =====================================================================
-- DATABASE: kopi_jago_db
-- Rekayasa E-Bisnis UMKM "Kopi Jago"
-- Disusun mengikuti struktur folder backend/api yang sudah ada
-- Engine: MySQL 8.0+ / MariaDB 10.5+
-- =====================================================================

CREATE DATABASE IF NOT EXISTS kopi_jago_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE kopi_jago_db;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================================
-- MODUL: auth & users
-- =====================================================================

CREATE TABLE roles (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(30) NOT NULL UNIQUE,       -- customer, admin, kasir, dapur
    description VARCHAR(150) NULL
) ENGINE=InnoDB;

CREATE TABLE users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id         INT UNSIGNED NOT NULL DEFAULT 1,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) NOT NULL UNIQUE,
    phone           VARCHAR(20) NULL,
    password_hash   VARCHAR(255) NOT NULL,
    avatar          VARCHAR(255) NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1,
    email_verified_at DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE password_resets (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    token       VARCHAR(100) NOT NULL,
    channel     ENUM('email','wa') NOT NULL DEFAULT 'email',
    expires_at  DATETIME NOT NULL,
    used_at     DATETIME NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE auth_sessions (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    token       VARCHAR(255) NOT NULL UNIQUE,      -- JWT / session token
    ip_address  VARCHAR(45) NULL,
    user_agent  VARCHAR(255) NULL,
    expires_at  DATETIME NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- MODUL: wishlist
-- =====================================================================

CREATE TABLE wishlists (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    menu_id     INT UNSIGNED NOT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_wishlist (user_id, menu_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- MODUL: notifications
-- =====================================================================

CREATE TABLE notification_preferences (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL UNIQUE,
    email_enabled   TINYINT(1) NOT NULL DEFAULT 1,
    wa_enabled      TINYINT(1) NOT NULL DEFAULT 1,
    promo_enabled   TINYINT(1) NOT NULL DEFAULT 1,
    order_update_enabled TINYINT(1) NOT NULL DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE notifications (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    type        VARCHAR(50) NOT NULL,              -- order_status, promo, reservation, system
    channel     ENUM('email','wa','push') NOT NULL DEFAULT 'email',
    title       VARCHAR(150) NOT NULL,
    message     TEXT NOT NULL,
    status      ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
    sent_at     DATETIME NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- MODUL: menu
-- =====================================================================

CREATE TABLE menu_categories (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(80) NOT NULL,              -- Kopi, Non Kopi, Makanan, Cemilan
    slug        VARCHAR(80) NOT NULL UNIQUE,
    sort_order  INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE menu_items (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id     INT UNSIGNED NOT NULL,
    name            VARCHAR(120) NOT NULL,
    description     TEXT NULL,
    price           DECIMAL(10,2) NOT NULL,
    image           VARCHAR(255) NULL,
    is_available    TINYINT(1) NOT NULL DEFAULT 1,
    is_featured     TINYINT(1) NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES menu_categories(id)
) ENGINE=InnoDB;

CREATE TABLE menu_ratings (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    menu_id     INT UNSIGNED NOT NULL,
    user_id     INT UNSIGNED NOT NULL,
    order_id    INT UNSIGNED NULL,
    rating      TINYINT UNSIGNED NOT NULL,         -- 1-5
    review      TEXT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (menu_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- =====================================================================
-- MODUL: reservation
-- =====================================================================

CREATE TABLE tables_master (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_number    VARCHAR(10) NOT NULL UNIQUE,
    capacity        TINYINT UNSIGNED NOT NULL DEFAULT 4,
    location        VARCHAR(50) NULL,              -- indoor, outdoor, lantai 2
    status          ENUM('available','reserved','maintenance') NOT NULL DEFAULT 'available'
) ENGINE=InnoDB;

CREATE TABLE reservations (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    table_id        INT UNSIGNED NOT NULL,
    reservation_date DATE NOT NULL,
    reservation_time TIME NOT NULL,
    guest_count     TINYINT UNSIGNED NOT NULL DEFAULT 1,
    status          ENUM('pending','confirmed','cancelled','completed','no_show') NOT NULL DEFAULT 'pending',
    notes           VARCHAR(255) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES tables_master(id)
) ENGINE=InnoDB;

-- =====================================================================
-- MODUL: orders
-- =====================================================================

CREATE TABLE orders (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_number    VARCHAR(30) NOT NULL UNIQUE,
    user_id         INT UNSIGNED NOT NULL,
    order_type      ENUM('dine_in','delivery','pickup') NOT NULL DEFAULT 'dine_in',
    reservation_id  INT UNSIGNED NULL,
    status          ENUM('pending','confirmed','processing','ready','on_delivery','completed','cancelled') NOT NULL DEFAULT 'pending',
    subtotal        DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    shipping_cost   DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0,
    payment_status  ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
    notes           VARCHAR(255) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reservation_id) REFERENCES reservations(id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id    INT UNSIGNED NOT NULL,
    menu_id     INT UNSIGNED NOT NULL,
    qty         SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    price       DECIMAL(10,2) NOT NULL,            -- harga saat transaksi (snapshot)
    subtotal    DECIMAL(12,2) NOT NULL,
    notes       VARCHAR(150) NULL,                 -- less sugar, extra shot, dll
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_id) REFERENCES menu_items(id)
) ENGINE=InnoDB;

CREATE TABLE order_status_logs (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id    INT UNSIGNED NOT NULL,
    status      VARCHAR(30) NOT NULL,
    changed_by  INT UNSIGNED NULL,                 -- user_id admin/kasir
    note        VARCHAR(255) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- MODUL: shipping
-- =====================================================================

CREATE TABLE addresses (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED NOT NULL,
    label           VARCHAR(50) NULL,              -- Rumah, Kantor
    recipient_name  VARCHAR(100) NOT NULL,
    phone           VARCHAR(20) NOT NULL,
    address_line    VARCHAR(255) NOT NULL,
    city            VARCHAR(80) NOT NULL,
    province        VARCHAR(80) NOT NULL,
    postal_code     VARCHAR(10) NULL,
    is_default      TINYINT(1) NOT NULL DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE shipping_methods (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(60) NOT NULL,          -- GoSend, GrabExpress, Ambil Sendiri
    description     VARCHAR(150) NULL,
    base_cost       DECIMAL(10,2) NOT NULL DEFAULT 0,
    estimated_time  VARCHAR(50) NULL,              -- "15-30 menit"
    is_active       TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE order_shipping (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        INT UNSIGNED NOT NULL UNIQUE,
    address_id      INT UNSIGNED NULL,
    method_id       INT UNSIGNED NOT NULL,
    cost            DECIMAL(10,2) NOT NULL DEFAULT 0,
    tracking_number VARCHAR(60) NULL,
    status          ENUM('pending','picked_up','on_the_way','delivered','failed') NOT NULL DEFAULT 'pending',
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (address_id) REFERENCES addresses(id),
    FOREIGN KEY (method_id) REFERENCES shipping_methods(id)
) ENGINE=InnoDB;

-- =====================================================================
-- MODUL: payment & invoice
-- =====================================================================

CREATE TABLE payment_methods (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(60) NOT NULL,              -- QRIS, Transfer BCA, Cash, GoPay
    type        ENUM('cash','ewallet','bank_transfer','qris') NOT NULL,
    is_active   TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE payments (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        INT UNSIGNED NOT NULL,
    method_id       INT UNSIGNED NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    status          ENUM('pending','success','failed','expired') NOT NULL DEFAULT 'pending',
    transaction_id  VARCHAR(100) NULL,             -- referensi dari payment gateway
    paid_at         DATETIME NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (method_id) REFERENCES payment_methods(id)
) ENGINE=InnoDB;

CREATE TABLE invoices (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id        INT UNSIGNED NOT NULL UNIQUE,
    invoice_number  VARCHAR(40) NOT NULL UNIQUE,
    issued_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pdf_path        VARCHAR(255) NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- MODUL: inventory (stok bahan baku & supplier)
-- =====================================================================

CREATE TABLE suppliers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(120) NOT NULL,
    contact_person  VARCHAR(100) NULL,
    phone           VARCHAR(20) NULL,
    email           VARCHAR(150) NULL,
    address         VARCHAR(255) NULL,
    is_active       TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE ingredients (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    supplier_id     INT UNSIGNED NULL,
    name            VARCHAR(100) NOT NULL,         -- Biji Kopi Robusta, Susu UHT, Gula Aren
    unit            VARCHAR(20) NOT NULL,          -- kg, liter, pcs
    stock_qty       DECIMAL(10,2) NOT NULL DEFAULT 0,
    min_stock       DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_per_unit  DECIMAL(10,2) NOT NULL DEFAULT 0,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
) ENGINE=InnoDB;

CREATE TABLE menu_ingredients (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    menu_id         INT UNSIGNED NOT NULL,
    ingredient_id   INT UNSIGNED NOT NULL,
    qty_used        DECIMAL(10,2) NOT NULL,        -- takaran per 1 porsi menu
    UNIQUE KEY uq_menu_ingredient (menu_id, ingredient_id),
    FOREIGN KEY (menu_id) REFERENCES menu_items(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
) ENGINE=InnoDB;

CREATE TABLE stock_movements (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ingredient_id   INT UNSIGNED NOT NULL,
    type            ENUM('in','out','adjustment') NOT NULL,
    qty             DECIMAL(10,2) NOT NULL,
    reference_type  VARCHAR(30) NULL,              -- purchase, order, opname
    reference_id    INT UNSIGNED NULL,
    note            VARCHAR(255) NULL,
    created_by      INT UNSIGNED NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- MODUL: promo
-- =====================================================================

CREATE TABLE promos (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code            VARCHAR(30) NOT NULL UNIQUE,
    name            VARCHAR(120) NOT NULL,
    description     VARCHAR(255) NULL,
    discount_type   ENUM('percentage','fixed') NOT NULL DEFAULT 'percentage',
    discount_value  DECIMAL(10,2) NOT NULL,
    min_purchase    DECIMAL(10,2) NOT NULL DEFAULT 0,
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    usage_limit     INT UNSIGNED NULL,             -- NULL = tanpa batas
    usage_count     INT UNSIGNED NOT NULL DEFAULT 0,
    is_active       TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB;

CREATE TABLE promo_usages (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    promo_id    INT UNSIGNED NOT NULL,
    user_id     INT UNSIGNED NOT NULL,
    order_id    INT UNSIGNED NOT NULL,
    used_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (promo_id) REFERENCES promos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB;

-- =====================================================================
-- MODUL: support (live chat CS)
-- =====================================================================

CREATE TABLE chat_sessions (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    admin_id    INT UNSIGNED NULL,
    status      ENUM('open','closed') NOT NULL DEFAULT 'open',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at   DATETIME NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE chat_messages (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    session_id  INT UNSIGNED NOT NULL,
    sender_id   INT UNSIGNED NOT NULL,
    sender_type ENUM('customer','admin') NOT NULL,
    message     TEXT NOT NULL,
    is_read     TINYINT(1) NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- =====================================================================
-- MODUL: logs (audit trail)
-- =====================================================================

CREATE TABLE activity_logs (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NULL,
    action      VARCHAR(80) NOT NULL,              -- login, edit_stok, update_status_order
    description VARCHAR(255) NULL,
    ip_address  VARCHAR(45) NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- =====================================================================
-- INDEX TAMBAHAN untuk kebutuhan modul reports & analytics
-- (best-seller, forecast-stok, jam-ramai, customer-loyalty)
-- =====================================================================

CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_menu ON order_items(menu_id);
CREATE INDEX idx_stock_movements_ingredient ON stock_movements(ingredient_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);

SET FOREIGN_KEY_CHECKS = 1;
