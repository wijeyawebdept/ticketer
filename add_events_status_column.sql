-- Add status column to events table  
ALTER TABLE events ADD COLUMN status INTEGER DEFAULT 1;  
UPDATE events SET status = active;  
ALTER TABLE events ALTER COLUMN status SET NOT NULL;  
ALTER TABLE events DROP COLUMN active; 
