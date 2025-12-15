-- Make deleted_by nullable in recycle_bin table  
ALTER TABLE recycle_bin ALTER COLUMN deleted_by DROP NOT NULL; 
