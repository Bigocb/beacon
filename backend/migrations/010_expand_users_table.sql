-- Expand users table with profile fields (MVP)
-- Note: These columns may already exist in some installations
-- This migration is idempotent - subsequent runs are safe

-- Create index on last_login for sorting users by activity
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
