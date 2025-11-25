-- ============================================================================
-- HELPER SCRIPT: Insert Venue Seating Layout for Specific Venue
-- Execute this AFTER creating a venue in your application
-- ============================================================================

-- Step 3: Run this script to insert 776 seats
DO $$
DECLARE
    v_venue_id UUID := '34cc2ec4-8a25-42bb-ad7b-e101312a6891'; -- VENUE ID
BEGIN
    -- ROW A: 32 seats
    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'MAIN', 'A', 'A', generate_series::text, 'REGULAR', 50.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 32);

    -- ROW B: 34 seats
    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'MAIN', 'B', 'B', generate_series::text, 'REGULAR', 50.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 34);

    -- ROW C: 36 seats
    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'MAIN', 'C', 'C', generate_series::text, 'REGULAR', 50.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 36);

    -- ROW D: 38 seats
    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'MAIN', 'D', 'D', generate_series::text, 'REGULAR', 50.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 38);

    -- ROW E: 40 seats (PREMIUM)
    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'MAIN', 'E', 'E', generate_series::text, 'PREMIUM', 75.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 40);

    -- ROW F: 40 seats (PREMIUM)
    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'MAIN', 'F', 'F', generate_series::text, 'PREMIUM', 75.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 40);

    -- ROW G: 42 seats (PREMIUM)
    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'MAIN', 'G', 'G', generate_series::text, 'PREMIUM', 75.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 42);

    -- ROW H: 42 seats (PREMIUM)
    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'MAIN', 'H', 'H', generate_series::text, 'PREMIUM', 75.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 42);

    -- ROW I: 36 seats (VIP)
    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'MAIN', 'I', 'I', generate_series::text, 'VIP', 100.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 36);

    -- BALCONY ROWS J-S: 40-44 seats each (REGULAR)
    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'BALCONY', 'J', 'J', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 40);

    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'BALCONY', 'K', 'K', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 44);

    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'BALCONY', 'L', 'L', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 44);

    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'BALCONY', 'M', 'M', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 44);

    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'BALCONY', 'N', 'N', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 44);

    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'BALCONY', 'O', 'O', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 44);

    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'BALCONY', 'P', 'P', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 44);

    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'BALCONY', 'Q', 'Q', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 44);

    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'BALCONY', 'R', 'R', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 44);

    INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
    SELECT uuid_generate_v4(), v_venue_id, NULL, 'BALCONY', 'S', 'S', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
    FROM generate_series(1, 44);

    RAISE NOTICE 'Successfully inserted 776 seats for venue %', v_venue_id;
END $$;

-- Step 4: Verify insertion
SELECT 
    section,
    row_number,
    COUNT(*) as seat_count,
    seat_type,
    price,
	seat_id
FROM seats
WHERE venue_id = '34cc2ec4-8a25-42bb-ad7b-e101312a6891' -- VENUE ID
  AND event_id IS NULL
GROUP BY section, row_number, seat_type, price, seat_id
ORDER BY row_number;

-- Step 5: Get total count
SELECT COUNT(*) as total_template_seats
FROM seats
WHERE venue_id = '34cc2ec4-8a25-42bb-ad7b-e101312a6891' -- VENUE ID
  AND event_id IS NULL;

-- Step 1: Delete all template seats for this venue
DELETE FROM seats 
WHERE venue_id = '34cc2ec4-8a25-42bb-ad7b-e101312a6891' 
  AND event_id IS NULL;

-- Step 2: Verify deletion
SELECT COUNT(*) FROM seats 
WHERE venue_id = '34cc2ec4-8a25-42bb-ad7b-e101312a6891' 
  AND event_id IS NULL;
-- Should return: 0

-- Step 3: Re-run the helper script (only ONCE this time!)
-- Make sure the venue_id in insert_venue_seats_helper.sql is set to:
-- '34cc2ec4-8a25-42bb-ad7b-e101312a6891'

