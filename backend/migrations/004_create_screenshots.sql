-- Create screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
  id VARCHAR(36) PRIMARY KEY,
  user_uuid VARCHAR(36) NOT NULL REFERENCES users(minecraft_uuid) ON DELETE CASCADE,
  save_id VARCHAR(36) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(1024),
  captured_at TIMESTAMP,
  user_tags TEXT,  -- JSON array
  caption TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_screenshots_save_id ON screenshots(save_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_user_uuid ON screenshots(user_uuid);
CREATE INDEX IF NOT EXISTS idx_screenshots_captured_at ON screenshots(captured_at);
