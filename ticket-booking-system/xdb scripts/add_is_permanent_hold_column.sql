-- Migration script to add is_permanent_hold column to seats table
-- This column tracks whether a seat has been permanently held by an admin until the event ends

-- Add the is_permanent_hold column
ALTER TABLE seats
ADD COLUMN is_permanent_hold BOOLEAN DEFAULT false NOT NULL;

-- Add index for better query performance on permanent holds
CREATE INDEX idx_seats_is_permanent_hold ON seats(is_permanent_hold);

-- Optional: Add a comment to document the column
COMMENT ON COLUMN seats.is_permanent_hold IS 'Indicates if the seat is permanently held by an admin until the event ends (does not expire like temporary holds)';
