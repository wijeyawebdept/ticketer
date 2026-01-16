-- Insert Kularathna Hall Seating Layout (PostgreSQL)
-- Total Seats: 603
-- VIP Platinum: 111 seats (Rows A-C)
-- VIP Gold: 133 seats (Rows D-F)
-- VIP Silver: 359 seats (Rows G-N)
-- Grid-based layout

-- Helper function to generate grid-based row seats
CREATE OR REPLACE FUNCTION generate_grid_row(
    p_venue_id UUID,
    p_section VARCHAR,
    p_row VARCHAR,
    p_count INT,
    p_category_id INT,
    p_start_x DECIMAL,
    p_y DECIMAL,
    p_spacing DECIMAL,
    p_start_seat_number INT DEFAULT 1
) RETURNS VOID AS $$
DECLARE
    i INT;
    x_pos DECIMAL;
    seat_id_str VARCHAR;
    seat_num INT;
BEGIN
    FOR i IN 0..(p_count - 1) LOOP
        x_pos := p_start_x + (i * p_spacing);
        seat_num := p_start_seat_number + i;
        seat_id_str := p_section || '-' || p_row || LPAD(seat_num::TEXT, 2, '0');
        
        INSERT INTO venue_seats (seat_id, section, row_label, seat_number, category_id, venue_id, x_position, y_position)
        VALUES (seat_id_str, p_section, p_row, seat_num, p_category_id, p_venue_id, ROUND(x_pos, 2), p_y);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Clear existing data
TRUNCATE TABLE venue_seats CASCADE;

-- Update seat category names to match Kularathna Hall requirements
UPDATE seat_categories SET category_name = 'VIP Platinum' WHERE category_id = 1;
UPDATE seat_categories SET category_name = 'VIP Gold' WHERE category_id = 2;
UPDATE seat_categories SET category_name = 'VIP Silver' WHERE category_id = 3;

select * from venue_seats;
SELECT venue_id, name FROM venues;

-- NOTE: Replace 1 with the actual venue_id for Kularathna Hall from your venues table
-- You can find it by running: SELECT venue_id, venue_name FROM venues;

-- VIP PLATINUM Section (Rows A-C) - 111 seats in 3 columns
-- Category ID 1 = VIP Platinum

-- Row A: 34 seats (13 + 8 + 13)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'A', 13, 1, 150.00, 175.00, 25.00, 1);   -- A1-A13 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'A', 8, 1, 650.00, 175.00, 25.00, 14);  -- A14-A21 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'A', 13, 1, 1150.00, 175.00, 25.00, 22);  -- A22-A34 (Right)

-- Row B: 37 seats (14 + 9 + 14)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'B', 14, 1, 150.00, 200.00, 25.00, 1);   -- B1-B14 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'B', 9, 1, 650.00, 200.00, 25.00, 15);  -- B15-B23 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'B', 14, 1, 1150.00, 200.00, 25.00, 24);  -- B24-B37 (Right)

-- Row C: 40 seats (15 + 11 + 14)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'C', 15, 1, 150.00, 225.00, 25.00, 1);   -- C1-C15 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'C', 11, 1, 650.00, 225.00, 25.00, 16);  -- C16-C26 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'C', 14, 1, 1150.00, 225.00, 25.00, 27);  -- C27-C40 (Right)

-- VIP GOLD Section (Rows D-F) - 133 seats in 3 columns
-- Category ID 2 = VIP Gold

-- Row D: 42 seats (15 + 13 + 14)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'D', 15, 2, 150.00, 250.00, 25.00, 1);   -- D1-D15 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'D', 13, 2, 650.00, 250.00, 25.00, 16);  -- D16-D28 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'D', 14, 2, 1150.00, 250.00, 25.00, 29);  -- D29-D42 (Right)

-- Row E: 44 seats (16 + 13 + 15)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'E', 16, 2, 150.00, 275.00, 25.00, 1);   -- E1-E16 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'E', 13, 2, 650.00, 275.00, 25.00, 17);  -- E17-E29 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'E', 15, 2, 1150.00, 275.00, 25.00, 30);  -- E30-E44 (Right)

