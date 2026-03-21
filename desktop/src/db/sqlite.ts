import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs';

const trackerDir = path.join(os.homedir(), '.minecraft-tracker');

// Ensure tracker directory exists
if (!fs.existsSync(trackerDir)) {
  fs.mkdirSync(trackerDir, { recursive: true });
}

const dbPath = path.join(trackerDir, 'saves.db');
const db: any = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize schema
function initializeSchema() {
  try {
    db.exec(`
    CREATE TABLE IF NOT EXISTS saves (
      id TEXT PRIMARY KEY,
      user_uuid TEXT NOT NULL,
      folder_id TEXT,
      world_name TEXT NOT NULL,
      file_path TEXT,
      version TEXT,
      game_mode TEXT,
      difficulty INTEGER,
      seed INTEGER,
      play_time_ticks INTEGER,
      spawn_x INTEGER,
      spawn_y INTEGER,
      spawn_z INTEGER,
      custom_tags TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      last_played TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      synced BOOLEAN DEFAULT 0,
      FOREIGN KEY(user_uuid) REFERENCES auth(user_uuid) ON DELETE CASCADE,
      FOREIGN KEY(folder_id) REFERENCES save_folders(id) ON DELETE CASCADE,
      UNIQUE(user_uuid, folder_id, world_name)
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      save_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS backups (
      id TEXT PRIMARY KEY,
      save_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      file_path TEXT NOT NULL,
      size_mb REAL,
      backup_type TEXT DEFAULT 'manual',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(save_id) REFERENCES saves(id) ON DELETE CASCADE,
      UNIQUE(save_id, version)
    );

    CREATE TABLE IF NOT EXISTS auth (
      id TEXT PRIMARY KEY,
      user_uuid TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      token TEXT NOT NULL,
      token_expires_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS save_folders (
      id TEXT PRIMARY KEY,
      user_uuid TEXT NOT NULL,
      folder_path TEXT NOT NULL,
      display_name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_uuid) REFERENCES auth(user_uuid) ON DELETE CASCADE,
      UNIQUE(user_uuid, folder_path)
    );

    CREATE TABLE IF NOT EXISTS instance_metadata (
      folder_id TEXT PRIMARY KEY,
      mod_loader TEXT DEFAULT 'vanilla',
      loader_version TEXT,
      game_version TEXT,
      mod_count INTEGER DEFAULT 0,
      icon_path TEXT,
      instance_type TEXT DEFAULT 'vanilla',
      launcher TEXT,
      instance_name TEXT,
      folder_size_mb REAL,
      mods_folder_size_mb REAL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(folder_id) REFERENCES save_folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id TEXT PRIMARY KEY,
      instance_folder_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(instance_folder_id)
    );

    CREATE INDEX IF NOT EXISTS idx_saves_user_uuid ON saves(user_uuid);
    CREATE INDEX IF NOT EXISTS idx_saves_status ON saves(status);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_save_id ON sync_queue(save_id);
    CREATE INDEX IF NOT EXISTS idx_backups_save_id ON backups(save_id);
    CREATE INDEX IF NOT EXISTS idx_save_folders_user_uuid ON save_folders(user_uuid);
  `);
  } catch (error) {
    console.error('Error initializing database schema:', error);
  }
}

// Run migrations for existing databases
function runMigrations() {
  try {
    // Check and add missing columns to instance_metadata table
    const instanceTableInfo = db.prepare("PRAGMA table_info(instance_metadata)").all();
    const instanceColumnNames = instanceTableInfo.map((col: any) => col.name);

    const instanceRequiredColumns = {
      launcher: "TEXT",
      instance_name: "TEXT",
      folder_size_mb: "REAL",
      mods_folder_size_mb: "REAL",
      game_version: "TEXT"
    };

    for (const [columnName, columnType] of Object.entries(instanceRequiredColumns)) {
      if (!instanceColumnNames.includes(columnName)) {
        console.log(`Adding column ${columnName} to instance_metadata`);
        db.exec(`ALTER TABLE instance_metadata ADD COLUMN ${columnName} ${columnType}`);
      }
    }

    // Check and add missing columns to saves table for player data
    const savesTableInfo = db.prepare("PRAGMA table_info(saves)").all();
    const savesColumnNames = savesTableInfo.map((col: any) => col.name);

    const savesRequiredColumns = {
      health: "REAL",
      hunger: "REAL",
      level: "INTEGER",
      xp: "INTEGER",
      food_eaten: "INTEGER",
      beds_slept_in: "INTEGER",
      deaths: "INTEGER",
      blocks_mined: "INTEGER",
      blocks_placed: "INTEGER",
      items_crafted: "INTEGER",
      mobs_killed: "INTEGER",
      damage_taken: "REAL"
    };

    for (const [columnName, columnType] of Object.entries(savesRequiredColumns)) {
      if (!savesColumnNames.includes(columnName)) {
        console.log(`Adding column ${columnName} to saves`);
        db.exec(`ALTER TABLE saves ADD COLUMN ${columnName} ${columnType}`);
      }
    }
  } catch (error) {
    console.error('Error running migrations:', error);
  }
}

