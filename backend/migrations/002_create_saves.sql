-- Create saves table
CREATE TABLE IF NOT EXISTS saves (
  id VARCHAR(36) PRIMARY KEY,
  user_uuid VARCHAR(36) NOT NULL REFERENCES users(minecraft_uuid) ON DELETE CASCADE,
  world_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(1024),
  version VARCHAR(50),
  game_mode VARCHAR(20),
  difficulty INTEGER,
  seed BIGINT,
  play_time_ticks BIGINT DEFAULT 0,
  spawn_x INTEGER,
  spawn_y INTEGER,
  spawn_z INTEGER,
  custom_tags TEXT,  -- JSON array
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  last_played TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  synced BOOLEAN DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_saves_user_uuid ON saves(user_uuid);
CREATE INDEX IF NOT EXISTS idx_saves_world_name ON saves(world_name);
CREATE INDEX IF NOT EXISTS idx_saves_last_played ON saves(last_played);
CREATE INDEX IF NOT EXISTS idx_saves_status ON saves(status);
