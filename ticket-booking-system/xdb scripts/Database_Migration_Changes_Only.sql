-- ============================================================================
-- DATABASE MIGRATION SCRIPT - Role Management & Organizer Hierarchy
-- Version: 1.0 to 2.0
-- Date: October 23, 2025
-- ============================================================================

-- IMPORTANT: Run this script in a transaction and test in development first!
BEGIN;

-- ============================================================================
-- STEP 0: PREREQUISITES AND VALIDATION
-- ============================================================================

-- 0.1 Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0.2 Create update trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 0.3 Validate current database state
DO $$
DECLARE
    user_count INTEGER;
    event_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO event_count FROM events;
    
    RAISE NOTICE 'Database state: % users, % events', user_count, event_count;
    
    IF user_count = 0 THEN
        RAISE EXCEPTION 'No users found - cannot proceed with migration';
    END IF;
END $$;

-- ============================================================================
-- STEP 1: CREATE NEW TABLES
-- ============================================================================

-- 1.1 Create roles table for dynamic role management
CREATE TABLE IF NOT EXISTS roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    can_manage_users BOOLEAN DEFAULT FALSE,
    can_manage_events BOOLEAN DEFAULT FALSE,
    can_manage_venues BOOLEAN DEFAULT FALSE,
    can_manage_bookings BOOLEAN DEFAULT FALSE,
    can_view_reports BOOLEAN DEFAULT FALSE,
    can_manage_roles BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system roles
INSERT INTO roles (role_name, role_description, is_system_role, can_manage_users, can_manage_events, can_manage_venues, can_manage_bookings, can_view_reports, can_manage_roles, is_active) VALUES
('ADMIN', 'System Administrator with full access', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE),
('ORGANIZER', 'Event organizer with event management capabilities', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, FALSE, TRUE),
('ORGANIZER_EMPLOYEE', 'Organizer employee with limited event management', TRUE, FALSE, TRUE, TRUE, TRUE, FALSE, FALSE, TRUE),
('USER', 'Regular user with booking capabilities', TRUE, FALSE, FALSE, FALSE, FALSE, FALSE, FALSE, TRUE)
ON CONFLICT (role_name) DO NOTHING;

-- 1.2 Create admins table for admin-specific information
CREATE TABLE IF NOT EXISTS admins (
    admin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL,
    employee_id VARCHAR(50) UNIQUE,
    department VARCHAR(100),
    position VARCHAR(100),
    access_level VARCHAR(20) DEFAULT 'STANDARD' CHECK (access_level IN ('STANDARD', 'SENIOR', 'SUPER')),
    can_delete_users BOOLEAN DEFAULT FALSE,
    can_modify_system_settings BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.3 Create organizers table with employee hierarchy
CREATE TABLE IF NOT EXISTS organizers (
    organizer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL,
    parent_organizer_id UUID,
    organization_name VARCHAR(255) NOT NULL,
    organization_type VARCHAR(100),
    business_registration_number VARCHAR(100),
    tax_id VARCHAR(100),
    business_address TEXT,
    business_phone VARCHAR(20),
    business_email VARCHAR(255),
    website_url VARCHAR(500),
    is_verified BOOLEAN DEFAULT FALSE,
    is_employee BOOLEAN DEFAULT FALSE,
    employee_position VARCHAR(100),
    can_create_employees BOOLEAN DEFAULT TRUE,
    bank_account_number VARCHAR(100),
    bank_name VARCHAR(255),
    bank_routing_number VARCHAR(50),
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    total_events_created INTEGER DEFAULT 0,
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    rating DECIMAL(3,2) DEFAULT 0.00,
    verification_documents JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add self-referential foreign key after table creation
ALTER TABLE organizers ADD CONSTRAINT fk_organizers_parent 
    FOREIGN KEY (parent_organizer_id) REFERENCES organizers(organizer_id) ON DELETE SET NULL;

-- Add check constraint after table creation
ALTER TABLE organizers ADD CONSTRAINT chk_employee_has_parent CHECK (
    (is_employee = FALSE) OR 
    (is_employee = TRUE AND parent_organizer_id IS NOT NULL)
);

-- 1.4 Create user activity log table
CREATE TABLE IF NOT EXISTS user_activity_log (
    log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    activity_type VARCHAR(50) NOT NULL,
    activity_description TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1.5 Create system audit log table
CREATE TABLE IF NOT EXISTS system_audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    performed_by UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STEP 2: MODIFY EXISTING USERS TABLE
-- ============================================================================

-- 2.1 Add role_id column (will replace the role enum)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID;

-- 2.2 Add profile_picture column if not exists
-- Already exists, skipping

-- 2.3 Add last_login_at column if not exists
-- Already exists, skipping

-- 2.4 Check if we need to handle is_active/active column
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'active') THEN
        ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- ============================================================================
-- STEP 3: MIGRATE EXISTING USER DATA TO NEW ROLE SYSTEM
-- ============================================================================

-- 3.1 Map existing role enum values to role_id
UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'ADMIN') WHERE role = 'ADMIN';
UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'ORGANIZER') WHERE role = 'ORGANIZER';
UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'USER') WHERE role = 'USER';

