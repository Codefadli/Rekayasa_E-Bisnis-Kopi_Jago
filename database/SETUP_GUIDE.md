# DATABASE SETUP GUIDE - KOPI JAGO

This guide explains how to safely set up the Kopi Jago database for different scenarios.

---

## 🚀 QUICK START (New Installation)

For a **brand new installation** with no existing data:

1. Start XAMPP Control Panel
2. Ensure MySQL service is running (green indicator)
3. Open phpMyAdmin: http://localhost/phpmyadmin
4. Execute scripts **in this exact order**:

```sql
-- Step 1: Create database and base tables
Source: database/schema.sql
Result: Creates kopi_jago_db with core tables

-- Step 2: Add size support
Source: database/migration_consolidate_cart_size.sql
Result: Adds size column to cart_items

-- Step 3: Add order item sizes
Source: database/migration_fix_order_items_size.sql
Result: Adds size column to order_items

-- Step 4: Add outlet tracking
Source: database/migration_add_outlet_to_orders.sql
Result: Adds seller_id to orders table

-- Step 5: Add Jago Party tables
Source: database/schema_extensions.sql
Result: Adds menu_sizes, jago_party_* tables, seller_profiles extensions

-- Step 6: Insert demo data
Source: database/seed.sql
Result: Adds roles, demo users, categories, products

-- Step 7 (Optional): Add demo admin/seller
Source: database/seed_admin_seller.sql (if exists)
```

5. Verify: Check that all tables exist in phpMyAdmin

---

## ⚠️ IMPORTANT WARNINGS

### schema.sql IS DESTRUCTIVE

**WARNING:** `database/schema.sql` contains:
```sql
DROP TABLE IF EXISTS ratings, order_assignment_audit, ..., users, roles;
```

This **PERMANENTLY DELETES** all data in these tables. Only run this script:
- ✅ On a brand new empty database
- ✅ In development/testing when you want to reset everything
- ✅ After confirming you have a backup

**NEVER** run `schema.sql` on:
- ❌ Production database with real customers
- ❌ Staging with data you need
- ❌ Any database without a backup

---

## 🔄 UPDATING EXISTING DATABASE

If you already have a database with data you want to keep, run **ONLY** the migrations you need:

### Check What You Already Have

```sql
-- Check if cart_items has size column
SHOW COLUMNS FROM cart_items LIKE 'size';

-- Check if order_items has size column  
SHOW COLUMNS FROM order_items LIKE 'size';

-- Check if orders has seller_id column
SHOW COLUMNS FROM orders LIKE 'seller_id';

-- Check if menu_sizes table exists
SHOW TABLES LIKE 'menu_sizes';

-- Check if jago_party_requests table exists
SHOW TABLES LIKE 'jago_party_requests';
```

### Apply Missing Migrations

Run only the migrations for features you don't have yet:

```sql
-- If cart_items missing size:
Source: database/migration_consolidate_cart_size.sql

-- If order_items missing size:
Source: database/migration_fix_order_items_size.sql

-- If orders missing seller_id:
Source: database/migration_add_outlet_to_orders.sql

-- If menu_sizes or jago_party tables missing:
Source: database/schema_extensions.sql
```

**All migration files are IDEMPOTENT** - safe to run multiple times. They check if changes already exist before applying.

---

## 🔐 PRODUCTION DEPLOYMENT

### Before Deploying to Production:

1. **Backup Current Database**
   ```bash
   mysqldump -u root -p kopi_jago_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test Migrations on Copy**
   - Create a copy of production database
   - Test all migrations on the copy
   - Verify application still works
   - Only then apply to production

3. **Security Checklist**
   - [ ] Change database password from empty to strong password
   - [ ] Update `backend/config/config.php` with production credentials
   - [ ] Set `DEMO_MODE = false` in `admin/admin-core.js`
   - [ ] Remove or disable demo user accounts
   - [ ] Configure real Midtrans credentials
   - [ ] Enable HTTPS
   - [ ] Set proper CORS origins in config.php

4. **Run Migrations During Low-Traffic Window**

5. **Monitor Error Logs** after deployment

---

## 📋 VERIFICATION CHECKLIST

After running migrations, verify:

```sql
-- 1. All core tables exist
SHOW TABLES;
-- Expected: roles, users, auth_tokens, menu_categories, menu_items, 
--           menu_sizes, cart_items, addresses, orders, order_items, 
--           seller_profiles, vehicles, jago_party_packages, 
--           jago_party_requests, and more

