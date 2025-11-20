-- Create event_schedules table for managing multiple dates/times for events
CREATE TABLE IF NOT EXISTS event_schedules (
    schedule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL,
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 100,
    available_seats INTEGER NOT NULL DEFAULT 100,
    price_adjustment DECIMAL(10, 2) DEFAULT 0.00, -- Price difference from base price (+/-)
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CANCELLED, SOLD_OUT, COMPLETED
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    CONSTRAINT fk_event_schedules_event FOREIGN KEY (event_id) 
        REFERENCES events(event_id) ON DELETE CASCADE,
    
    CONSTRAINT check_time_valid CHECK (end_time > start_time),
    CONSTRAINT check_capacity_positive CHECK (capacity > 0),
    CONSTRAINT check_available_seats CHECK (available_seats >= 0 AND available_seats <= capacity)
);

-- Create indexes for better performance
CREATE INDEX idx_event_schedules_event_id ON event_schedules(event_id);
CREATE INDEX idx_event_schedules_date ON event_schedules(schedule_date);
CREATE INDEX idx_event_schedules_status ON event_schedules(status);
CREATE INDEX idx_event_schedules_not_deleted ON event_schedules(is_deleted) WHERE is_deleted = false;

-- Create composite index for common queries
CREATE INDEX idx_event_schedules_event_date ON event_schedules(event_id, schedule_date);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_schedules_updated_at
    BEFORE UPDATE ON event_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_event_schedules_updated_at();

-- Sample data (optional)
COMMENT ON TABLE event_schedules IS 'Stores multiple date/time schedules for events, allowing events to run on different dates';
COMMENT ON COLUMN event_schedules.schedule_id IS 'Unique identifier for the schedule';
COMMENT ON COLUMN event_schedules.event_id IS 'Reference to the parent event';
COMMENT ON COLUMN event_schedules.schedule_date IS 'Date when this schedule runs';
COMMENT ON COLUMN event_schedules.start_time IS 'Start time for this schedule';
COMMENT ON COLUMN event_schedules.end_time IS 'End time for this schedule';
COMMENT ON COLUMN event_schedules.capacity IS 'Total capacity for this specific schedule';
COMMENT ON COLUMN event_schedules.available_seats IS 'Remaining available seats for this schedule';
COMMENT ON COLUMN event_schedules.price_adjustment IS 'Price adjustment from base event price (can be positive or negative)';
COMMENT ON COLUMN event_schedules.status IS 'Status of this schedule: ACTIVE, CANCELLED, SOLD_OUT, COMPLETED';


-- Migration: Add schedule_id to bookings table
-- Description: Links bookings to specific event schedules (date/time slots)
-- Date: 2025-11-20

-- Step 1: Add schedule_id column (nullable initially for existing bookings)
ALTER TABLE bookings 
ADD COLUMN schedule_id UUID;

-- Step 2: Add foreign key constraint to event_schedules
ALTER TABLE bookings 
ADD CONSTRAINT fk_booking_schedule 
FOREIGN KEY (schedule_id) 
REFERENCES event_schedules(schedule_id) 
ON DELETE RESTRICT;

-- Step 3: Create index for performance
CREATE INDEX idx_bookings_schedule_id ON bookings(schedule_id);

-- Step 4: Add composite index for event + schedule queries
CREATE INDEX idx_bookings_event_schedule ON bookings(event_id, schedule_id);

-- Note: For existing bookings without schedule_id, you may need to:
-- 1. Create default schedules for events that don't have them yet
-- 2. Assign existing bookings to those schedules
-- 3. Then make schedule_id NOT NULL with: ALTER TABLE bookings ALTER COLUMN schedule_id SET NOT NULL;

-- Optional: Add comment to the column
COMMENT ON COLUMN bookings.schedule_id IS 'References the specific event schedule (date/time slot) for this booking';