-- 3.2 Handle any users with NULL role_id (set to USER as default)
UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'USER') WHERE role_id IS NULL;

-- 3.3 Create admin records for existing admin users
INSERT INTO admins (user_id, department, position, access_level)
SELECT user_id, 'General', 'Administrator', 'STANDARD'
FROM users
WHERE role = 'ADMIN'
ON CONFLICT (user_id) DO NOTHING;

-- 3.4 FIXED: Create organizer records for existing organizer users
INSERT INTO organizers (user_id, organization_name, is_employee, can_create_employees, is_verified)
SELECT 
    user_id,
    CONCAT(first_name, ' ', last_name, ' Events') as organization_name,
    FALSE as is_employee,
    TRUE as can_create_employees,
    TRUE as is_verified
FROM users
WHERE role = 'ORGANIZER'
ON CONFLICT (user_id) DO NOTHING;

-- Check if migration worked
SELECT u.user_id, u.role, u.role_id, r.role_name 
FROM users u 
LEFT JOIN roles r ON u.role_id = r.role_id;

SELECT COUNT(*) as admin_records FROM admins;
SELECT COUNT(*) as organizer_records FROM organizers;

SELECT * FROM roles;

-- If roles exist, map users to roles
UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'ADMIN') 
WHERE role = 'ADMIN' AND role_id IS NULL;

UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'ORGANIZER') 
WHERE role = 'ORGANIZER' AND role_id IS NULL;

UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'USER') 
WHERE role = 'USER' AND role_id IS NULL;

-- Set any remaining NULL role_ids to USER role
UPDATE users SET role_id = (SELECT role_id FROM roles WHERE role_name = 'USER') 
WHERE role_id IS NULL;

-- 3.5 Make role_id NOT NULL and add foreign key (after data migration)
ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT;

-- Check what organizer users exist
SELECT user_id, first_name, last_name, role 
FROM users 
WHERE role = 'ORGANIZER';

-- Now create organizer records for them
INSERT INTO organizers (user_id, organization_name, is_employee, can_create_employees, is_verified)
SELECT 
    user_id,
    COALESCE(
        -- If organization_name exists in users table, use it
        (SELECT column_name FROM information_schema.columns 
         WHERE table_name = 'users' AND column_name = 'organization_name' LIMIT 1),
        -- Otherwise use first + last name
        CONCAT(first_name, ' ', last_name, ' Events')
    ) as organization_name,
    FALSE as is_employee,
    TRUE as can_create_employees,
    TRUE as is_verified
FROM users
WHERE role = 'ORGANIZER'
ON CONFLICT (user_id) DO NOTHING;

-- Create admin records for admin users
INSERT INTO admins (user_id, department, position, access_level)
SELECT 
    user_id,
    'General' as department,
    'Administrator' as position,
    'STANDARD' as access_level
FROM users
WHERE role = 'ADMIN'
ON CONFLICT (user_id) DO NOTHING;

