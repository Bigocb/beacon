-- Create backups table
CREATE TABLE IF NOT EXISTS backups (
  id VARCHAR(36) PRIMARY KEY,
  user_uuid VARCHAR(36) NOT NULL REFERENCES users(minecraft_uuid) ON DELETE CASCADE,
  save_id VARCHAR(36) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  backup_type VARCHAR(50) DEFAULT 'manual',  -- 'manual' or 'auto'
  file_path VARCHAR(1024) NOT NULL,
  size_mb DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50),  -- 'desktop' or 'web'
  UNIQUE(save_id, version)
);

CREATE INDEX IF NOT EXISTS idx_backups_save_id ON backups(save_id);
CREATE INDEX IF NOT EXISTS idx_backups_user_uuid ON backups(user_uuid);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at DESC);
