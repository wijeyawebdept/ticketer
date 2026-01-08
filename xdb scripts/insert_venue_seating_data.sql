-- Insert Hard-coded Venue Seating Layout (PostgreSQL)
-- This script populates the venue_seats table with the exact seating layout
-- Run this after creating the tables

-- Helper function to generate arc seats
CREATE OR REPLACE FUNCTION generate_arc_seats(
    p_section VARCHAR,
    p_row VARCHAR,
    p_count INT,
    p_category_id INT,
    p_center_x DECIMAL,
    p_center_y DECIMAL,
    p_radius DECIMAL,
    p_start_angle DECIMAL,
    p_end_angle DECIMAL
) RETURNS VOID AS $$
DECLARE
    i INT;
    angle DECIMAL;
    angle_step DECIMAL;
    x_pos DECIMAL;
    y_pos DECIMAL;
    seat_id_str VARCHAR;
BEGIN
    angle_step := (p_end_angle - p_start_angle) / (p_count - 1);
    
    FOR i IN 0..(p_count - 1) LOOP
        angle := p_start_angle + (i * angle_step);
        x_pos := p_center_x + (p_radius * COS(RADIANS(angle)));
        y_pos := p_center_y + (p_radius * SIN(RADIANS(angle)));
        seat_id_str := p_section || '-' || p_row || '-' || LPAD((i + 1)::TEXT, 2, '0');
        
        INSERT INTO venue_seats (seat_id, section, row_label, seat_number, category_id, x_position, y_position)
        VALUES (seat_id_str, p_section, p_row, i + 1, p_category_id, ROUND(x_pos, 2), ROUND(y_pos, 2));
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Helper function to generate straight row seats
CREATE OR REPLACE FUNCTION generate_straight_row(
    p_section VARCHAR,
    p_row VARCHAR,
    p_count INT,
    p_category_id INT,
    p_start_x DECIMAL,
    p_y DECIMAL,
    p_spacing DECIMAL
) RETURNS VOID AS $$
DECLARE
    i INT;
    x_pos DECIMAL;
    seat_id_str VARCHAR;
BEGIN
    FOR i IN 0..(p_count - 1) LOOP
        x_pos := p_start_x + (i * p_spacing);
        seat_id_str := p_section || '-' || p_row || '-' || LPAD((i + 1)::TEXT, 2, '0');
        
        INSERT INTO venue_seats (seat_id, section, row_label, seat_number, category_id, x_position, y_position)
        VALUES (seat_id_str, p_section, p_row, i + 1, p_category_id, ROUND(x_pos, 2), p_y);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Clear existing data
TRUNCATE TABLE venue_seats CASCADE;

-- Generate Orchestra Pit Section (OPT) - Curved rows A-G
SELECT generate_arc_seats('OPT', 'A', 24, 1, 400.00, 300.00, 180.00, 145.00, 215.00);
SELECT generate_arc_seats('OPT', 'B', 26, 1, 400.00, 300.00, 200.00, 145.00, 215.00);
SELECT generate_arc_seats('OPT', 'C', 28, 1, 400.00, 300.00, 220.00, 145.00, 215.00);
SELECT generate_arc_seats('OPT', 'D', 30, 1, 400.00, 300.00, 240.00, 145.00, 215.00);
SELECT generate_arc_seats('OPT', 'E', 32, 1, 400.00, 300.00, 260.00, 145.00, 215.00);
SELECT generate_arc_seats('OPT', 'F', 34, 1, 400.00, 300.00, 280.00, 145.00, 215.00);
SELECT generate_arc_seats('OPT', 'G', 36, 1, 400.00, 300.00, 300.00, 145.00, 215.00);