-- Final verification
SELECT '=== MIGRATION VERIFICATION ===' as info;

SELECT 'User Role Mapping:' as check;
SELECT u.role as old_role, r.role_name as new_role, COUNT(*) as user_count
FROM users u 
JOIN roles r ON u.role_id = r.role_id
GROUP BY u.role, r.role_name;

SELECT 'Admin Migration:' as check;
SELECT COUNT(*) as admin_users FROM users WHERE role = 'ADMIN';
SELECT COUNT(*) as admin_records FROM admins;

SELECT 'Organizer Migration:' as check;  
SELECT COUNT(*) as organizer_users FROM users WHERE role = 'ORGANIZER';
SELECT COUNT(*) as organizer_records FROM organizers;

SELECT 'Foreign Key Status:' as check;
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'users' AND constraint_type = 'FOREIGN KEY';

-- ============================================================================
-- STEP 4: ADD FOREIGN KEY CONSTRAINTS TO NEW TABLES
-- ============================================================================

ALTER TABLE admins ADD CONSTRAINT fk_admins_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE organizers ADD CONSTRAINT fk_organizers_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
ALTER TABLE user_activity_log ADD CONSTRAINT fk_activity_log_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE system_audit_log ADD CONSTRAINT fk_audit_log_user FOREIGN KEY (performed_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 5: MODIFY EXISTING EVENTS TABLE
-- ============================================================================

-- 5.1 Add created_by_user_id to track who created the event (could be employee)
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by_user_id UUID;

-- 5.2 Add approval workflow columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE events ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE events ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE events ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;

-- Add check constraint separately
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'events_approval_status_check') THEN
        ALTER TABLE events ADD CONSTRAINT events_approval_status_check 
            CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED'));
    END IF;
END $$;

-- 5.3 Add tags array for categorization
ALTER TABLE events ADD COLUMN IF NOT EXISTS tags TEXT[];

-- 5.4 Update existing events to set created_by_user_id to organizer_id
UPDATE events SET created_by_user_id = organizer_id WHERE created_by_user_id IS NULL;

-- 5.5 Make created_by_user_id NOT NULL and add foreign key
ALTER TABLE events ALTER COLUMN created_by_user_id SET NOT NULL;
ALTER TABLE events ADD CONSTRAINT fk_events_created_by FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE RESTRICT;

-- 5.7 Update status enum to include POSTPONED
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'events_status_check') THEN
        ALTER TABLE events DROP CONSTRAINT events_status_check;
    END IF;
END $$;

ALTER TABLE events ADD CONSTRAINT events_status_check 
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED', 'POSTPONED'));

-- ============================================================================
-- STEP 6: MODIFY EXISTING VENUES TABLE
-- ============================================================================

-- 6.1 Add organizer relationship
ALTER TABLE venues ADD COLUMN IF NOT EXISTS organizer_id UUID;

-- 6.2 Add contact information
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);
ALTER TABLE venues ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);

-- 6.3 Add country column
ALTER TABLE venues ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'USA';

-- 6.4 Add description if not exists
ALTER TABLE venues ADD COLUMN IF NOT EXISTS description TEXT;

-- 6.5 Add is_active flag
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 6.6 Update layout_type enum to include more types
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'venues_layout_type_check') THEN
        ALTER TABLE venues DROP CONSTRAINT venues_layout_type_check;
    END IF;
END $$;

ALTER TABLE venues ADD CONSTRAINT venues_layout_type_check 
    CHECK (layout_type IN ('THEATER', 'GENERAL_ADMISSION', 'STADIUM', 'CONFERENCE', 'CUSTOM'));

-- Add foreign key constraint for organizer_id
ALTER TABLE venues ADD CONSTRAINT fk_venues_organizer FOREIGN KEY (organizer_id) 
    REFERENCES organizers(organizer_id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 7: MODIFY EXISTING SEATS TABLE
-- ============================================================================

-- 7.1 Add category reference
ALTER TABLE seats ADD COLUMN IF NOT EXISTS category_id UUID;

-- 7.2 Add blocking information
ALTER TABLE seats ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE seats ADD COLUMN IF NOT EXISTS blocked_until TIMESTAMP;

-- 7.3 Add updated_at column
ALTER TABLE seats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- 7.4 Update seat_type enum to include STANDING
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'seats_seat_type_check') THEN
        ALTER TABLE seats DROP CONSTRAINT seats_seat_type_check;
    END IF;
