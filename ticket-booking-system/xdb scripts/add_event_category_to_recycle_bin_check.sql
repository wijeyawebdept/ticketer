-- Migration script to add EVENT_CATEGORY to recycle_bin_entity_type_check constraint
-- This allows event categories to be moved to the recycle bin

-- Drop the existing check constraint
ALTER TABLE recycle_bin DROP CONSTRAINT IF EXISTS recycle_bin_entity_type_check;

-- Add the updated constraint that includes EVENT_CATEGORY
ALTER TABLE recycle_bin ADD CONSTRAINT recycle_bin_entity_type_check 
CHECK (entity_type IN ('USER', 'EVENT', 'VENUE', 'SCHEDULE', 'EVENT_CATEGORY'));

-- Verify the constraint was updated successfully
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'recycle_bin_entity_type_check';