-- Generate Stalls Section (STL) - Curved rows H-P
SELECT generate_arc_seats('STL', 'H', 38, 2, 400.00, 300.00, 330.00, 145.00, 215.00);
SELECT generate_arc_seats('STL', 'I', 40, 2, 400.00, 300.00, 350.00, 145.00, 215.00);
SELECT generate_arc_seats('STL', 'J', 42, 2, 400.00, 300.00, 370.00, 145.00, 215.00);
SELECT generate_arc_seats('STL', 'K', 44, 2, 400.00, 300.00, 390.00, 145.00, 215.00);
SELECT generate_arc_seats('STL', 'L', 46, 2, 400.00, 300.00, 410.00, 145.00, 215.00);
SELECT generate_arc_seats('STL', 'M', 48, 2, 400.00, 300.00, 430.00, 145.00, 215.00);
SELECT generate_arc_seats('STL', 'N', 50, 2, 400.00, 300.00, 450.00, 145.00, 215.00);
SELECT generate_arc_seats('STL', 'O', 52, 2, 400.00, 300.00, 470.00, 145.00, 215.00);
SELECT generate_arc_seats('STL', 'P', 54, 2, 400.00, 300.00, 490.00, 145.00, 215.00);

SELECT * FROM seat_categories ORDER BY category_id;

-- Generate Circle Section (CRL) - Curved rows Q-U
SELECT generate_arc_seats('CRL', 'Q', 44, 3, 400.00, 300.00, 540.00, 155.00, 205.00);
SELECT generate_arc_seats('CRL', 'R', 46, 3, 400.00, 300.00, 560.00, 155.00, 205.00);
SELECT generate_arc_seats('CRL', 'S', 48, 3, 400.00, 300.00, 580.00, 155.00, 205.00);
SELECT generate_arc_seats('CRL', 'T', 50, 3, 400.00, 300.00, 600.00, 155.00, 205.00);
SELECT generate_arc_seats('CRL', 'U', 52, 3, 400.00, 300.00, 620.00, 155.00, 205.00);

-- Generate Balcony Section (BAL) - Straight rows V-Z (BALCONY = 5)
SELECT generate_straight_row('BAL', 'V', 30, 5, 100.00, 100.00, 20.00);
SELECT generate_straight_row('BAL', 'W', 32, 5, 90.00, 80.00, 20.00);
SELECT generate_straight_row('BAL', 'X', 34, 5, 80.00, 60.00, 20.00);
SELECT generate_straight_row('BAL', 'Y', 36, 5, 70.00, 40.00, 20.00);
SELECT generate_straight_row('BAL', 'Z', 38, 5, 60.00, 20.00, 20.00);

-- Drop the helper functions (optional - keep them if you need to regenerate data later)
-- DROP FUNCTION IF EXISTS generate_arc_seats(VARCHAR, VARCHAR, INT, INT, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL);
-- DROP FUNCTION IF EXISTS generate_straight_row(VARCHAR, VARCHAR, INT, INT, DECIMAL, DECIMAL, DECIMAL);

-- Verify insertion
SELECT 
    'Total Seats' as metric,
    COUNT(*) as count
FROM venue_seats
UNION ALL
SELECT 
    sc.category_name || ' Seats' as metric,
    COUNT(*) as count
FROM venue_seats vs
JOIN seat_categories sc ON vs.category_id = sc.category_id
GROUP BY sc.category_name, sc.display_order
ORDER BY metric;

-- Show seat distribution by section
SELECT 
    section,
    COUNT(*) as seat_count,
    STRING_AGG(DISTINCT row_label, ', ' ORDER BY row_label) as rows
FROM venue_seats
GROUP BY section
ORDER BY section;


SELECT 
    es.schedule_id,
    e.name as event_name,
    e.venue_name,
    es.schedule_date,
    es.start_time,
    es.end_time,
    es.available_seats,
    es.capacity
FROM event_schedules es
JOIN events e ON es.event_id = e.event_id
WHERE es.is_deleted = false
ORDER BY es.schedule_date DESC, es.start_time DESC
LIMIT 10;