END $$;

ALTER TABLE seats ADD CONSTRAINT seats_seat_type_check 
    CHECK (seat_type IN ('REGULAR', 'PREMIUM', 'VIP', 'ACCESSIBLE', 'STANDING'));

-- ============================================================================
-- STEP 8: MODIFY EXISTING BOOKINGS TABLE
-- ============================================================================

-- 8.1 Add customer information
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS number_of_tickets INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(20);

-- 8.2 Add discount and final amount
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_amount DECIMAL(10,2);

-- 8.3 Add cancellation information
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMP;

-- 8.4 Update number_of_tickets for existing bookings
UPDATE bookings SET number_of_tickets = (
    SELECT COUNT(*) FROM booking_seats WHERE booking_seats.booking_id = bookings.booking_id
) WHERE number_of_tickets IS NULL;

-- 8.5 FIXED: Calculate final_amount without booking_fee column
UPDATE bookings 
SET final_amount = total_amount - COALESCE(discount_amount, 0)
WHERE final_amount IS NULL;



-- 8.6 Update payment_status enum
-- First, let's see what columns exist in bookings table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
ORDER BY ordinal_position;

-- Add the missing payment_status column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'PENDING';

-- Now add the check constraint
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bookings_payment_status_check') THEN
        ALTER TABLE bookings DROP CONSTRAINT bookings_payment_status_check;
    END IF;
END $$;

ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check 
    CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'));

-- 8.7 Update booking_status enum
-- 8.7 FIXED: Add booking_status column and update enum
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_status VARCHAR(20) DEFAULT 'CONFIRMED';

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bookings_booking_status_check') THEN
        ALTER TABLE bookings DROP CONSTRAINT bookings_booking_status_check;
    END IF;
END $$;

ALTER TABLE bookings ADD CONSTRAINT bookings_booking_status_check 
    CHECK (booking_status IN ('CONFIRMED', 'CANCELLED', 'ATTENDED', 'NO_SHOW'));

-- ============================================================================
-- STEP 9: MODIFY EXISTING BOOKING_SEATS TABLE
-- ============================================================================

-- 9.1 Add check-in functionality
ALTER TABLE booking_seats ADD COLUMN IF NOT EXISTS checked_in BOOLEAN DEFAULT FALSE;
ALTER TABLE booking_seats ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP;
ALTER TABLE booking_seats ADD COLUMN IF NOT EXISTS checked_in_by UUID;

-- Add foreign key constraint
ALTER TABLE booking_seats ADD CONSTRAINT fk_booking_seats_checked_in_by 
    FOREIGN KEY (checked_in_by) REFERENCES users(user_id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 10: MODIFY EXISTING TRANSACTIONS TABLE
-- ============================================================================

-- 10.1 Add user_id reference
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID;

-- 10.2 Add payment_method
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);

-- 10.3 Add error_message
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 10.4 FIXED: Add transaction_type column and update enum
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'PAYMENT';

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_transaction_type_check') THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_transaction_type_check;
    END IF;
END $$;

ALTER TABLE transactions ADD CONSTRAINT transactions_transaction_type_check 
    CHECK (transaction_type IN ('PAYMENT', 'REFUND', 'CHARGEBACK', 'PAYOUT'));

-- 10.5 Update status enum to include CANCELLED
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_status_check') THEN
        ALTER TABLE transactions DROP CONSTRAINT transactions_status_check;
    END IF;
END $$;

ALTER TABLE transactions ADD CONSTRAINT transactions_status_check 
    CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'));

-- Add foreign key constraint for user_id
ALTER TABLE transactions ADD CONSTRAINT fk_transactions_user 
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;

-- ============================================================================
-- STEP 11: CREATE NEW INDEXES
-- ============================================================================

