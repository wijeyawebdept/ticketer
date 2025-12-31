-- Add google_id column to users table for Google OAuth integration
ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;

-- Add index for faster lookups
CREATE INDEX idx_users_google_id ON users(google_id);
