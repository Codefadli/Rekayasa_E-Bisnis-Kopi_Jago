-- Migration: Consolidate cart_items size column
-- This ensures cart_items has size support without conflicts
-- IDEMPOTENT: Safe to run multiple times

USE kopi_jago_db;

-- Check if size column exists in cart_items
SET @col_exists = (
    SELECT COUNT(*) 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = 'kopi_jago_db' 
    AND TABLE_NAME = 'cart_items' 
    AND COLUMN_NAME = 'size'
);

-- Add size column if it doesn't exist
SET @sql_add_col = IF(@col_exists = 0,
    'ALTER TABLE cart_items ADD COLUMN size ENUM(''small'',''medium'',''large'') NOT NULL DEFAULT ''medium'' AFTER menu_id',
    'SELECT ''Column size already exists in cart_items'' AS message'
);
PREPARE stmt FROM @sql_add_col;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check if PRIMARY KEY includes size
SET @pk_includes_size = (
    SELECT COUNT(*) 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'kopi_jago_db' 
    AND TABLE_NAME = 'cart_items' 
    AND CONSTRAINT_NAME = 'PRIMARY'
    AND COLUMN_NAME = 'size'
);

-- Update PRIMARY KEY to include size if needed
SET @sql_fix_pk = IF(@pk_includes_size = 0 AND @col_exists = 1,
    'ALTER TABLE cart_items DROP PRIMARY KEY, ADD PRIMARY KEY(user_id, menu_id, size)',
    IF(@pk_includes_size = 0 AND @col_exists = 0,
        'ALTER TABLE cart_items DROP PRIMARY KEY, ADD PRIMARY KEY(user_id, menu_id, size)',
        'SELECT ''Primary key already correct'' AS message'
    )
);

-- Only execute PK change if size column was just added or already exists
SET @execute_pk = IF(@col_exists = 1 OR @sql_add_col LIKE '%ALTER TABLE%', 1, 0);
SET @sql_final = IF(@execute_pk = 1 AND @pk_includes_size = 0,
    'ALTER TABLE cart_items DROP PRIMARY KEY, ADD PRIMARY KEY(user_id, menu_id, size)',
    'SELECT ''No PRIMARY KEY change needed'' AS info'
);

PREPARE stmt FROM @sql_final;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migration completed: cart_items now properly supports size variations' AS status;
