-- Migration: Add owner tracking columns to recycle_bin table
-- This allows filtering recycle bin items by admin, organizer, organizer employee, or user

-- Add owner ID columns
ALTER TABLE recycle_bin 
ADD COLUMN admin_id UUID,
ADD COLUMN organizer_id UUID,
ADD COLUMN organizer_employee_id UUID,
ADD COLUMN user_id UUID;

-- Add comments for documentation
COMMENT ON COLUMN recycle_bin.admin_id IS 'Set if the deleted entity belongs to/was created by an admin';
COMMENT ON COLUMN recycle_bin.organizer_id IS 'Set if the deleted entity belongs to/was created by an organizer';
COMMENT ON COLUMN recycle_bin.organizer_employee_id IS 'Set if the deleted entity belongs to/was created by an organizer employee';
COMMENT ON COLUMN recycle_bin.user_id IS 'Set if the deleted entity belongs to/was created by a user';

-- Note: Only one of (admin_id, organizer_id, organizer_employee_id, user_id) should be set for each row
-- The column that is set indicates who owns the deleted entity

-- Optional: Add indexes for faster filtering
CREATE INDEX idx_recycle_bin_admin_id ON recycle_bin(admin_id) WHERE admin_id IS NOT NULL;
CREATE INDEX idx_recycle_bin_organizer_id ON recycle_bin(organizer_id) WHERE organizer_id IS NOT NULL;
CREATE INDEX idx_recycle_bin_organizer_employee_id ON recycle_bin(organizer_employee_id) WHERE organizer_employee_id IS NOT NULL;
CREATE INDEX idx_recycle_bin_user_id ON recycle_bin(user_id) WHERE user_id IS NOT NULL;
