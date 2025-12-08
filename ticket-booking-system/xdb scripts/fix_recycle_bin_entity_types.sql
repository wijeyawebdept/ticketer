-- Migration: Fix recycle_bin entity_type constraint to include all entity types
-- This allows admins, organizers, and organizer employees to be soft deleted

-- Drop the existing constraint
ALTER TABLE recycle_bin DROP CONSTRAINT IF EXISTS recycle_bin_entity_type_check;

-- Add new constraint including all entity types
ALTER TABLE recycle_bin 
ADD CONSTRAINT recycle_bin_entity_type_check 
CHECK (entity_type IN ('USER', 'ADMIN', 'ORGANIZER', 'ORGANIZER_EMPLOYEE', 'EVENT', 'VENUE', 'SCHEDULE'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'recycle_bin_entity_type_check';
