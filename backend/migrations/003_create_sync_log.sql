-- Create sync log table for tracking sync operations
CREATE TABLE IF NOT EXISTS sync_log (
  id VARCHAR(36) PRIMARY KEY,
  user_uuid VARCHAR(36) NOT NULL REFERENCES users(minecraft_uuid) ON DELETE CASCADE,
  event_type VARCHAR(50),  -- 'sync', 'conflict', 'error'
  payload TEXT,  -- JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_log_user_uuid ON sync_log(user_uuid);
CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON sync_log(created_at DESC);
