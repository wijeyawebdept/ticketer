-- ============================================================================
-- Add x_position and y_position columns to seats table
-- These columns are used for frontend seat map rendering
-- ============================================================================

-- Add x_position column (can be null for existing seats)
ALTER TABLE seats ADD COLUMN IF NOT EXISTS x_position INTEGER;

-- Add y_position column (can be null for existing seats)
ALTER TABLE seats ADD COLUMN IF NOT EXISTS y_position INTEGER;

-- Add comments for documentation
COMMENT ON COLUMN seats.x_position IS 'X coordinate for frontend seat map rendering (optional)';
COMMENT ON COLUMN seats.y_position IS 'Y coordinate for frontend seat map rendering (optional)';

-- Create index for faster queries when filtering by position
CREATE INDEX IF NOT EXISTS idx_seats_position ON seats(x_position, y_position) WHERE x_position IS NOT NULL AND y_position IS NOT NULL;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'seats'
  AND column_name IN ('x_position', 'y_position');
