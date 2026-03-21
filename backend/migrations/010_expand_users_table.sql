-- Expand users table with profile fields (MVP)
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(50) DEFAULT 'dark';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;

-- Create index on last_login for sorting users by activity
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);
