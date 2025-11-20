-- Create organizer_employees table
CREATE TABLE IF NOT EXISTS organizer_employees (
    employee_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    profile_picture VARCHAR(500),
    role VARCHAR(30) NOT NULL DEFAULT 'ORGANIZER_EMPLOYEE',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at TIMESTAMP,
    
    -- Foreign key constraints
    organizer_id UUID NOT NULL REFERENCES organizers(organizer_id) ON DELETE CASCADE,
    created_by_admin_id UUID REFERENCES admins(admin_id) ON DELETE SET NULL,
    
    -- Employee-specific fields
    employee_position VARCHAR(100),
    department VARCHAR(100),
    hire_date DATE DEFAULT CURRENT_DATE,
    
    -- Audit fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_organizer_employees_email ON organizer_employees(email);
CREATE INDEX IF NOT EXISTS idx_organizer_employees_organizer_id ON organizer_employees(organizer_id);
CREATE INDEX IF NOT EXISTS idx_organizer_employees_active ON organizer_employees(active);
CREATE INDEX IF NOT EXISTS idx_organizer_employees_created_by_admin_id ON organizer_employees(created_by_admin_id);

-- Add comments for documentation
COMMENT ON TABLE organizer_employees IS 'Stores organizer employee user accounts with foreign key constraints to organizers and admins';
COMMENT ON COLUMN organizer_employees.organizer_id IS 'Foreign key reference to the organizer this employee works for';
COMMENT ON COLUMN organizer_employees.created_by_admin_id IS 'Foreign key reference to the admin who created this employee account';
COMMENT ON COLUMN organizer_employees.role IS 'Always ORGANIZER_EMPLOYEE for this table';
COMMENT ON COLUMN organizer_employees.active IS 'Soft delete flag - FALSE means employee is deleted';
