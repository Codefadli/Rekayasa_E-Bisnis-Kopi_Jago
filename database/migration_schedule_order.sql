-- Schedule Order Feature Migration
USE kopi_jago_db;

-- Add scheduled order fields to orders table
ALTER TABLE orders
ADD COLUMN scheduled_for DATETIME NULL AFTER notes,
ADD COLUMN time_slot_id INT UNSIGNED NULL AFTER scheduled_for,
ADD COLUMN is_scheduled BOOLEAN DEFAULT FALSE AFTER time_slot_id,
ADD COLUMN scheduled_notes VARCHAR(255) NULL AFTER is_scheduled;

-- Create time_slots table (outlet operating hours + capacity)
CREATE TABLE IF NOT EXISTS time_slots (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    outlet_id INT UNSIGNED NOT NULL,
    day_of_week TINYINT NOT NULL COMMENT '0=Sunday, 1=Monday, ..., 6=Saturday',
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INT UNSIGNED NOT NULL DEFAULT 10 COMMENT 'Max orders per slot',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES users(id),
    UNIQUE KEY unique_slot (outlet_id, day_of_week, start_time),
    CHECK (start_time < end_time),
    CHECK (capacity > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create schedule_bookings table (track slot capacity usage)
CREATE TABLE IF NOT EXISTS schedule_bookings (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    time_slot_id INT UNSIGNED NOT NULL,
    booking_date DATE NOT NULL,
    booked_count INT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE CASCADE,
    UNIQUE KEY unique_booking (time_slot_id, booking_date),
    CHECK (booked_count >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create schedule_blackout_dates table (holidays, special closures)
CREATE TABLE IF NOT EXISTS schedule_blackout_dates (
    id INT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    outlet_id INT UNSIGNED NOT NULL,
    blackout_date DATE NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (outlet_id) REFERENCES users(id),
    UNIQUE KEY unique_blackout (outlet_id, blackout_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Add foreign key for time_slot_id in orders
ALTER TABLE orders
ADD CONSTRAINT fk_orders_time_slot 
FOREIGN KEY (time_slot_id) REFERENCES time_slots(id) ON DELETE SET NULL;

-- Seed default time slots (7 days x 3 slots = 21 entries per outlet)
-- Assuming outlet user_id from seed data (adjust based on actual seller IDs)

INSERT INTO time_slots (outlet_id, day_of_week, start_time, end_time, capacity) VALUES
-- Outlet 1 (assuming seller user_id = 3 from seed.sql)
(3, 0, '08:00:00', '12:00:00', 15), -- Sunday Morning
(3, 0, '12:00:00', '16:00:00', 15), -- Sunday Afternoon
(3, 0, '16:00:00', '20:00:00', 12), -- Sunday Evening
(3, 1, '08:00:00', '12:00:00', 20), -- Monday Morning
(3, 1, '12:00:00', '16:00:00', 20), -- Monday Afternoon
(3, 1, '16:00:00', '20:00:00', 15), -- Monday Evening
(3, 2, '08:00:00', '12:00:00', 20), -- Tuesday Morning
(3, 2, '12:00:00', '16:00:00', 20), -- Tuesday Afternoon
(3, 2, '16:00:00', '20:00:00', 15), -- Tuesday Evening
(3, 3, '08:00:00', '12:00:00', 20), -- Wednesday Morning
(3, 3, '12:00:00', '16:00:00', 20), -- Wednesday Afternoon
(3, 3, '16:00:00', '20:00:00', 15), -- Wednesday Evening
(3, 4, '08:00:00', '12:00:00', 20), -- Thursday Morning
(3, 4, '12:00:00', '16:00:00', 20), -- Thursday Afternoon
(3, 4, '16:00:00', '20:00:00', 15), -- Thursday Evening
(3, 5, '08:00:00', '12:00:00', 25), -- Friday Morning
(3, 5, '12:00:00', '16:00:00', 25), -- Friday Afternoon
(3, 5, '16:00:00', '20:00:00', 20), -- Friday Evening
(3, 6, '08:00:00', '12:00:00', 25), -- Saturday Morning
(3, 6, '12:00:00', '16:00:00', 25), -- Saturday Afternoon
(3, 6, '16:00:00', '20:00:00', 20); -- Saturday Evening

-- Add sample blackout dates (holidays)
INSERT INTO schedule_blackout_dates (outlet_id, blackout_date, reason) VALUES
(3, '2026-12-25', 'Christmas Day'),
(3, '2026-01-01', 'New Year'),
(3, '2026-08-17', 'Independence Day');

-- Create function to check slot availability
DELIMITER $$

CREATE FUNCTION check_slot_availability(
    p_time_slot_id INT,
    p_booking_date DATE
) RETURNS INT
READS SQL DATA
BEGIN
    DECLARE slot_capacity INT;
    DECLARE current_bookings INT;
    DECLARE available_count INT;
    
    -- Get slot capacity
    SELECT capacity INTO slot_capacity
    FROM time_slots
    WHERE id = p_time_slot_id AND is_active = TRUE;
    
    IF slot_capacity IS NULL THEN
        RETURN 0; -- Slot not found or inactive
    END IF;
    
    -- Get current bookings
    SELECT COALESCE(booked_count, 0) INTO current_bookings
    FROM schedule_bookings
    WHERE time_slot_id = p_time_slot_id 
      AND booking_date = p_booking_date;
    
    -- Calculate available
    SET available_count = slot_capacity - COALESCE(current_bookings, 0);
    
    RETURN GREATEST(available_count, 0);
END$$

DELIMITER ;

-- Create trigger to increment booking count when scheduled order created
DELIMITER $$

CREATE TRIGGER after_scheduled_order_insert
AFTER INSERT ON orders
FOR EACH ROW
BEGIN
    IF NEW.is_scheduled = TRUE AND NEW.time_slot_id IS NOT NULL AND NEW.scheduled_for IS NOT NULL THEN
        -- Insert or update booking count
        INSERT INTO schedule_bookings (time_slot_id, booking_date, booked_count)
        VALUES (NEW.time_slot_id, DATE(NEW.scheduled_for), 1)
        ON DUPLICATE KEY UPDATE booked_count = booked_count + 1;
    END IF;
END$$

DELIMITER ;

-- Create trigger to decrement booking count when scheduled order cancelled
DELIMITER $$

CREATE TRIGGER after_scheduled_order_cancel
AFTER UPDATE ON orders
FOR EACH ROW
BEGIN
    IF OLD.is_scheduled = TRUE 
       AND OLD.time_slot_id IS NOT NULL 
       AND OLD.scheduled_for IS NOT NULL
       AND NEW.status = 'cancelled' 
       AND OLD.status != 'cancelled' THEN
        -- Decrement booking count
        UPDATE schedule_bookings
        SET booked_count = GREATEST(booked_count - 1, 0)
        WHERE time_slot_id = OLD.time_slot_id 
          AND booking_date = DATE(OLD.scheduled_for);
    END IF;
END$$

DELIMITER ;
