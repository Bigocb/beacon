-- Save folders table for managing custom Minecraft save locations
CREATE TABLE IF NOT EXISTS save_folders (
  id TEXT PRIMARY KEY,
  user_uuid TEXT NOT NULL,
  folder_path TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_uuid) REFERENCES users(minecraft_uuid) ON DELETE CASCADE,
  UNIQUE(user_uuid, folder_path)
);

CREATE INDEX IF NOT EXISTS idx_save_folders_user_uuid ON save_folders(user_uuid);
