-- Migration: Add support for SCHEDULE entity type in recycle_bin table
-- This allows event schedules to be soft deleted and moved to recycle bin

-- Update entity_type constraint if it exists
ALTER TABLE recycle_bin DROP CONSTRAINT IF EXISTS recycle_bin_entity_type_check;

-- Add new constraint including all entity types
ALTER TABLE recycle_bin 
ADD CONSTRAINT recycle_bin_entity_type_check 
CHECK (entity_type IN ('USER', 'ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'EVENT', 'VENUE', 'SCHEDULE'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recycle_bin_entity_type_id 
ON recycle_bin(entity_type, entity_id);

-- Add comment
COMMENT ON TABLE recycle_bin IS 'Stores soft-deleted entities including users, events, venues, and schedules for potential restoration';
