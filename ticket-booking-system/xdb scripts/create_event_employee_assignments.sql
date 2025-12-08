-- Migration: Create event_employee_assignments table for many-to-many relationship
-- This allows organizers to assign employees to events

CREATE TABLE IF NOT EXISTS event_employee_assignments (
    assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    employee_id UUID NOT NULL,
    assigned_by_organizer_id UUID NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    role_description VARCHAR(255),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Foreign keys
    CONSTRAINT fk_assignment_event FOREIGN KEY (event_id) 
        REFERENCES events(event_id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_employee FOREIGN KEY (employee_id) 
        REFERENCES organizer_employees(employee_id) ON DELETE CASCADE,
    CONSTRAINT fk_assignment_organizer FOREIGN KEY (assigned_by_organizer_id) 
        REFERENCES organizers(organizer_id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate assignments
    CONSTRAINT uk_event_employee_active UNIQUE (event_id, employee_id, is_active)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_assignments_event_id ON event_employee_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_employee_id ON event_employee_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_assignments_organizer_id ON event_employee_assignments(assigned_by_organizer_id);
CREATE INDEX IF NOT EXISTS idx_assignments_active ON event_employee_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_event_employee ON event_employee_assignments(event_id, employee_id);

-- Add comments
COMMENT ON TABLE event_employee_assignments IS 'Junction table for many-to-many relationship between events and organizer employees';
COMMENT ON COLUMN event_employee_assignments.role_description IS 'Role or responsibility of the employee for this event (e.g., Event Manager, Ticket Validator)';
COMMENT ON COLUMN event_employee_assignments.is_active IS 'Soft delete flag - false means assignment has been removed';

-- Verify the table was created
SELECT 'event_employee_assignments table created successfully' AS status;
