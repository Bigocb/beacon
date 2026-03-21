import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import Database from 'better-sqlite3';

/**
 * Backend Test Suite: Scanner and Database Persistence
 *
 * Tests for the data persistence issue where instances are saved
 * to the database but not retrieved properly.
 *
 * Critical Tests:
 * - Instance metadata saves correctly
 * - save_folders entries are created with correct user_uuid
 * - getAllInstanceMetadata JOIN query returns results
 */

describe('Scanner Database Persistence', () => {
  let testDb: Database.Database;
  let testDbPath: string;
  const testUserUuid = '471dccd1-3920-463b-be0e-0922a678f017';
  const testFolderId = 'da12e9fc-4279-4fe6-8648-ac35064af3bc';

  beforeEach(() => {
    // Create a test database
    testDbPath = path.join(os.tmpdir(), 'test-beacon.db');
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
  });

  afterEach(() => {
    testDb.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('should create save_folders entry with correct user_uuid', () => {
    // Create auth entry first
    const authStmt = testDb.prepare(`
      INSERT INTO auth (id, user_uuid, username, token)
      VALUES (?, ?, ?, ?)
    `);
    authStmt.run('auth-1', testUserUuid, 'testuser', 'token123');

    // Create save_folders entry
    const folderStmt = testDb.prepare(`
      INSERT INTO save_folders (id, user_uuid, folder_path, display_name)
      VALUES (?, ?, ?, ?)
    `);
    folderStmt.run(
      testFolderId,
      testUserUuid,
      '/path/to/saves',
      'Test Folder'
    );

    // Verify the entry was created
    const result = testDb
      .prepare('SELECT * FROM save_folders WHERE id = ?')
      .get(testFolderId) as any;

    expect(result).toBeDefined();
    expect(result.user_uuid).toBe(testUserUuid);
    expect(result.folder_path).toBe('/path/to/saves');
  });

  it('should save instance_metadata and retrieve with JOIN query', () => {
    // Setup: Create auth and folder
    testDb
      .prepare('INSERT INTO auth (id, user_uuid, username, token) VALUES (?, ?, ?, ?)')
      .run('auth-1', testUserUuid, 'testuser', 'token123');

    testDb
      .prepare(
        'INSERT INTO save_folders (id, user_uuid, folder_path, display_name) VALUES (?, ?, ?, ?)'
      )
      .run(testFolderId, testUserUuid, '/path/to/saves', 'Test Folder');

    // Save instance metadata
    testDb
      .prepare(`
        INSERT OR REPLACE INTO instance_metadata (
          folder_id, mod_loader, loader_version, game_version, mod_count,
          icon_path, instance_type, launcher, instance_name
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        testFolderId,
        'fabric',
        '0.18.4',
        '1.21.11',
        5,
        null,
        'modded',
        'multimc',
        'Test Instance'
      );

    // Test the JOIN query that getInstanceMetadata uses
    const query = `
      SELECT im.*, sf.display_name, sf.folder_path, sf.user_uuid
      FROM instance_metadata im
      JOIN save_folders sf ON im.folder_id = sf.id
      WHERE sf.user_uuid = ?
    `;

    const results = testDb.prepare(query).all(testUserUuid) as any[];

    expect(results).toHaveLength(1);
    expect(results[0].folder_id).toBe(testFolderId);
    expect(results[0].instance_name).toBe('Test Instance');
    expect(results[0].user_uuid).toBe(testUserUuid);
    expect(results[0].mod_loader).toBe('fabric');
  });

  it('should return 0 instances if save_folders entry is missing', () => {
    // This simulates the bug scenario

    // Temporarily disable foreign keys for this test to simulate orphaned data
    testDb.exec('PRAGMA foreign_keys = OFF');

    try {
      // Create instance_metadata WITHOUT creating save_folders entry
      testDb
        .prepare(`
          INSERT OR REPLACE INTO instance_metadata (
            folder_id, mod_loader, instance_name
          ) VALUES (?, ?, ?)
        `)
        .run(testFolderId, 'fabric', 'Orphaned Instance');

      // Try to query with JOIN - should return empty due to missing save_folders
      const query = `
        SELECT im.*, sf.display_name, sf.folder_path, sf.user_uuid
        FROM instance_metadata im
        JOIN save_folders sf ON im.folder_id = sf.id
        WHERE sf.user_uuid = ?
      `;

      const results = testDb.prepare(query).all(testUserUuid) as any[];

      // This demonstrates the isolation: orphaned instance_metadata isn't returned in JOIN query
      expect(results).toHaveLength(0);
    } finally {
      // Re-enable foreign keys
      testDb.exec('PRAGMA foreign_keys = ON');
    }
  });

  it('should save and retrieve saves with folder_id', () => {
    // Setup
    testDb
      .prepare('INSERT INTO auth (id, user_uuid, username, token) VALUES (?, ?, ?, ?)')
      .run('auth-1', testUserUuid, 'testuser', 'token123');

    testDb
      .prepare(
        'INSERT INTO save_folders (id, user_uuid, folder_path, display_name) VALUES (?, ?, ?, ?)'
      )
      .run(testFolderId, testUserUuid, '/path/to/saves', 'Test Folder');

    // Save a save record
    testDb
      .prepare(`
        INSERT INTO saves (
          id, user_uuid, folder_id, world_name, version, game_mode, difficulty,
          play_time_ticks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        'save-1',
        testUserUuid,
        testFolderId,
        'Test World',
        '1.21.11',
        'Survival',
        2,
        100000
      );

    // Retrieve saves
    const saves = testDb
      .prepare(
        'SELECT * FROM saves WHERE user_uuid = ? AND status != ?'
      )
      .all(testUserUuid, 'deleted') as any[];

    expect(saves).toHaveLength(1);
    expect(saves[0].world_name).toBe('Test World');
    expect(saves[0].folder_id).toBe(testFolderId);
  });

  it('should handle transaction for multiple saves', () => {
    // Setup
    testDb
      .prepare('INSERT INTO auth (id, user_uuid, username, token) VALUES (?, ?, ?, ?)')
      .run('auth-1', testUserUuid, 'testuser', 'token123');

    testDb
      .prepare(
        'INSERT INTO save_folders (id, user_uuid, folder_path, display_name) VALUES (?, ?, ?, ?)'
      )
      .run(testFolderId, testUserUuid, '/path/to/saves', 'Test Folder');

    // Use transaction for multiple saves
    const transaction = testDb.transaction((saves: any[]) => {
      const stmt = testDb.prepare(`
        INSERT INTO saves (
          id, user_uuid, folder_id, world_name, version, game_mode, difficulty
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const save of saves) {
        stmt.run(
          save.id,
          save.user_uuid,
          save.folder_id,
          save.world_name,
          save.version,
          save.game_mode,
          save.difficulty
        );
      }
    });

    const savesToInsert = [
      {
        id: 'save-1',
        user_uuid: testUserUuid,
        folder_id: testFolderId,
        world_name: 'World 1',
        version: '1.21.11',
        game_mode: 'Survival',
        difficulty: 2,
      },
      {
        id: 'save-2',
        user_uuid: testUserUuid,
        folder_id: testFolderId,
        world_name: 'World 2',
        version: '1.20.1',
        game_mode: 'Creative',
        difficulty: 0,
      },
    ];

    transaction(savesToInsert);

    // Verify all saves were inserted
    const results = testDb
      .prepare('SELECT COUNT(*) as count FROM saves WHERE user_uuid = ?')
      .get(testUserUuid) as any;

    expect(results.count).toBe(2);
  });
});
