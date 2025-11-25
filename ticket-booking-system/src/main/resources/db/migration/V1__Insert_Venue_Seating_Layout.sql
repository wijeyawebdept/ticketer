-- ============================================================================
-- VENUE SEATING LAYOUT INSERT SCRIPT
-- Creates template seating for a venue (776 total seats)
-- Layout: Rows A-S with varying seat counts per row
-- ============================================================================

-- First, ensure we have a venue to attach seats to
-- Replace 'YOUR_VENUE_ID' with actual UUID after creating venue in application

-- ROW A: 32 seats (A1-A32)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'MAIN', 'A', 'A', generate_series::text, 'REGULAR', 50.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 32);

-- ROW B: 34 seats (B1-B34)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'MAIN', 'B', 'B', generate_series::text, 'REGULAR', 50.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 34);

-- ROW C: 36 seats (C1-C36)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'MAIN', 'C', 'C', generate_series::text, 'REGULAR', 50.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 36);

-- ROW D: 38 seats (D1-D38)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'MAIN', 'D', 'D', generate_series::text, 'REGULAR', 50.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 38);

-- ROW E: 40 seats (E1-E40)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'MAIN', 'E', 'E', generate_series::text, 'PREMIUM', 75.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 40);

-- ROW F: 40 seats (F1-F40)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'MAIN', 'F', 'F', generate_series::text, 'PREMIUM', 75.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 40);

-- ROW G: 42 seats (G1-G42)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'MAIN', 'G', 'G', generate_series::text, 'PREMIUM', 75.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 42);

-- ROW H: 42 seats (H1-H42)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'MAIN', 'H', 'H', generate_series::text, 'PREMIUM', 75.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 42);

-- ROW I: 36 seats (I1-I36)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'MAIN', 'I', 'I', generate_series::text, 'VIP', 100.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 36);

-- ROW J: 40 seats (J1-J40)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'BALCONY', 'J', 'J', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 40);

-- ROW K: 44 seats (K1-K44)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'BALCONY', 'K', 'K', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 44);

-- ROW L: 44 seats (L1-L44)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'BALCONY', 'L', 'L', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 44);

-- ROW M: 44 seats (M1-M44)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'BALCONY', 'M', 'M', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 44);

-- ROW N: 44 seats (N1-N44)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'BALCONY', 'N', 'N', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 44);

-- ROW O: 44 seats (O1-O44)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'BALCONY', 'O', 'O', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 44);

-- ROW P: 44 seats (P1-P44)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'BALCONY', 'P', 'P', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 44);

-- ROW Q: 44 seats (Q1-Q44)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'BALCONY', 'Q', 'Q', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 44);

-- ROW R: 44 seats (R1-R44)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'BALCONY', 'R', 'R', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 44);

-- ROW S: 44 seats (S1-S44)
INSERT INTO seats (seat_id, venue_id, event_id, section, row_number, row, seat_number, seat_type, price, is_available, is_blocked, status, created_at)
SELECT uuid_generate_v4(), '34cc2ec4-8a25-42bb-ad7b-e101312a6891', NULL, 'BALCONY', 'S', 'S', generate_series::text, 'REGULAR', 45.00, true, false, 'AVAILABLE', CURRENT_TIMESTAMP
FROM generate_series(1, 44);

SELECT COUNT(*) FROM seats WHERE venue_id = '34cc2ec4-8a25-42bb-ad7b-e101312a6891' AND event_id IS NULL;

-- Summary: Total 776 seats created
-- Rows A-D: REGULAR (4 rows, 140 seats)
-- Rows E-H: PREMIUM (4 rows, 164 seats)
-- Row I: VIP (1 row, 36 seats)
-- Rows J-S: BALCONY REGULAR (10 rows, 436 seats)
