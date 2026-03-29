import pool from './connection';

/**
 * Initialize all required database tables
 */
export async function initializeDatabase() {
  try {
    console.log('🗄️ [Database] Initializing tables...');

    // Create tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        minecraft_uuid TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        auth_token TEXT,
        avatar_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS save_folders (
        id TEXT PRIMARY KEY,
        user_uuid TEXT NOT NULL,
        folder_path TEXT NOT NULL,
        display_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_uuid) REFERENCES users(minecraft_uuid)
      );
    `);

    await pool.query(`
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
        health INTEGER,
        hunger INTEGER,
        level INTEGER,
        xp REAL,
        food_eaten INTEGER,
        beds_slept_in INTEGER,
        deaths INTEGER,
        blocks_mined INTEGER,
        blocks_placed INTEGER,
        items_crafted INTEGER,
        mobs_killed INTEGER,
        damage_taken REAL,
        last_played DATETIME,
        instance_name TEXT,
        mod_loader TEXT,
        loader_version TEXT,
        game_version TEXT,
        instance_type TEXT,
        launcher TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (user_uuid) REFERENCES users(minecraft_uuid),
        FOREIGN KEY (folder_id) REFERENCES save_folders(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        user_uuid TEXT NOT NULL,
        instance_folder_id TEXT NOT NULL,
        PRIMARY KEY (user_uuid, instance_folder_id),
        FOREIGN KEY (user_uuid) REFERENCES users(minecraft_uuid),
        FOREIGN KEY (instance_folder_id) REFERENCES save_folders(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        user_uuid TEXT NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_uuid) REFERENCES users(minecraft_uuid),
        UNIQUE(user_uuid, name)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        save_id TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        note_type TEXT DEFAULT 'general',
        timestamp DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        deleted_at DATETIME,
        FOREIGN KEY (save_id) REFERENCES saves(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS milestones (
        id TEXT PRIMARY KEY,
        save_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        target_play_time_ticks INTEGER,
        achieved_at DATETIME,
        position INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (save_id) REFERENCES saves(id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS world_metadata (
        save_id TEXT PRIMARY KEY,
        description TEXT,
        is_favorite BOOLEAN DEFAULT 0,
        theme_color TEXT DEFAULT '#64748b',
        world_type TEXT DEFAULT 'survival',
        modpack_name TEXT,
        modpack_version TEXT,
        project_id TEXT,
        archived_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (save_id) REFERENCES saves(id)
      );
    `);

    // Add missing columns to existing tables (for migrations)
    const columnsToAdd = [
      { table: 'saves', column: 'instance_name', type: 'TEXT' },
      { table: 'saves', column: 'mod_loader', type: 'TEXT' },
      { table: 'saves', column: 'loader_version', type: 'TEXT' },
      { table: 'saves', column: 'game_version', type: 'TEXT' },
      { table: 'saves', column: 'instance_type', type: 'TEXT' },
      { table: 'saves', column: 'launcher', type: 'TEXT' },
    ];

    // Add migration columns (skip if they already exist)
    for (const { table, column, type } of columnsToAdd) {
      try {
        await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
        console.log(`  ✅ Added column ${table}.${column}`);
      } catch (err: any) {
        // Column already exists, which is fine during migration
        if (err.message?.includes('duplicate column')) {
          console.log(`  ℹ️ Column ${table}.${column} already exists`);
        } else {
          throw err;
        }
      }
    }

    // Create indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_saves_user_uuid ON saves(user_uuid);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_saves_folder_id ON saves(folder_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_saves_deleted_at ON saves(deleted_at);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notes_save_id ON notes(save_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_milestones_save_id ON milestones(save_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_tags_user_uuid ON tags(user_uuid);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_folders_user_uuid ON save_folders(user_uuid);`);

    console.log('✅ [Database] All tables initialized successfully');
  } catch (error) {
    console.error('❌ [Database] Initialization error:', error);
    throw error;
  }
}