-- Row F: 47 seats (17 + 13 + 17)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'F', 17, 2, 150.00, 300.00, 25.00, 1);   -- F1-F17 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'F', 13, 2, 650.00, 300.00, 25.00, 18);  -- F18-F30 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'F', 17, 2, 1150.00, 300.00, 25.00, 31);  -- F31-F47 (Right)

-- VIP SILVER Section (Rows G-N) - 359 seats in 3 columns
-- Category ID 3 = VIP Silver

-- Row G: 50 seats (18 + 14 + 18)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'G', 18, 3, 150.00, 325.00, 25.00, 1);   -- G1-G18 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'G', 14, 3, 650.00, 325.00, 25.00, 19);  -- G19-G32 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'G', 18, 3, 1150.00, 325.00, 25.00, 33);  -- G33-G50 (Right)

-- Row H: 50 seats (17 + 15 + 18)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'H', 17, 3, 150.00, 350.00, 25.00, 1);   -- H1-H17 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'H', 15, 3, 650.00, 350.00, 25.00, 18);  -- H18-H32 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'H', 18, 3, 1150.00, 350.00, 25.00, 33);  -- H33-H50 (Right)

-- Row I: 49 seats (16 + 16 + 17)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'I', 16, 3, 150.00, 375.00, 25.00, 1);   -- I1-I16 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'I', 16, 3, 650.00, 375.00, 25.00, 17);  -- I17-I32 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'I', 17, 3, 1150.00, 375.00, 25.00, 33);  -- I33-I49 (Right)

-- Row J: 48 seats (15 + 17 + 16)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'J', 15, 3, 150.00, 400.00, 25.00, 1);   -- J1-J15 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'J', 17, 3, 650.00, 400.00, 25.00, 16);  -- J16-J32 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'J', 16, 3, 1150.00, 400.00, 25.00, 33);  -- J33-J48 (Right)

-- Row K: 48 seats (15 + 18 + 15)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'K', 15, 3, 150.00, 425.00, 25.00, 1);   -- K1-K15 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'K', 18, 3, 650.00, 425.00, 25.00, 16);  -- K16-K33 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'K', 15, 3, 1150.00, 425.00, 25.00, 34);  -- K34-K48 (Right)

-- Row L: 48 seats (15 + 19 + 14)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'L', 15, 3, 150.00, 450.00, 25.00, 1);   -- L1-L15 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'L', 19, 3, 650.00, 450.00, 25.00, 16);  -- L16-L34 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'L', 14, 3, 1150.00, 450.00, 25.00, 35);  -- L35-L48 (Right)

-- Row M: 51 seats (16 + 20 + 15)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'M', 16, 3, 150.00, 475.00, 25.00, 1);   -- M1-M16 (Left)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'M', 20, 3, 650.00, 475.00, 25.00, 17);  -- M17-M36 (Middle)
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'M', 15, 3, 1150.00, 475.00, 25.00, 37);  -- M37-M51 (Right)

-- Row N: 15 seats (0 + 15 + 0) - Only middle section
SELECT generate_grid_row('54fd37e5-5a1c-4834-af83-ad9c8bf1f300'::UUID, 'KH', 'N', 15, 3, 650.00, 500.00, 25.00, 1);  -- N1-N15 (Middle only)

-- Drop the helper function (optional - keep it if you need to regenerate data later)
-- DROP FUNCTION IF EXISTS generate_grid_row(INT, VARCHAR, VARCHAR, INT, INT, DECIMAL, DECIMAL, DECIMAL);

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

-- Show seat distribution by row
SELECT 
    row_label,
    COUNT(*) as seat_count,
    MIN(seat_number) as first_seat,
    MAX(seat_number) as last_seat,
    sc.category_name
FROM venue_seats vs
JOIN seat_categories sc ON vs.category_id = sc.category_id
GROUP BY row_label, sc.category_name, vs.category_id
ORDER BY row_label;

-- Summary by category
SELECT 
    sc.category_name,
    COUNT(*) as total_seats,
    STRING_AGG(DISTINCT row_label, ', ' ORDER BY row_label) as rows
FROM venue_seats vs
JOIN seat_categories sc ON vs.category_id = sc.category_id
GROUP BY sc.category_name, sc.display_order
ORDER BY sc.display_order;

select * from seat_categories;