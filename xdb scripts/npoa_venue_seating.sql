-- ============================================================================
-- NPOA Venue Seating Layout
-- Total Seats: 850 (25 rows × 34 seats per row)
-- VIP Platinum: 102 seats (Rows A-C)
-- VIP Gold: 442 seats (Rows D-P)
-- VIP Silver: 306 seats (Rows Q-Y)
-- ============================================================================

-- STEP 1: Clear existing data ONLY for this venue (f2ca9b05-b1c6-4cf5-9083-1194543d5898)
DELETE FROM venue_seats WHERE venue_id = 'f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID;

-- STEP 2: Helper function (reuse existing one if already created)
CREATE OR REPLACE FUNCTION generate_npoa_row(
    p_venue_id UUID,
    p_section VARCHAR,
    p_row VARCHAR,
    p_count INT,
    p_category_id INT,
    p_start_x DECIMAL,
    p_y DECIMAL,
    p_spacing DECIMAL,
    p_start_seat_number INT DEFAULT 1,
    p_align VARCHAR DEFAULT 'center'
) RETURNS VOID AS $$
DECLARE
    i INT;
    x_pos DECIMAL;
    seat_id_str VARCHAR;
    seat_num INT;
    adjusted_start_x DECIMAL;
BEGIN
    -- Adjust starting position based on alignment
    IF p_align = 'right' THEN
        adjusted_start_x := p_start_x - ((p_count - 1) * p_spacing);
    ELSIF p_align = 'center' THEN
        adjusted_start_x := p_start_x - ((p_count - 1) * p_spacing / 2);
    ELSE
        adjusted_start_x := p_start_x;
    END IF;
    
    FOR i IN 0..(p_count - 1) LOOP
        x_pos := adjusted_start_x + (i * p_spacing);
        seat_num := p_start_seat_number + i;
        seat_id_str := p_section || '-' || p_row || LPAD(seat_num::TEXT, 2, '0');
        
        INSERT INTO venue_seats (seat_id, section, row_label, seat_number, category_id, venue_id, x_position, y_position)
        VALUES (seat_id_str, p_section, p_row, seat_num, p_category_id, p_venue_id, ROUND(x_pos, 2), p_y);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: VIP PLATINUM Section (Rows A-C) - 102 seats
-- Row A: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'A', 34, 1, 600.00, 150.00, 25.00, 1, 'center');

-- Row B: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'B', 34, 1, 600.00, 175.00, 25.00, 1, 'center');

-- Row C: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'C', 34, 1, 600.00, 200.00, 25.00, 1, 'center');

-- STEP 4: VIP GOLD Section (Rows D-P) - 442 seats
-- Row D: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'D', 34, 2, 600.00, 225.00, 25.00, 1, 'center');

-- Row E: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'E', 34, 2, 600.00, 250.00, 25.00, 1, 'center');

-- Row F: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'F', 34, 2, 600.00, 275.00, 25.00, 1, 'center');

-- Row G: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'G', 34, 2, 600.00, 300.00, 25.00, 1, 'center');

-- Row H: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'H', 34, 2, 600.00, 325.00, 25.00, 1, 'center');

-- Row I: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'I', 34, 2, 600.00, 350.00, 25.00, 1, 'center');

-- Row J: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'J', 34, 2, 600.00, 375.00, 25.00, 1, 'center');

-- Row K: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'K', 34, 2, 600.00, 400.00, 25.00, 1, 'center');

-- Row L: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'L', 34, 2, 600.00, 425.00, 25.00, 1, 'center');

-- Row M: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'M', 34, 2, 600.00, 450.00, 25.00, 1, 'center');

-- Row N: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'N', 34, 2, 600.00, 475.00, 25.00, 1, 'center');

-- Row O: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'O', 34, 2, 600.00, 500.00, 25.00, 1, 'center');

-- Row P: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'P', 34, 2, 600.00, 525.00, 25.00, 1, 'center');

-- STEP 5: VIP SILVER Section (Rows Q-Y) - 306 seats
-- Row Q: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'Q', 34, 3, 600.00, 550.00, 25.00, 1, 'center');

-- Row R: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'R', 34, 3, 600.00, 575.00, 25.00, 1, 'center');

-- Row S: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'S', 34, 3, 600.00, 600.00, 25.00, 1, 'center');

-- Row T: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'T', 34, 3, 600.00, 625.00, 25.00, 1, 'center');

-- Row U: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'U', 34, 3, 600.00, 650.00, 25.00, 1, 'center');

-- Row V: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'V', 34, 3, 600.00, 675.00, 25.00, 1, 'center');

-- Row W: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'W', 34, 3, 600.00, 700.00, 25.00, 1, 'center');

-- Row X: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'X', 34, 3, 600.00, 725.00, 25.00, 1, 'center');

-- Row Y: 34 seats
SELECT generate_npoa_row('f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID, 'NPOA', 'Y', 34, 3, 600.00, 750.00, 25.00, 1, 'center');

-- STEP 6: Verification Queries for NPOA Venue ONLY
-- Total seat count for NPOA venue
SELECT 
    'NPOA Total Seats' as metric,
    COUNT(*) as count
FROM venue_seats
WHERE venue_id = 'f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID;

-- Seat count by category for NPOA venue
SELECT 
    sc.category_name,
    COUNT(*) as seat_count
FROM venue_seats vs
JOIN seat_categories sc ON vs.category_id = sc.category_id
WHERE vs.venue_id = 'f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID
GROUP BY sc.category_name, sc.display_order
ORDER BY sc.display_order;

-- Seat distribution by row for NPOA venue
SELECT 
    row_label,
    COUNT(*) as seat_count,
    MIN(seat_number) as first_seat,
    MAX(seat_number) as last_seat,
    sc.category_name
FROM venue_seats vs
JOIN seat_categories sc ON vs.category_id = sc.category_id
WHERE vs.venue_id = 'f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID
GROUP BY row_label, sc.category_name, vs.category_id
ORDER BY row_label;

-- Verify total seats across ALL venues (to ensure we didn't delete other venues)
SELECT 
    v.name as venue_name,
    COUNT(vs.seat_id) as total_seats
FROM venues v
LEFT JOIN venue_seats vs ON v.venue_id = vs.venue_id
GROUP BY v.venue_id, v.name
ORDER BY v.name;

-- Sample of NPOA seats to verify seat_id format
SELECT seat_id, row_label, seat_number, category_id
FROM venue_seats
WHERE venue_id = 'f2ca9b05-b1c6-4cf5-9083-1194543d5898'::UUID
ORDER BY row_label, seat_number
LIMIT 20;

-- STEP 7 (Optional): Drop the helper function if no longer needed
-- DROP FUNCTION IF EXISTS generate_npoa_row(UUID, VARCHAR, VARCHAR, INT, INT, DECIMAL, DECIMAL, DECIMAL, INT, VARCHAR);