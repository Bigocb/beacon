-- Expand users table with profile fields (MVP)
-- SQLite: IF NOT EXISTS not supported in ALTER TABLE, columns added unconditionally
-- Note: Columns will be NULL for existing rows
ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255);
ALTER TABLE users ADD COLUMN theme_preference VARCHAR(50);
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;

-- Create index on last_login for sorting users by activity
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