// Call initialization immediately when module loads
initializeSchema();
runMigrations();

// Export for main.ts to ensure it's called
export function initializeDatabase() {
  // Already initialized above, but exported for consistency
}

// Prepare queries
export const queries: any = {
  // Saves
  getAllSaves: db.prepare(`
    SELECT s.*, sf.display_name as folder_name FROM saves s
    LEFT JOIN save_folders sf ON s.folder_id = sf.id
    WHERE s.user_uuid = ? AND s.status != 'deleted'
    ORDER BY s.last_played DESC
  `),

  getSaveById: db.prepare('SELECT * FROM saves WHERE id = ?'),

  insertSave: db.prepare(`
    INSERT INTO saves (
      id, user_uuid, folder_id, world_name, file_path, version, game_mode,
      difficulty, seed, play_time_ticks, spawn_x, spawn_y, spawn_z,
      health, hunger, level, xp, food_eaten, beds_slept_in, deaths,
      blocks_mined, blocks_placed, items_crafted, mobs_killed, damage_taken
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  updateSave: db.prepare(`
    UPDATE saves SET
      notes = COALESCE(?, notes),
      status = COALESCE(?, status),
      custom_tags = COALESCE(?, custom_tags),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  updateSaveMetadata: db.prepare(`
    UPDATE saves SET
      version = ?,
      game_mode = ?,
      difficulty = ?,
      seed = ?,
      play_time_ticks = ?,
      spawn_x = ?,
      spawn_y = ?,
      spawn_z = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // Sync queue
  getQueuedChanges: db.prepare(`
    SELECT * FROM sync_queue ORDER BY created_at ASC
  `),

  addToQueue: db.prepare(`
    INSERT INTO sync_queue (id, save_id, operation, data)
    VALUES (?, ?, ?, ?)
  `),

  clearQueue: db.prepare('DELETE FROM sync_queue'),

  deleteFromQueue: db.prepare('DELETE FROM sync_queue WHERE id = ?'),

  // Backups
  getBackups: db.prepare(`
    SELECT * FROM backups WHERE save_id = ?
    ORDER BY version DESC
  `),

  createBackup: db.prepare(`
    INSERT INTO backups (id, save_id, version, file_path, size_mb, backup_type)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  // Auth
  // Check if auth exists to avoid CASCADE DELETE on REPLACE
  getAuthById: db.prepare('SELECT * FROM auth WHERE id = ?'),

  // Update existing auth entry
  updateAuth: db.prepare(`
    UPDATE auth SET
      user_uuid = ?,
      username = ?,
      token = ?,
      token_expires_at = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `),

  // Insert new auth entry
  insertAuth: db.prepare(`
    INSERT INTO auth (id, user_uuid, username, token, token_expires_at)
    VALUES (?, ?, ?, ?, ?)
  `),

  saveAuth: db.prepare(`
    INSERT INTO auth (id, user_uuid, username, token, token_expires_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      username = excluded.username,
      token = excluded.token,
      token_expires_at = excluded.token_expires_at,
      updated_at = CURRENT_TIMESTAMP
  `),

  getAuth: db.prepare('SELECT * FROM auth WHERE user_uuid = ?'),

  deleteAuth: db.prepare('DELETE FROM auth WHERE user_uuid = ?'),

  // Save Folders
  getSaveFolders: db.prepare(`
    SELECT * FROM save_folders WHERE user_uuid = ?
    ORDER BY created_at ASC
  `),

  addSaveFolder: db.prepare(`
    INSERT INTO save_folders (id, user_uuid, folder_path, display_name)
    VALUES (?, ?, ?, ?)
  `),

  removeSaveFolder: db.prepare(`
    DELETE FROM save_folders WHERE id = ? AND user_uuid = ?
  `),

  getSaveFolderById: db.prepare('SELECT * FROM save_folders WHERE id = ?'),

  // Instance Metadata
  getInstanceMetadata: db.prepare(`
    SELECT * FROM instance_metadata WHERE folder_id = ?
  `),

  saveInstanceMetadata: db.prepare(`
    INSERT OR REPLACE INTO instance_metadata (
      folder_id, mod_loader, loader_version, game_version, mod_count, icon_path, instance_type, launcher, instance_name, folder_size_mb, mods_folder_size_mb
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getAllInstanceMetadata: db.prepare(`
    SELECT im.*, sf.display_name, sf.folder_path, sf.user_uuid FROM instance_metadata im
    JOIN save_folders sf ON im.folder_id = sf.id
    WHERE sf.user_uuid = ?
  `),
};

export default db;
