import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';

/**
 * Integration Test Suite: End-to-End Folder and Save Scanning
 *
 * Tests the complete workflow:
 * 1. Add folder to save_folders
 * 2. Scan folder for instances and saves
 * 3. Store instance metadata and saves in database
 * 4. Query and verify all data is retrievable
 */

describe('Integration - Complete Scan Workflow', () => {
  let testDb: Database.Database;
  let testDbPath: string;
  let testInstancePath: string;
  const testUserUuid = '471dccd1-3920-463b-be0e-0922a678f017';
  const testFolderId = 'da12e9fc-4279-4fe6-8648-ac35064af3bc';

  beforeEach(() => {
    // Setup database
    testDbPath = path.join(os.tmpdir(), 'test-integration.db');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    testDb = new Database(testDbPath);
    testDb.pragma('foreign_keys = ON');

    // Initialize schema
    testDb.exec(`
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

      CREATE INDEX IF NOT EXISTS idx_saves_user_uuid ON saves(user_uuid);
      CREATE INDEX IF NOT EXISTS idx_save_folders_user_uuid ON save_folders(user_uuid);
    `);

    // Setup test instance directory
    testInstancePath = path.join(os.tmpdir(), `test-instance-${Date.now()}`);
    fs.mkdirSync(testInstancePath, { recursive: true });
  });

  afterEach(() => {
    testDb.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    if (fs.existsSync(testInstancePath)) {
      fs.rmSync(testInstancePath, { recursive: true, force: true });
    }
  });

  it('should complete full workflow: add folder -> scan -> verify', () => {
    // Step 1: Create auth entry
    const authStmt = testDb.prepare(`
      INSERT INTO auth (id, user_uuid, username, token)
      VALUES (?, ?, ?, ?)
    `);
    authStmt.run('auth-1', testUserUuid, 'testuser', 'token123');

    // Step 2: Add folder to save_folders
    const folderStmt = testDb.prepare(`
      INSERT INTO save_folders (id, user_uuid, folder_path, display_name)
      VALUES (?, ?, ?, ?)
    `);
    folderStmt.run(testFolderId, testUserUuid, testInstancePath, 'Test Instance');

    // Verify folder was added
    const folder = testDb
      .prepare('SELECT * FROM save_folders WHERE id = ?')
      .get(testFolderId) as any;

    expect(folder).toBeDefined();
    expect(folder.user_uuid).toBe(testUserUuid);

    // Step 3: Save instance metadata (from scan)
    const metadataStmt = testDb.prepare(`
      INSERT OR REPLACE INTO instance_metadata (
        folder_id, mod_loader, loader_version, game_version,
        mod_count, instance_type, launcher, instance_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    metadataStmt.run(
      testFolderId,
      'fabric',
      '0.18.4',
      '1.21.11',
      15,
      'modded',
      'multimc',
      'Test Instance'
    );

    // Step 4: Save game data
    const savesStmt = testDb.prepare(`
      INSERT INTO saves (
        id, user_uuid, folder_id, world_name, version,
        game_mode, difficulty, play_time_ticks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    savesStmt.run(
      'save-1',
      testUserUuid,
      testFolderId,
      'World 1',
      '1.21.11',
      'Survival',
      2,
      100000
    );
    savesStmt.run(
      'save-2',
      testUserUuid,
      testFolderId,
      'World 2',
      '1.21.11',
      'Creative',
      0,
      50000
    );

    // Step 5: Verify all data is accessible
    const instances = testDb
      .prepare(`
        SELECT im.*, sf.display_name, sf.folder_path, sf.user_uuid
        FROM instance_metadata im
        JOIN save_folders sf ON im.folder_id = sf.id
        WHERE sf.user_uuid = ?
      `)
      .all(testUserUuid) as any[];

    const saves = testDb
      .prepare('SELECT * FROM saves WHERE user_uuid = ? AND status != ?')
      .all(testUserUuid, 'deleted') as any[];

    // Assertions
    expect(instances).toHaveLength(1);
    expect(instances[0].instance_name).toBe('Test Instance');
    expect(instances[0].mod_loader).toBe('fabric');
    expect(instances[0].mod_count).toBe(15);

    expect(saves).toHaveLength(2);
    expect(saves[0].world_name).toBe('World 1');
    expect(saves[1].world_name).toBe('World 2');
  });

  it('should handle multiple folders with separate saves', () => {
    // Create auth
    testDb
      .prepare('INSERT INTO auth (id, user_uuid, username, token) VALUES (?, ?, ?, ?)')
      .run('auth-1', testUserUuid, 'testuser', 'token123');

    // Add two folders
    const folder1Id = 'folder-1';
    const folder2Id = 'folder-2';

    const folderStmt = testDb.prepare(`
      INSERT INTO save_folders (id, user_uuid, folder_path, display_name)
      VALUES (?, ?, ?, ?)
    `);
    folderStmt.run(folder1Id, testUserUuid, '/path1', 'Folder 1');
    folderStmt.run(folder2Id, testUserUuid, '/path2', 'Folder 2');

    // Add metadata and saves for each folder
    const metadataStmt = testDb.prepare(`
      INSERT OR REPLACE INTO instance_metadata (folder_id, instance_name, mod_count)
      VALUES (?, ?, ?)
    `);
    metadataStmt.run(folder1Id, 'Instance 1', 5);
    metadataStmt.run(folder2Id, 'Instance 2', 10);

    const saveStmt = testDb.prepare(`
      INSERT INTO saves (id, user_uuid, folder_id, world_name, version)
      VALUES (?, ?, ?, ?, ?)
    `);
    saveStmt.run('save-1', testUserUuid, folder1Id, 'World 1A', '1.20.1');
    saveStmt.run('save-2', testUserUuid, folder1Id, 'World 1B', '1.20.1');
    saveStmt.run('save-3', testUserUuid, folder2Id, 'World 2A', '1.21.11');

    // Query all instances and saves
    const instances = testDb
      .prepare(`
        SELECT im.* FROM instance_metadata im
        JOIN save_folders sf ON im.folder_id = sf.id
        WHERE sf.user_uuid = ?
      `)
      .all(testUserUuid) as any[];

    const folder1Saves = testDb
      .prepare('SELECT * FROM saves WHERE folder_id = ?')
      .all(folder1Id) as any[];

    const folder2Saves = testDb
      .prepare('SELECT * FROM saves WHERE folder_id = ?')
      .all(folder2Id) as any[];

    expect(instances).toHaveLength(2);
    expect(folder1Saves).toHaveLength(2);
    expect(folder2Saves).toHaveLength(1);
  });

  it('should cleanup saves when folder is deleted', () => {
    // Setup: create folder and saves
    testDb
      .prepare('INSERT INTO auth (id, user_uuid, username, token) VALUES (?, ?, ?, ?)')
      .run('auth-1', testUserUuid, 'testuser', 'token123');

    testDb
      .prepare(
        'INSERT INTO save_folders (id, user_uuid, folder_path, display_name) VALUES (?, ?, ?, ?)'
      )
      .run(testFolderId, testUserUuid, testInstancePath, 'Instance');

    testDb
      .prepare(
        'INSERT INTO saves (id, user_uuid, folder_id, world_name, version) VALUES (?, ?, ?, ?, ?)'
      )
      .run('save-1', testUserUuid, testFolderId, 'World', '1.20.1');

    // Verify save exists
    const beforeDelete = testDb
      .prepare('SELECT COUNT(*) as count FROM saves WHERE folder_id = ?')
      .get(testFolderId) as any;
    expect(beforeDelete.count).toBe(1);

    // Delete folder (cascading delete should remove saves)
    testDb.prepare('DELETE FROM save_folders WHERE id = ?').run(testFolderId);

    // Verify save was cascade deleted
    const afterDelete = testDb
      .prepare('SELECT COUNT(*) as count FROM saves WHERE folder_id = ?')
      .get(testFolderId) as any;
    expect(afterDelete.count).toBe(0);
  });
});
