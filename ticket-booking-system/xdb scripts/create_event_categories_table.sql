-- Create event_categories table
-- This table stores different categories for events (e.g., Concert, Sports, Conference, etc.)

CREATE TABLE IF NOT EXISTS event_categories (
    category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    active INT NOT NULL DEFAULT 1, -- 1=active, 0=inactive, -1=deleted
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Drop unnecessary columns if they exist
ALTER TABLE event_categories DROP COLUMN IF EXISTS icon;
ALTER TABLE event_categories DROP COLUMN IF EXISTS color_code;
ALTER TABLE event_categories DROP COLUMN IF EXISTS created_by;
ALTER TABLE event_categories DROP COLUMN IF EXISTS updated_by;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_event_categories_active ON event_categories(active);

-- Add category_name column to events table instead of foreign key
ALTER TABLE events ADD COLUMN IF NOT EXISTS category_name VARCHAR(100);

-- Create index for faster lookups on category_name
CREATE INDEX IF NOT EXISTS idx_events_category_name ON events(category_name);

-- Insert default categories
INSERT INTO event_categories (category_id, category_name, description, active, created_at)
VALUES 
    (gen_random_uuid(), 'Concert', 'Live music performances and concerts', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Sports', 'Sports events and competitions', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Conference', 'Business conferences and seminars', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Theater', 'Theater plays and performances', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Festival', 'Cultural and music festivals', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Exhibition', 'Art exhibitions and trade shows', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Workshop', 'Educational workshops and training', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Comedy', 'Stand-up comedy shows', 1, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 'Other', 'Other types of events', 1, CURRENT_TIMESTAMP)
ON CONFLICT (category_name) DO NOTHING;

-- Verification queries
-- View all event categories
SELECT * FROM event_categories ORDER BY category_name;

-- View events with their category names
SELECT 
    e.event_id,
    e.name AS event_name,
    e.category_name,
    e.status,
    e.base_price
FROM events e 
ORDER BY e.name;
