-- Migration: Remove date-related columns from events table
-- Date: 2025-11-20
-- Reason: These columns are no longer needed as events now use event_schedules table for date/time management
-- Columns to remove: start_date_time, end_date_time, end_date

-- Check if columns exist and remove them
DO $$ 
BEGIN
    -- Remove start_date_time column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'start_date_time'
    ) THEN
        ALTER TABLE events DROP COLUMN start_date_time;
        RAISE NOTICE 'Column start_date_time dropped successfully';
    ELSE
        RAISE NOTICE 'Column start_date_time does not exist';
    END IF;

    -- Remove end_date_time column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'end_date_time'
    ) THEN
        ALTER TABLE events DROP COLUMN end_date_time;
        RAISE NOTICE 'Column end_date_time dropped successfully';
    ELSE
        RAISE NOTICE 'Column end_date_time does not exist';
    END IF;

    -- Remove end_date column if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'events' 
        AND column_name = 'end_date'
    ) THEN
        ALTER TABLE events DROP COLUMN end_date;
        RAISE NOTICE 'Column end_date dropped successfully';
    ELSE
        RAISE NOTICE 'Column end_date does not exist';
    END IF;
END $$;

-- Verify the columns have been removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name IN ('start_date_time', 'end_date_time', 'end_date');