-- Roles table indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(role_name);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active);

-- Users table new indexes
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Admins table indexes
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_employee_id ON admins(employee_id);

-- Organizers table indexes
CREATE INDEX IF NOT EXISTS idx_organizers_user_id ON organizers(user_id);
CREATE INDEX IF NOT EXISTS idx_organizers_parent ON organizers(parent_organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizers_verified ON organizers(is_verified);
CREATE INDEX IF NOT EXISTS idx_organizers_employee ON organizers(is_employee);

-- Events table new indexes
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_events_approval_status ON events(approval_status);

-- Venues table new indexes
CREATE INDEX IF NOT EXISTS idx_venues_organizer ON venues(organizer_id);
CREATE INDEX IF NOT EXISTS idx_venues_city ON venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_active ON venues(is_active);

-- FIXED: Add created_at column to bookings table if it doesn't exist
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Now create the index
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at); 

-- Transactions table new indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON user_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON user_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON user_activity_log(created_at);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON system_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON system_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON system_audit_log(created_at);

-- FIXED: Add customer_email column if it doesn't exist (we already did this in step 8.1)
-- Now create the index
CREATE INDEX IF NOT EXISTS idx_bookings_customer_email ON bookings(customer_email);

-- ============================================================================
-- STEP 12: CREATE TRIGGERS FOR NEW TABLES
-- ============================================================================

DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admins_updated_at ON admins;
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizers_updated_at ON organizers;
CREATE TRIGGER update_organizers_updated_at BEFORE UPDATE ON organizers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_seats_updated_at ON seats;
CREATE TRIGGER update_seats_updated_at BEFORE UPDATE ON seats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 13: CREATE VIEWS FOR EASY QUERYING
-- ============================================================================

-- FIXED: View for admin users with full details
CREATE OR REPLACE VIEW v_admin_users AS
SELECT 
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.phone_number,
    u.date_of_birth,
    u.profile_picture,
    u.active,  -- JUST USE u.active DIRECTLY
    u.email_verified,
    u.last_login_at,
    u.created_at as user_created_at,
    r.role_name,
    a.admin_id,
    a.employee_id,
    a.department,
    a.position,
    a.access_level,
    a.can_delete_users,
    a.can_modify_system_settings,
    a.created_at as admin_created_at
FROM users u
JOIN roles r ON u.role_id = r.role_id
JOIN admins a ON u.user_id = a.user_id
WHERE r.role_name = 'ADMIN';

-- FIXED: View for organizer users with full details
CREATE OR REPLACE VIEW v_organizer_users AS
SELECT 
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.phone_number,
    u.date_of_birth,
    u.profile_picture,
    u.active,  -- JUST USE u.active DIRECTLY
    u.email_verified,
    u.last_login_at,
    u.created_at as user_created_at,
    r.role_name,
    o.organizer_id,
    o.parent_organizer_id,
    o.organization_name,
    o.organization_type,
    o.business_email,
    o.business_phone,
    o.website_url,
    o.is_verified,
    o.is_employee,
    o.employee_position,
    o.can_create_employees,
    o.total_events_created,
    o.total_revenue,
    o.rating,
    o.created_at as organizer_created_at
FROM users u
JOIN roles r ON u.role_id = r.role_id
JOIN organizers o ON u.user_id = o.user_id
WHERE r.role_name IN ('ORGANIZER', 'ORGANIZER_EMPLOYEE');

-- View for organizer employees with their parent organizer
CREATE OR REPLACE VIEW v_organizer_employees AS
SELECT 
    e.organizer_id as employee_organizer_id,
    e.user_id as employee_user_id,
    eu.email as employee_email,
    eu.first_name as employee_first_name,
    eu.last_name as employee_last_name,
    e.employee_position,
    p.organizer_id as parent_organizer_id,
    p.organization_name as parent_organization_name,
    pu.email as parent_email,
    pu.first_name as parent_first_name,
    pu.last_name as parent_last_name
