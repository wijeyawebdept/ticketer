-- Fix venue seating coordinates to match Kularathna Auditorium curved layout
-- This updates the x_position and y_position for all 1034 seats

-- Delete existing seats to regenerate with correct positions
TRUNCATE TABLE venue_seats CASCADE;

-- Function to generate semicircle arc seats (radial from center point)
CREATE OR REPLACE FUNCTION generate_semicircle_seats(
    section_code TEXT,
    category_id_param INT,
    start_row TEXT,
    num_rows INT,
    seats_per_row INT,
    center_x NUMERIC,
    center_y NUMERIC,
    start_radius NUMERIC,
    radius_increment NUMERIC,
    start_angle_degrees NUMERIC,
    end_angle_degrees NUMERIC
) RETURNS VOID AS $$
DECLARE
    row_index INT;
    seat_index INT;
    current_radius NUMERIC;
    angle_step NUMERIC;
    current_angle NUMERIC;
    x_pos NUMERIC;
    y_pos NUMERIC;
    row_label TEXT;
    start_row_index INT;
BEGIN
    start_row_index := ASCII(start_row) - ASCII('A');
    
    FOR row_index IN 0..(num_rows - 1) LOOP
        row_label := CHR(ASCII('A') + start_row_index + row_index);
        current_radius := start_radius + (row_index * radius_increment);
        angle_step := (end_angle_degrees - start_angle_degrees) / (seats_per_row - 1);
        
        FOR seat_index IN 1..seats_per_row LOOP
            current_angle := start_angle_degrees + ((seat_index - 1) * angle_step);
            x_pos := center_x + (current_radius * COS(RADIANS(current_angle)));
            y_pos := center_y + (current_radius * SIN(RADIANS(current_angle)));
            
            INSERT INTO venue_seats (
                seat_id, section, row_label, seat_number,
                x_position, y_position, category_id,
                is_aisle_seat, is_accessible, created_at
            ) VALUES (
                section_code || '-' || row_label || '-' || LPAD(seat_index::TEXT, 2, '0'),
                section_code,
                row_label,
                seat_index,
                ROUND(x_pos, 2),
                ROUND(y_pos, 2),
                category_id_param,
                FALSE,
                FALSE,
                CURRENT_TIMESTAMP
            );
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- PREMIUM (CRL) - Main bulk of seats, center semicircle, BLUE - 12 rows, 20 seats = 240
SELECT generate_semicircle_seats(
    'CRL', 3, 'A', 12, 20,
    400, 50,        -- center point (x, y)
    180, 22,        -- start radius, increment
    25, 155         -- 130° arc (25° to 155°)
);

-- VIP_RED (OPT) - Small cluster center-top, RED - 10 rows, 21 seats = 210
SELECT generate_semicircle_seats(
    'OPT', 1, 'M', 10, 21,
    400, 50,
    450, 18,
    40, 140         -- 100° arc, above blue
);

-- VIP_PURPLE (STL) - Wrapping sides, PURPLE - 18 rows, 23 seats = 414  
SELECT generate_semicircle_seats(
    'STL', 2, 'W', 18, 23,
    400, 50,
    630, 20,
    15, 165         -- 150° wide arc
);

-- REGULAR (BAL) - Far sides, GREEN/YELLOW - Convert BALCONY to show sides - 10 rows, 17 seats = 170
SELECT generate_semicircle_seats(
    'BAL', 4, 'V', 10, 17,
    400, 50,
    990, 22,
    5, 175          -- 170° widest arc, far sides
);

-- Drop the helper function
DROP FUNCTION IF EXISTS generate_semicircle_seats;

-- Drop the helper function
DROP FUNCTION IF EXISTS generate_theater_row_seats;

-- Verify seat counts
SELECT 
    section,
    sc.category_name,
    sc.color_code,
    COUNT(*) as seat_count
FROM venue_seats vs
JOIN seat_categories sc ON vs.category_id = sc.category_id
GROUP BY section, sc.category_name, sc.color_code, sc.display_order
ORDER BY sc.display_order;

-- Total count
SELECT COUNT(*) as total_seats FROM venue_seats;
