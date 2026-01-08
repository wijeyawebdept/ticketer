-- Add venue_id foreign key to venue_seats and seat_categories tables
-- This allows multiple venues to have their own seating layouts and pricing

-- Step 1: Add venue_id column to seat_categories table
ALTER TABLE seat_categories 
ADD COLUMN venue_id VARCHAR(255);

-- Step 2: Add venue_id column to venue_seats table
ALTER TABLE venue_seats 
ADD COLUMN venue_id VARCHAR(255);

-- Step 3: Update existing data to reference Kularathna Auditorium
-- First, get the venue_id for Kularathna Auditorium
DO $$
DECLARE
    kularathna_venue_id VARCHAR(255);
BEGIN
    -- Find Kularathna Auditorium venue_id
    SELECT venue_id INTO kularathna_venue_id 
    FROM venues 
    WHERE name ILIKE '%Kularathna%' 
    LIMIT 1;
    
    -- If found, update existing records
    IF kularathna_venue_id IS NOT NULL THEN
        UPDATE seat_categories SET venue_id = kularathna_venue_id WHERE venue_id IS NULL;
        UPDATE venue_seats SET venue_id = kularathna_venue_id WHERE venue_id IS NULL;
        
        RAISE NOTICE 'Updated existing records with venue_id: %', kularathna_venue_id;
    ELSE
        RAISE WARNING 'Kularathna Auditorium not found in venues table!';
    END IF;
END $$;

-- Step 4: Make venue_id NOT NULL (after data is populated)
ALTER TABLE seat_categories 
ALTER COLUMN venue_id SET NOT NULL;

ALTER TABLE venue_seats 
ALTER COLUMN venue_id SET NOT NULL;

-- Step 5: Add foreign key constraints
ALTER TABLE seat_categories 
ADD CONSTRAINT fk_seat_categories_venue 
FOREIGN KEY (venue_id) 
REFERENCES venues(venue_id) 
ON DELETE CASCADE;

ALTER TABLE venue_seats 
ADD CONSTRAINT fk_venue_seats_venue 
FOREIGN KEY (venue_id) 
REFERENCES venues(venue_id) 
ON DELETE CASCADE;

-- Step 6: Update composite unique constraints to include venue_id
-- Drop old constraint on seat_categories if exists
ALTER TABLE seat_categories 
DROP CONSTRAINT IF EXISTS seat_categories_category_name_key;

-- Add new composite unique constraint (venue_id + category_name)
ALTER TABLE seat_categories 
ADD CONSTRAINT uk_seat_categories_venue_name 
UNIQUE (venue_id, category_name);

-- Update primary key on venue_seats to include venue_id
-- First drop the dependent foreign key from seat_bookings
ALTER TABLE seat_bookings 
DROP CONSTRAINT IF EXISTS seat_bookings_seat_id_fkey;

-- Drop existing primary key
ALTER TABLE venue_seats 
DROP CONSTRAINT IF EXISTS venue_seats_pkey CASCADE;

-- Add new composite primary key
ALTER TABLE venue_seats 
ADD CONSTRAINT venue_seats_pkey 
PRIMARY KEY (venue_id, seat_id);

-- Recreate the foreign key from seat_bookings
ALTER TABLE seat_bookings
ADD CONSTRAINT seat_bookings_seat_id_fkey
FOREIGN KEY (seat_id) 
REFERENCES venue_seats(seat_id)
ON DELETE RESTRICT;

-- Step 7: Create indexes for better query performance
CREATE INDEX idx_seat_categories_venue_id ON seat_categories(venue_id);
CREATE INDEX idx_venue_seats_venue_id ON venue_seats(venue_id);
CREATE INDEX idx_venue_seats_category ON venue_seats(venue_id, category_id);

-- Verify the changes
SELECT 
    'seat_categories' as table_name,
    venue_id,
    COUNT(*) as record_count
FROM seat_categories
GROUP BY venue_id

UNION ALL

SELECT 
    'venue_seats' as table_name,
    venue_id,
    COUNT(*) as record_count
FROM venue_seats
GROUP BY venue_id;

-- Show foreign key constraints
SELECT
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name IN ('venue_seats', 'seat_categories')
ORDER BY tc.table_name;
