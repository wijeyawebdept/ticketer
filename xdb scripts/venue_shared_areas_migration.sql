-- Migration script to add shared/common areas support for venues
-- Simplified approach: Add columns to venues table, use existing ticket_categories for pricing
-- Shared area bookings go through regular booking flow, just without specific seat assignments

-- =====================================================
-- 1. Add shared area columns to venues table
-- =====================================================
ALTER TABLE venues 
ADD COLUMN IF NOT EXISTS has_shared_areas BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_area_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shared_area_total_capacity INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN venues.has_shared_areas IS 'Whether this venue has shared/common standing areas without individual seats';
COMMENT ON COLUMN venues.shared_area_count IS 'Number of shared areas in this venue (e.g., 2 for Balcony and Standing Area 1)';
COMMENT ON COLUMN venues.shared_area_total_capacity IS 'Total capacity across all shared areas (separate from seated capacity)';

-- =====================================================
-- 2. Add shared area indicator to ticket_categories
-- =====================================================
-- Use existing ticket_categories table for pricing
-- Just add a flag to identify which categories are for shared areas
ALTER TABLE ticket_categories
ADD COLUMN IF NOT EXISTS is_shared_area BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_area_number INTEGER DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN ticket_categories.is_shared_area IS 'True if this category represents a shared/standing area ticket';
COMMENT ON COLUMN ticket_categories.shared_area_number IS 'Which shared area this represents (1, 2, 3, etc.) - maps to display order';

-- Create index for filtering shared area categories
CREATE INDEX IF NOT EXISTS idx_ticket_categories_shared_area ON ticket_categories(is_shared_area);

-- =====================================================
-- 3. Add shared area indicator to booking_seats table
-- =====================================================
-- Reuse existing booking_seats table, but allow NULL seat_id for shared areas
ALTER TABLE booking_seats
ADD COLUMN IF NOT EXISTS is_shared_area_ticket BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS shared_area_number INTEGER DEFAULT NULL;

-- Modify seat_id constraint to allow NULL for shared area tickets
ALTER TABLE booking_seats
ALTER COLUMN seat_id DROP NOT NULL;

-- Add comments
COMMENT ON COLUMN booking_seats.is_shared_area_ticket IS 'True if this booking is for a shared area (standing ticket)';
COMMENT ON COLUMN booking_seats.shared_area_number IS 'Which shared area this ticket is for (1=first area, 2=second, etc.)';

-- Add constraint: either seat_id OR (is_shared_area_ticket AND shared_area_number) must be set
ALTER TABLE booking_seats
ADD CONSTRAINT chk_seat_or_shared_area 
CHECK (
    (seat_id IS NOT NULL AND is_shared_area_ticket = false) OR
    (seat_id IS NULL AND is_shared_area_ticket = true AND shared_area_number IS NOT NULL)
);

-- =====================================================
-- 4. Create function to get shared area available capacity
-- =====================================================
CREATE OR REPLACE FUNCTION get_shared_area_available_capacity(
    p_event_schedule_id UUID,
    p_shared_area_number INTEGER,
    p_venue_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_total_capacity INTEGER;
    v_capacity_per_area INTEGER;
    v_booked_count INTEGER;
BEGIN
    -- Get total shared area capacity from venue
    SELECT shared_area_total_capacity, shared_area_count
    INTO v_total_capacity, v_capacity_per_area
    FROM venues
    WHERE id = p_venue_id;
    
    -- Calculate capacity per area (evenly distributed)
    IF v_capacity_per_area > 0 THEN
        v_capacity_per_area := v_total_capacity / v_capacity_per_area;
    ELSE
        v_capacity_per_area := 0;
    END IF;
    
    -- Get currently booked count for this shared area
    SELECT COUNT(*)
    INTO v_booked_count
    FROM booking_seats bs
    JOIN bookings b ON b.id = bs.booking_id
    WHERE b.event_schedule_id = p_event_schedule_id
        AND bs.is_shared_area_ticket = true
        AND bs.shared_area_number = p_shared_area_number
        AND b.status IN ('CONFIRMED', 'PENDING');
    
    -- Return available capacity
    RETURN GREATEST(0, v_capacity_per_area - v_booked_count);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_shared_area_available_capacity IS 'Calculate remaining capacity for a specific shared area in an event';

-- =====================================================
-- 5. Update Kularathna Stadium with shared area
-- =====================================================
DO $$
DECLARE
    v_venue_id UUID;
BEGIN
    -- Find Kularathna Stadium
    SELECT venue_id INTO v_venue_id
    FROM venues
    WHERE LOWER(name) LIKE '%kularathna%'
    LIMIT 1;
    
    -- Update venue to have 1 shared area (Balcony)
    IF v_venue_id IS NOT NULL THEN
        UPDATE venues
        SET has_shared_areas = true,
            shared_area_count = 1,
            shared_area_total_capacity = 200
        WHERE venue_id = v_venue_id;
        
        RAISE NOTICE 'Updated Kularathna Stadium with Balcony shared area (capacity: 200)';
    END IF;
END $$;

-- =====================================================
-- 6. Create view for shared area booking summary
-- =====================================================
CREATE OR REPLACE VIEW v_shared_area_bookings AS
SELECT 
    b.id as booking_id,
    b.user_id,
    b.event_schedule_id,
    es.event_id,
    e.title as event_title,
    v.name as venue_name,
    bs.shared_area_number,
    COUNT(*) as ticket_count,
    SUM(bs.price) as total_price,
    b.status,
    b.created_at
FROM bookings b
JOIN booking_seats bs ON bs.booking_id = b.id
JOIN event_schedules es ON es.id = b.event_schedule_id
JOIN events e ON e.id = es.event_id
JOIN venues v ON v.id = es.venue_id
WHERE bs.is_shared_area_ticket = true
GROUP BY b.id, b.user_id, b.event_schedule_id, es.event_id, e.title, v.name, bs.shared_area_number, b.status, b.created_at;

COMMENT ON VIEW v_shared_area_bookings IS 'Summary view of all shared area bookings with ticket counts';

-- =====================================================
-- 7. Helper view for venue shared area capacity
-- =====================================================
CREATE OR REPLACE VIEW v_venue_shared_areas AS
SELECT 
    v.venue_id as venue_id,
    v.name as venue_name,
    v.has_shared_areas,
    v.shared_area_count,
    v.shared_area_total_capacity,
    CASE 
        WHEN v.shared_area_count > 0 
        THEN v.shared_area_total_capacity / v.shared_area_count 
        ELSE 0 
    END as capacity_per_area
FROM venues v
WHERE v.has_shared_areas = true;

COMMENT ON VIEW v_venue_shared_areas IS 'List of all venues with shared areas and their capacities';

COMMENT ON SCRIPT IS 'Simplified migration to add shared/common areas support. Uses existing tables (venues, ticket_categories, booking_seats) instead of creating new ones.';