-- 2. cart_items has correct PRIMARY KEY
SHOW CREATE TABLE cart_items;
-- Expected PRIMARY KEY: (user_id, menu_id, size)

-- 3. order_items has correct PRIMARY KEY
SHOW CREATE TABLE order_items;
-- Expected PRIMARY KEY: (order_id, menu_id, size)

-- 4. orders has seller_id
SHOW CREATE TABLE orders;
-- Expected: seller_id INT UNSIGNED NULL with foreign key to users(id)

-- 5. menu_sizes has data
SELECT COUNT(*) FROM menu_sizes;
-- Expected: At least 3 rows per menu item (small, medium, large)

-- 6. Demo users exist
SELECT id, role_id, name, email FROM users;
-- Expected: admin@kopijago.id, siti@example.com, seller@example.com

-- 7. Demo products exist
SELECT id, name, price FROM menu_items;
-- Expected: Kopi Jago Signature, Chocolate Latte, etc.

-- 8. Jago Party packages exist
SELECT id, name, min_cups, max_cups FROM jago_party_packages;
-- Expected: JP50, JP100, JP200, JP300, JP400, JP500
```

---

## 🐛 TROUBLESHOOTING

### Migration Fails with "Table already exists"

**Cause:** Trying to run schema.sql when database already has tables

**Solution:** 
- If you want to keep data: Skip schema.sql, run only needed migrations
- If you want fresh start: Manually drop database first:
  ```sql
  DROP DATABASE kopi_jago_db;
  ```
  Then run schema.sql

### Migration Fails with "Can't DROP 'PRIMARY'"

**Cause:** Trying to change PRIMARY KEY that doesn't exist or already changed

**Solution:** Migration should handle this. If it doesn't:
```sql
-- Check current PK
SHOW CREATE TABLE cart_items;

-- If PK is already correct, skip that migration
```

### Foreign Key Constraint Fails

**Cause:** Migrations run out of order

**Solution:** Run migrations in the documented order:
1. schema.sql (if fresh install)
2. migration_consolidate_cart_size.sql
3. migration_fix_order_items_size.sql
4. migration_add_outlet_to_orders.sql
5. schema_extensions.sql
6. seed.sql

### "Access denied for user 'root'@'localhost'"

**Cause:** MySQL password required

**Solution:** 
- In phpMyAdmin, this shouldn't happen
- If using command line:
  ```bash
  mysql -u root -p < database/schema.sql
  # Enter password when prompted
  ```

---

## 🔄 ROLLBACK PLAN

If a migration breaks your application:

1. **Restore from Backup**
   ```bash
   mysql -u root -p kopi_jago_db < backup_YYYYMMDD_HHMMSS.sql
   ```

2. **Or Manually Revert Changes**
   
   Example - Remove seller_id from orders:
   ```sql
   ALTER TABLE orders DROP FOREIGN KEY fk_orders_seller;
   ALTER TABLE orders DROP COLUMN seller_id;
   ```

   Example - Remove size from order_items:
   ```sql
   ALTER TABLE order_items DROP PRIMARY KEY;
   ALTER TABLE order_items DROP COLUMN size;
   ALTER TABLE order_items ADD PRIMARY KEY (order_id, menu_id);
   ```

---

## 📞 SUPPORT

If you encounter issues:

1. Check XAMPP Control Panel - MySQL service running?
2. Check phpMyAdmin - Can you access it?
3. Check error messages in MySQL error log
4. Review AUDIT_REPORT_Kopi_Jago.md for known issues
5. Check IMPLEMENTATION_STATUS.md for current project state

---

**Last Updated:** 2026-10-10  
**Database Version:** 2.0 (with size support, outlet tracking, Jago Party)
