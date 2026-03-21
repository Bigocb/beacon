-- Create favorites table for persisting favorited instances
CREATE TABLE IF NOT EXISTS favorites (
  id VARCHAR(36) PRIMARY KEY,
  user_uuid VARCHAR(36) NOT NULL REFERENCES users(minecraft_uuid) ON DELETE CASCADE,
  instance_folder_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique constraint to prevent duplicate favorites
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_user_instance ON favorites(user_uuid, instance_folder_id);

-- Create index for quick lookups by user
CREATE INDEX IF NOT EXISTS idx_favorites_user_uuid ON favorites(user_uuid);