FROM organizers e
JOIN users eu ON e.user_id = eu.user_id
JOIN organizers p ON e.parent_organizer_id = p.organizer_id
JOIN users pu ON p.user_id = pu.user_id
WHERE e.is_employee = TRUE;

select * from admins;

-- ============================================================================
-- STEP 14: FINAL VALIDATION CHECKS
-- ============================================================================

-- Check for any foreign key violations
DO $$
DECLARE
    fk_violations INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_violations FROM (
        -- Check users without roles
        SELECT 1 FROM users u LEFT JOIN roles r ON u.role_id = r.role_id WHERE r.role_id IS NULL
        UNION ALL
        -- Check admins without users
        SELECT 1 FROM admins a LEFT JOIN users u ON a.user_id = u.user_id WHERE u.user_id IS NULL
        UNION ALL
        -- Check organizers without users
        SELECT 1 FROM organizers o LEFT JOIN users u ON o.user_id = u.user_id WHERE u.user_id IS NULL
    ) AS violations;
    
    IF fk_violations > 0 THEN
        RAISE EXCEPTION 'Found % foreign key violations - rolling back', fk_violations;
    END IF;
END $$;

-- Verify critical business logic
DO $$
BEGIN
    -- Ensure we have system roles
    IF (SELECT COUNT(*) FROM roles WHERE is_system_role = TRUE) < 4 THEN
        RAISE EXCEPTION 'Missing system roles';
    END IF;
    
    -- Ensure all events have creators
    IF (SELECT COUNT(*) FROM events WHERE created_by_user_id IS NULL) > 0 THEN
        RAISE EXCEPTION 'Some events missing created_by_user_id';
    END IF;
    
    RAISE NOTICE 'All validation checks passed';
END $$;

-- ============================================================================
-- STEP 15: VERIFY MIGRATION AND SHOW SUMMARY
-- ============================================================================

-- Check that all users have role_id assigned
DO $$
DECLARE
    null_role_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_role_count FROM users WHERE role_id IS NULL;
    IF null_role_count > 0 THEN
        RAISE WARNING 'WARNING: % users have NULL role_id', null_role_count;
    ELSE
        RAISE NOTICE 'SUCCESS: All users have role_id assigned';
    END IF;
END $$;

-- Print summary
SELECT 'Migration Summary:' as info;
SELECT 'Roles' as table_name, COUNT(*) as count FROM roles
UNION ALL
SELECT 'Users', COUNT(*) FROM users
UNION ALL
SELECT 'Admins', COUNT(*) FROM admins
UNION ALL
SELECT 'Organizers', COUNT(*) FROM organizers
UNION ALL
SELECT 'Events', COUNT(*) FROM events
UNION ALL
SELECT 'Venues', COUNT(*) FROM venues
UNION ALL
SELECT 'Seats', COUNT(*) FROM seats
UNION ALL
SELECT 'Bookings', COUNT(*) FROM bookings;

-- Test queries to verify migration success
SELECT 'Testing migration:' as test;
SELECT role_name, COUNT(*) as user_count 
FROM users u JOIN roles r ON u.role_id = r.role_id 
GROUP BY role_name;

SELECT 'Admin records:' as test, COUNT(*) FROM admins;
SELECT 'Organizer records:' as test, COUNT(*) FROM organizers;
SELECT 'Events with creators:' as test, COUNT(*) FROM events WHERE created_by_user_id IS NOT NULL;

-- Test the new views
SELECT * FROM v_admin_users;
SELECT * FROM v_organizer_users;

-- ============================================================================
-- IMPORTANT: REVIEW BEFORE COMMITTING
-- ============================================================================
-- If everything looks good, run: COMMIT;
-- If there are issues, run: ROLLBACK;
-- ============================================================================

-- Uncomment the appropriate line below after reviewing the results:

-- COMMIT;  -- Uncomment this line to commit the changes
-- ROLLBACK; -- Uncomment this line to rollback if there are issues


SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'priv'
ORDER BY table_name;


SELECT table_name
FROM information_schema.tables
WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
AND table_schema = 'public'
ORDER BY table_name;