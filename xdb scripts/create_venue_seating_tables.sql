-- Venue Seating System Tables (PostgreSQL)
-- This script creates tables for hard-coded venue seating layout with dynamic booking state

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS seat_bookings CASCADE;
DROP TABLE IF EXISTS venue_seats CASCADE;
DROP TABLE IF EXISTS seat_categories CASCADE;

-- Seat Categories (VIP, PREMIUM, REGULAR, BALCONY)
CREATE TABLE seat_categories (
    category_id SERIAL PRIMARY KEY,
    venue_id UUID NOT NULL,
    category_name VARCHAR(50) NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    color_code VARCHAR(7) NOT NULL, -- Hex color for UI
    display_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (venue_id) REFERENCES venues(venue_id),
    UNIQUE (venue_id, category_name) -- Category names must be unique per venue
);

-- Insert default seat categories for Kularathna Hall
-- Replace '54fd37e5-5a1c-4834-af83-ad9c8bf1f300' with the actual venue_id if different
INSERT INTO seat_categories (venue_id, category_name, base_price, color_code, display_order) VALUES
('54fd37e5-5a1c-4834-af83-ad9c8bf1f300', 'VIP Platinum', 7500.00, '#FF4444', 1),
('54fd37e5-5a1c-4834-af83-ad9c8bf1f300', 'VIP Gold', 5000.00, '#C41AE5', 2),
('54fd37e5-5a1c-4834-af83-ad9c8bf1f300', 'VIP Silver', 4000.00, '#6B7CFF', 3);

-- Venue Seats (Hard-coded layout with metadata)
CREATE TABLE venue_seats (
    seat_id VARCHAR(20) PRIMARY KEY, -- Format: SECTION-ROW-NUMBER (e.g., L-A-01, C-B-15)
    section VARCHAR(20) NOT NULL, -- LEFT, CENTER, RIGHT, BALCONY_LEFT, BALCONY_CENTER, BALCONY_RIGHT
    row_label VARCHAR(5) NOT NULL, -- A, B, C, D, etc.
    seat_number INT NOT NULL,
    category_id INT NOT NULL,
    x_position DECIMAL(8,2) NOT NULL, -- SVG/Canvas X coordinate
    y_position DECIMAL(8,2) NOT NULL, -- SVG/Canvas Y coordinate
    is_aisle_seat BOOLEAN DEFAULT FALSE,
    is_accessible BOOLEAN DEFAULT FALSE, -- Wheelchair accessible
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES seat_categories(category_id)
);

CREATE INDEX idx_section ON venue_seats(section);
CREATE INDEX idx_row ON venue_seats(row_label);
CREATE INDEX idx_category ON venue_seats(category_id);

-- Seat Bookings (Dynamic state per event schedule)
CREATE TABLE seat_bookings (
    booking_id BIGSERIAL PRIMARY KEY,
    seat_id VARCHAR(20) NOT NULL,
    event_schedule_id UUID NOT NULL,
    booking_ref_id BIGINT, -- Reference to main bookings table
    status VARCHAR(20) DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'TEMPORARY_HOLD', 'BOOKED', 'LOCKED', 'NOT_FOR_SALE')),
    price_override DECIMAL(10,2), -- Event-specific pricing
    hold_expires_at TIMESTAMP NULL, -- For temporary holds (5-minute timer)
    booked_by_user_id BIGINT,
    booked_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seat_id) REFERENCES venue_seats(seat_id),
    FOREIGN KEY (event_schedule_id) REFERENCES event_schedules(schedule_id),
    UNIQUE (seat_id, event_schedule_id)
);

CREATE INDEX idx_schedule ON seat_bookings(event_schedule_id);
CREATE INDEX idx_status ON seat_bookings(status);
CREATE INDEX idx_hold_expires ON seat_bookings(hold_expires_at);

-- Create view for easy seat availability queries
CREATE OR REPLACE VIEW vw_seat_availability AS
SELECT 
    vs.seat_id,
    vs.section,
    vs.row_label,
    vs.seat_number,
    sc.category_name,
    sc.color_code,
    COALESCE(sb.price_override, sc.base_price) as current_price,
    sb.event_schedule_id,
    COALESCE(sb.status, 'AVAILABLE') as status,
    vs.x_position,
    vs.y_position,
    vs.is_aisle_seat,
    vs.is_accessible
FROM venue_seats vs
CROSS JOIN event_schedules es
LEFT JOIN seat_bookings sb ON vs.seat_id = sb.seat_id AND es.schedule_id = sb.event_schedule_id
LEFT JOIN seat_categories sc ON vs.category_id = sc.category_id;
