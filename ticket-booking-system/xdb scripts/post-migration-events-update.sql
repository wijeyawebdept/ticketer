-- =====================================================
-- POST-MIGRATION UPDATE: Add created_by_type to events table
-- Run this after the main migration is complete
-- =====================================================

-- Add created_by_type column to events table
-- Drop and recreate to ensure clean state
ALTER TABLE events DROP COLUMN IF EXISTS created_by_type;
ALTER TABLE events ADD COLUMN created_by_type VARCHAR(20);

-- Update existing events with created_by_type based on current data
-- Since we don't have backup tables, we'll determine the type based on:
-- 1. If organizer_id exists in organizers table, it's an ORGANIZER event
-- 2. If created_by_user_id exists in admins table, creator was an ADMIN
-- 3. Otherwise, it's a USER event

-- First, mark events created by organizers (where organizer_id matches)
UPDATE events e
SET created_by_type = 'ADMIN'
WHERE e.organizer_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM organizers o WHERE o.organizer_id = e.organizer_id);

-- Mark events created by admins (check if created_by_user_id exists as admin_id)
-- This assumes created_by_user_id might now reference an admin_id
UPDATE events e
SET created_by_type = 'ADMIN'
WHERE created_by_type IS NULL
  AND e.created_by_user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM admins a WHERE a.admin_id = e.created_by_user_id);

-- Mark remaining events as USER type
UPDATE events
SET created_by_type = 'USER'
WHERE created_by_type IS NULL
  AND created_by_user_id IS NOT NULL;

-- Handle events with NULL created_by_user_id (shouldn't exist, but just in case)
UPDATE events
SET created_by_type = 'ADMIN'
WHERE created_by_type IS NULL;

-- Make the column NOT NULL after populating data
ALTER TABLE events ALTER COLUMN created_by_type SET NOT NULL;

-- Update organizer_id to reference organizers table instead of users
-- The organizer_id should now point to organizer_id in organizers table
-- Note: This assumes organizer relationships were already migrated

-- Drop old foreign key if it exists
ALTER TABLE events DROP CONSTRAINT IF EXISTS fk_events_organizer;
ALTER TABLE events DROP CONSTRAINT IF EXISTS fk_events_created_by;

-- CRITICAL: Clean up invalid organizer_id references BEFORE adding foreign key
-- Set organizer_id to NULL for events where the organizer no longer exists
UPDATE events
SET organizer_id = NULL
WHERE organizer_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM organizers o WHERE o.organizer_id = events.organizer_id);

-- Now add new foreign key for organizer_id -> organizers.organizer_id
-- This will work now because all invalid references have been set to NULL
ALTER TABLE events ADD CONSTRAINT fk_events_organizer 
    FOREIGN KEY (organizer_id) REFERENCES organizers(organizer_id) ON DELETE CASCADE;

-- Note: created_by_user_id is now just a UUID column without FK constraint
-- The created_by_type column tells us which table to look in (users/admins/organizers)

-- Verify the update
SELECT 
    created_by_type,
    COUNT(*) as event_count
FROM events
GROUP BY created_by_type;

COMMIT;
