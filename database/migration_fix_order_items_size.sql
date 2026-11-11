-- Migration: Add size column to order_items table
-- This fixes the issue where size information is lost when creating orders from cart
-- CRITICAL: Must be run after schema.sql but can be run multiple times safely

USE kopi_jago_db;

-- Check if size column already exists before attempting to add it
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'kopi_jago_db' 
    AND TABLE_NAME = 'order_items' 
    AND COLUMN_NAME = 'size'
);

-- Add size column if it doesn't exist
SET @sql_add_column = IF(@col_exists = 0,
    'ALTER TABLE order_items ADD COLUMN size ENUM(''small'',''medium'',''large'') NOT NULL DEFAULT ''medium'' AFTER menu_id',
    'SELECT ''Column size already exists in order_items'' AS message'
);
PREPARE stmt FROM @sql_add_column;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Recreate PRIMARY KEY to include size (only if not already correct)
SET @pk_correct = (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'kopi_jago_db' 
    AND TABLE_NAME = 'order_items' 
    AND CONSTRAINT_NAME = 'PRIMARY'
    AND COLUMN_NAME = 'size'
);

SET @sql_fix_pk = IF(@pk_correct = 0 AND @col_exists = 0,
    'ALTER TABLE order_items DROP PRIMARY KEY, ADD PRIMARY KEY(order_id, menu_id, size)',
    'SELECT ''Primary key already includes size or no changes needed'' AS message'
);
PREPARE stmt FROM @sql_fix_pk;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration completed: order_items now supports size variations' AS status;
