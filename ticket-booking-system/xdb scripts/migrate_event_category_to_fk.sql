-- Migration script to convert category_name to foreign key relationship
-- This creates a proper FK constraint between events and event_categories

-- Step 1: Add category_id column to events table (nullable initially for migration)
ALTER TABLE events 
ADD COLUMN category_id UUID;

-- Step 2: Migrate existing category_name values to category_id
-- Match event category_name with event_categories.category_name and set the FK
UPDATE events e
SET category_id = ec.category_id
FROM event_categories ec
WHERE e.category_name = ec.category_name
  AND e.category_name IS NOT NULL;

-- Step 3: Add foreign key constraint with ON DELETE SET NULL
-- When a category is deleted, events will have their category_id set to NULL
ALTER TABLE events
ADD CONSTRAINT fk_event_category
FOREIGN KEY (category_id) 
REFERENCES event_categories(category_id) 
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 4: Create index on category_id for better query performance
CREATE INDEX idx_events_category_id ON events(category_id);

-- Step 5: Drop the category_name column (no longer needed)
ALTER TABLE events
DROP COLUMN category_name;

-- Verify the changes
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'events'
  AND tc.constraint_name = 'fk_event_category';
