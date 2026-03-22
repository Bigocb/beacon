-- Phase 1: Enrichment & Analytics Schema Expansion
-- Adds support for: rich notes, tags, world metadata, analytics data

-- ============================================
-- TAGS TABLE - Normalize tag storage
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
  id VARCHAR(36) PRIMARY KEY,
  user_uuid VARCHAR(36) NOT NULL REFERENCES users(minecraft_uuid) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7),  -- Hex color for UI (e.g., #FF5733)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_uuid, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user_uuid ON tags(user_uuid);

-- ============================================
-- NOTES TABLE - Rich timestamped notes with tags
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id VARCHAR(36) PRIMARY KEY,
  save_id VARCHAR(36) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
  title VARCHAR(255),
  content TEXT NOT NULL,
  note_type VARCHAR(50) DEFAULT 'general',  -- 'general', 'milestone', 'issue', 'achievement'
  timestamp TIMESTAMP NOT NULL,  -- When the note was created (can be in past/future)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notes_save_id ON notes(save_id);
CREATE INDEX IF NOT EXISTS idx_notes_timestamp ON notes(timestamp);
CREATE INDEX IF NOT EXISTS idx_notes_type ON notes(note_type);

-- ============================================
-- NOTE_TAGS - Junction table for note-to-tag mapping
-- ============================================
CREATE TABLE IF NOT EXISTS note_tags (
  note_id VARCHAR(36) NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  tag_id VARCHAR(36) NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);

-- ============================================
-- WORLD METADATA - Custom fields for world enrichment
-- ============================================
CREATE TABLE IF NOT EXISTS world_metadata (
  save_id VARCHAR(36) PRIMARY KEY REFERENCES saves(id) ON DELETE CASCADE,
  description TEXT,
  is_favorite BOOLEAN DEFAULT false,
  theme_color VARCHAR(7),  -- Hex color for world card
  world_type VARCHAR(50),  -- 'survival', 'creative', 'adventure', 'spectator', 'modded'
  modpack_name VARCHAR(255),
  modpack_version VARCHAR(50),
  project_id VARCHAR(36),  -- For organizing into projects/series
  archived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_world_metadata_is_favorite ON world_metadata(is_favorite);
CREATE INDEX IF NOT EXISTS idx_world_metadata_project_id ON world_metadata(project_id);

-- ============================================
-- PROJECTS - Group related worlds together
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id VARCHAR(36) PRIMARY KEY,
  user_uuid VARCHAR(36) NOT NULL REFERENCES users(minecraft_uuid) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  archived_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_user_uuid ON projects(user_uuid);

-- ============================================
-- PLAYER ENRICHMENT - Track player-specific data
-- ============================================
CREATE TABLE IF NOT EXISTS player_enrichment (
  id VARCHAR(36) PRIMARY KEY,
  save_id VARCHAR(36) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
  player_uuid VARCHAR(36) NOT NULL,  -- Minecraft player UUID
  player_name VARCHAR(16),  -- Last known username
  total_play_time_ticks BIGINT DEFAULT 0,  -- Cumulative play time
  deaths INTEGER DEFAULT 0,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_json TEXT  -- Additional player stats as JSON
);

CREATE INDEX IF NOT EXISTS idx_player_enrichment_save_id ON player_enrichment(save_id);
CREATE INDEX IF NOT EXISTS idx_player_enrichment_player_uuid ON player_enrichment(player_uuid);
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_save_uuid ON player_enrichment(save_id, player_uuid);

-- ============================================
-- ANALYTICS SNAPSHOTS - Pre-computed stats for dashboard
-- ============================================
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id VARCHAR(36) PRIMARY KEY,
  save_id VARCHAR(36) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  play_time_ticks BIGINT,
  chunk_count INTEGER,
  entity_count INTEGER,
  tile_entity_count INTEGER,
  data_json TEXT,  -- Aggregated stats as JSON
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(save_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_save_id ON analytics_snapshots(save_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshot_date ON analytics_snapshots(snapshot_date);

-- ============================================
-- MILESTONES - Track progression goals
-- ============================================
CREATE TABLE IF NOT EXISTS milestones (
  id VARCHAR(36) PRIMARY KEY,
  save_id VARCHAR(36) NOT NULL REFERENCES saves(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  target_play_time_ticks BIGINT,  -- Goal play time
  achieved_at TIMESTAMP,
  position INTEGER DEFAULT 0,  -- For ordering
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_milestones_save_id ON milestones(save_id);
CREATE INDEX IF NOT EXISTS idx_milestones_achieved_at ON milestones(achieved_at);
