-- =====================================================
-- DATABASE MIGRATION SCRIPT
-- Purpose: Separate Users, Admins, and Organizers tables
-- Remove OneToOne relationships and add auth fields to Admins/Organizers
-- =====================================================

-- STEP 1: Backup existing data before migration
-- CREATE BACKUP TABLES (recommended to run this first and verify backups)
CREATE TABLE IF NOT EXISTS users_backup AS SELECT * FROM users;
CREATE TABLE IF NOT EXISTS admins_backup AS SELECT * FROM admins;
CREATE TABLE IF NOT EXISTS organizers_backup AS SELECT * FROM organizers;

-- STEP 2: Add new columns to admins table
ALTER TABLE admins ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(20);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- STEP 3: Migrate data from users to admins table
UPDATE admins a
SET 
    first_name = u.first_name,
    last_name = u.last_name,
    email = u.email,
    password = u.password,
    phone_number = u.phone_number,
    date_of_birth = u.date_of_birth,
    profile_picture = u.profile_picture,
    role = u.role,
    active = u.active,
    email_verified = u.email_verified,
    last_login_at = u.last_login_at
FROM users u
WHERE a.user_id = u.user_id 
AND u.role IN ('ADMIN', 'SUPER_ADMIN');

-- STEP 4: Make email and password NOT NULL in admins after data migration
ALTER TABLE admins ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE admins ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE admins ALTER COLUMN email SET NOT NULL;
ALTER TABLE admins ALTER COLUMN password SET NOT NULL;
ALTER TABLE admins ALTER COLUMN role SET NOT NULL;
ALTER TABLE admins ALTER COLUMN active SET NOT NULL;
ALTER TABLE admins ALTER COLUMN email_verified SET NOT NULL;

-- Add unique constraint on email in admins
ALTER TABLE admins ADD CONSTRAINT admins_email_unique UNIQUE (email);

-- STEP 5: Add new columns to organizers table
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS password VARCHAR(255);
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500);
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'ORGANIZER';
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE organizers ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- STEP 6: Migrate data from users to organizers table
UPDATE organizers o
SET 
    first_name = u.first_name,
    last_name = u.last_name,
    email = u.email,
    password = u.password,
    phone_number = u.phone_number,
    date_of_birth = u.date_of_birth,
    profile_picture = u.profile_picture,
    role = 'ORGANIZER',
    active = u.active,
    email_verified = u.email_verified,
    last_login_at = u.last_login_at
FROM users u
WHERE o.user_id = u.user_id 
AND u.role = 'ORGANIZER';

-- STEP 7: Make email and password NOT NULL in organizers after data migration
ALTER TABLE organizers ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE organizers ALTER COLUMN last_name SET NOT NULL;
ALTER TABLE organizers ALTER COLUMN email SET NOT NULL;
ALTER TABLE organizers ALTER COLUMN password SET NOT NULL;
ALTER TABLE organizers ALTER COLUMN role SET NOT NULL;
ALTER TABLE organizers ALTER COLUMN active SET NOT NULL;
ALTER TABLE organizers ALTER COLUMN email_verified SET NOT NULL;

-- Add unique constraint on email in organizers
ALTER TABLE organizers ADD CONSTRAINT organizers_email_unique UNIQUE (email);

-- STEP 8: Handle foreign key constraints before deleting from users table
-- First, find and drop all foreign key constraints referencing users table
DO $$ 
DECLARE
    constraint_name text;
    table_name text;
BEGIN
    FOR constraint_name, table_name IN 
        SELECT 
            tc.constraint_name,
            tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
            ON tc.constraint_name = ccu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'users'
            AND tc.table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE ' || table_name || ' DROP CONSTRAINT IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped FK constraint % from table %', constraint_name, table_name;
    END LOOP;
END $$;

-- STEP 8a: Now delete ADMIN, SUPER_ADMIN, and ORGANIZER records from users table
-- Keep only role='USER' in users table
DELETE FROM users WHERE role IN ('ADMIN', 'SUPER_ADMIN', 'ORGANIZER');

-- STEP 9: Drop dependent views and objects before dropping columns
-- First, let's find and drop all views that reference the admins or organizers tables
DO $$ 
DECLARE
    view_name text;
BEGIN
    -- Drop all views that reference admins or organizers tables
    FOR view_name IN 
        SELECT DISTINCT v.table_name
        FROM information_schema.view_table_usage v
        WHERE v.view_schema = 'public'
        AND v.table_name IN ('admins', 'organizers')
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS ' || view_name || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', view_name;
    END LOOP;
END $$;

-- Also drop any commonly named views explicitly (in case they weren't caught above)
DROP VIEW IF EXISTS v_admin_users CASCADE;
DROP VIEW IF EXISTS v_organizer_users CASCADE;
DROP VIEW IF EXISTS v_organizer_employees CASCADE;
DROP VIEW IF EXISTS v_all_users CASCADE;

-- STEP 10: Drop foreign key constraints and user_id columns from admins and organizers
-- Note: Adjust constraint names based on your actual database schema
ALTER TABLE admins DROP CONSTRAINT IF EXISTS fk_admins_user_id;
ALTER TABLE admins DROP CONSTRAINT IF EXISTS uk_admins_user_id;
ALTER TABLE admins DROP COLUMN IF EXISTS user_id;

ALTER TABLE organizers DROP CONSTRAINT IF EXISTS fk_organizers_user_id;
ALTER TABLE organizers DROP CONSTRAINT IF EXISTS uk_organizers_user_id;
ALTER TABLE organizers DROP COLUMN IF EXISTS user_id;

-- STEP 11: Add constraint to ensure users table only contains role='USER'
-- Drop existing constraint if it exists, then recreate it
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role = 'USER');

-- STEP 12: Verify the migration
SELECT 'Users table count (should be USER only):', COUNT(*), string_agg(DISTINCT role, ', ') as roles FROM users;
SELECT 'Admins table count:', COUNT(*), string_agg(DISTINCT role, ', ') as roles FROM admins;
SELECT 'Organizers table count:', COUNT(*), string_agg(DISTINCT role, ', ') as roles FROM organizers;

-- STEP 13: Drop backup tables after verification (run this only after confirming migration success)
	DROP TABLE IF EXISTS users_backup;
 DROP TABLE IF EXISTS admins_backup;
 DROP TABLE IF EXISTS organizers_backup;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- IMPORTANT NOTES:
-- 1. Test the application thoroughly after migration
-- 2. Keep backup tables until fully verified
-- 3. Update any external references to user_id in admins/organizers tables
-- 4. Same email can now exist across all 3 tables for different roles
-- =====================================================
