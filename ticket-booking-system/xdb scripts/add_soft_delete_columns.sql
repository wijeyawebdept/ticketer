-- =====================================================
-- Soft Delete Implementation - Database Migration
-- =====================================================
-- Purpose: Add isDeleted columns to events and venues tables
--          to support soft delete functionality
-- Author: System
-- Date: 2025
-- =====================================================

-- Add isDeleted column to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Add isDeleted column to venues table
ALTER TABLE venues
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- Add indexes for performance on soft-deleted items queries
CREATE INDEX IF NOT EXISTS idx_events_is_deleted ON events(is_deleted);
CREATE INDEX IF NOT EXISTS idx_venues_is_deleted ON venues(is_deleted);

-- Add comment to document the columns
COMMENT ON COLUMN events.is_deleted IS 'Soft delete flag - true if event is moved to recycle bin';
COMMENT ON COLUMN venues.is_deleted IS 'Soft delete flag - true if venue is moved to recycle bin';

-- =====================================================
-- Verification Queries (Run after migration)
-- =====================================================

-- Verify columns were added
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name IN ('events', 'venues') AND column_name = 'is_deleted';

-- Verify indexes were created
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE tablename IN ('events', 'venues') AND indexname LIKE '%is_deleted%';

-- Check for any existing soft-deleted records
-- SELECT COUNT(*) as soft_deleted_events FROM events WHERE is_deleted = true;
-- SELECT COUNT(*) as soft_deleted_venues FROM venues WHERE is_deleted = true;

-- =====================================================
-- Rollback Script (if needed)
-- =====================================================

-- DROP INDEX IF EXISTS idx_events_is_deleted;
-- DROP INDEX IF EXISTS idx_venues_is_deleted;
-- ALTER TABLE events DROP COLUMN IF EXISTS is_deleted;
-- ALTER TABLE venues DROP COLUMN IF EXISTS is_deleted;
