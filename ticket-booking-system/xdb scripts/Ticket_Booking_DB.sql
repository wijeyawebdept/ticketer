-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Admin-focused)
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('USER', 'ORGANIZER', 'ADMIN')),
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Venues table
CREATE TABLE venues (
    venue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    capacity INTEGER NOT NULL,
    layout_type VARCHAR(50) CHECK (layout_type IN ('THEATER', 'GENERAL_ADMISSION', 'STADIUM')),
    seating_chart_config JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Connect to your database and run:
ALTER TABLE venues 
ADD COLUMN city VARCHAR(255) NOT NULL DEFAULT 'Unknown',
ADD COLUMN state VARCHAR(50) NOT NULL DEFAULT 'Unknown',
ADD COLUMN zip_code VARCHAR(10) NOT NULL DEFAULT '00000',
ADD COLUMN seating_layout JSONB;

-- Remove the default values after adding (optional)
ALTER TABLE venues ALTER COLUMN description DROP DEFAULT;
ALTER TABLE venues ALTER COLUMN city DROP DEFAULT;
ALTER TABLE venues ALTER COLUMN state DROP DEFAULT;
ALTER TABLE venues ALTER COLUMN zip_code DROP DEFAULT;

-- Events table
CREATE TABLE events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organizer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    venue_id UUID REFERENCES venues(venue_id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date TIMESTAMP NOT NULL,
    venue_name VARCHAR(255) NOT NULL,
    venue_address TEXT,
    category VARCHAR(100),
    image_url VARCHAR(500),
    total_seats INTEGER NOT NULL,
    available_seats INTEGER NOT NULL,
    base_price DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seats table
CREATE TABLE seats (
    seat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venue_id UUID REFERENCES venues(venue_id) ON DELETE CASCADE,
    event_id UUID REFERENCES events(event_id) ON DELETE CASCADE,
    section VARCHAR(50),
    row_number VARCHAR(10),
    seat_number VARCHAR(10),
    seat_type VARCHAR(20) CHECK (seat_type IN ('REGULAR', 'PREMIUM', 'VIP', 'ACCESSIBLE')),
    price DECIMAL(10,2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bookings table
CREATE TABLE bookings (
    booking_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    booking_reference VARCHAR(20) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    booking_fee DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    payment_method VARCHAR(50),
    payment_intent_id VARCHAR(255),
    booking_status VARCHAR(20) DEFAULT 'CONFIRMED' CHECK (booking_status IN ('CONFIRMED', 'CANCELLED', 'ATTENDED')),
    reserved_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Booking seats junction table
CREATE TABLE booking_seats (
    booking_seat_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(booking_id) ON DELETE CASCADE,
    seat_id UUID NOT NULL REFERENCES seats(seat_id) ON DELETE CASCADE,
    price_paid DECIMAL(10,2) NOT NULL,
    ticket_code VARCHAR(50) UNIQUE NOT NULL,
    qr_code TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table
CREATE TABLE transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID REFERENCES bookings(booking_id) ON DELETE SET NULL,
    payment_intent_id VARCHAR(255),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('PAYMENT', 'REFUND', 'CHARGEBACK')),
    status VARCHAR(20) CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED')),
    gateway_response JSONB,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_events_organizer ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_seats_event ON seats(event_id);
CREATE INDEX idx_seats_availability ON seats(is_available, event_id);
CREATE INDEX idx_bookings_user ON bookings(user_id);
CREATE INDEX idx_bookings_event ON bookings(event_id);
CREATE INDEX idx_bookings_reference ON bookings(booking_reference);
CREATE INDEX idx_bookings_status ON bookings(payment_status);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);

-- Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON venues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- check wether tables are connected or not properly
-- View all foreign key relationships
SELECT
    tc.table_name as "Table",
    kcu.column_name as "Column",
    ccu.table_name AS "References Table",
    ccu.column_name AS "References Column"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name;



select * from users;
select * from venues;
select * from seats;
select * from bookings;
select * from booking_seats;
select * from transactions;
select * from ticket_categories;
select * from events;
select * from roles;
select * from admins;
select * from recycle_bin;
select * from organizers;
select * from organizer_employees;
select * from event_schedules;

-- Check what columns exist in the tables
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'events' 
ORDER BY ordinal_position;



-- Check venue capacity vs actual template seats count
SELECT 
    v.venue_id,
    v.name as venue_name,
    v.capacity as declared_capacity,
    COUNT(s.seat_id) as actual_template_seats,
    (COUNT(s.seat_id) - v.capacity) as difference
FROM venues v
LEFT JOIN seats s ON s.venue_id = v.venue_id AND s.event_id IS NULL
GROUP BY v.venue_id, v.name, v.capacity
ORDER BY difference DESC;
