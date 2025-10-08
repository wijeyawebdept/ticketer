-- Migration to add profile_picture column to users table
-- Execute this SQL script against your PostgreSQL database

ALTER TABLE users 
ADD COLUMN profile_picture VARCHAR(500) NULL;

-- Add comment to the column
COMMENT ON COLUMN users.profile_picture IS 'File path to user profile picture';