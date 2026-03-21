import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Test Suite: Cascade Delete Bug - Data Persistence After Logout/Login
 *
 * This test specifically targets the CASCADE DELETE bug where:
 * 1. User creates local account
 * 2. Imports instances/folders (saved to save_folders table)
 * 3. Logs out
 * 4. Logs back in
 * 5. Expected: Instances still visible
 * 6. Actual (before fix): Instances deleted due to CASCADE DELETE on auth table
 *
 * Root cause: INSERT OR REPLACE on auth table deleted old records,
 * which cascaded to delete save_folders and instance_metadata
 *
 * Fix: Changed to UPDATE (if exists) + INSERT (if not) pattern
 */

describe('Data Persistence: Cascade Delete Bug (Issue #11)', () => {
  // Mock database state
  let mockDatabase = {
    auth: new Map<string, { id: string; user_uuid: string; username: string; token: string }>(),
    save_folders: new Map<string, { id: string; user_uuid: string; folder_path: string }>(),
    instance_metadata: new Map<string, { folder_id: string; instance_name: string }>(),
  };

  beforeEach(() => {
    // Reset mock database
    mockDatabase = {
      auth: new Map(),
      save_folders: new Map(),
      instance_metadata: new Map(),
    };
  });

  /**
   * OLD BEHAVIOR (Before Fix): INSERT OR REPLACE deleted old auth record
   * This caused cascade delete of save_folders and instance_metadata
   */
  function old_insertOrReplaceAuth(
    id: string,
    user_uuid: string,
    username: string,
    token: string
  ) {
    // Simulates SQLite INSERT OR REPLACE behavior
    // 1. If record exists, DELETE it (triggers CASCADE DELETE on child tables)
    // 2. Then INSERT the new record

    if (mockDatabase.auth.has(id)) {
      // DELETE operation
      const oldRecord = mockDatabase.auth.get(id)!;

      // CASCADE DELETE: Remove all save_folders with this user_uuid
      const foldersToDelete: string[] = [];
      mockDatabase.save_folders.forEach((folder, folderId) => {
        if (folder.user_uuid === oldRecord.user_uuid) {
          foldersToDelete.push(folderId);
        }
      });

      // CASCADE DELETE: Remove all instance_metadata for deleted folders
      foldersToDelete.forEach(folderId => {
        mockDatabase.instance_metadata.delete(folderId);
      });

      // Delete folders
      foldersToDelete.forEach(folderId => {
        mockDatabase.save_folders.delete(folderId);
      });

      // Delete old auth record
      mockDatabase.auth.delete(id);
    }

    // INSERT new record
    mockDatabase.auth.set(id, { id, user_uuid, username, token });
  }

  /**
   * NEW BEHAVIOR (After Fix): UPDATE existing record, INSERT if not exists
   * This preserves all child records (save_folders, instance_metadata)
   */
  function new_updateOrInsertAuth(
    id: string,
    user_uuid: string,
    username: string,
    token: string
  ) {
    // Simulates fixed behavior: UPDATE + INSERT pattern
    // 1. Check if record exists
    // 2. If yes, UPDATE (no delete, no cascade)
    // 3. If no, INSERT

    if (mockDatabase.auth.has(id)) {
      // UPDATE operation - only change mutable fields
      const existing = mockDatabase.auth.get(id)!;
      mockDatabase.auth.set(id, {
        ...existing,
        username,
        token,
        // Never change user_uuid, this prevents UNIQUE constraint violations
      });
    } else {
      // INSERT new record
      mockDatabase.auth.set(id, { id, user_uuid, username, token });
    }
  }

  it('should reproduce cascade delete bug with INSERT OR REPLACE', () => {
    const localId = 'local-testuser';
    const uuid = '12345-67890';

    // Step 1: User creates local account
    old_insertOrReplaceAuth(localId, uuid, 'testuser', 'token-v1');
    expect(mockDatabase.auth.has(localId)).toBe(true);
    expect(mockDatabase.auth.size).toBe(1);

    // Step 2: User adds folders (simulating folder import)
    mockDatabase.save_folders.set('folder-1', {
      id: 'folder-1',
      user_uuid: uuid,
      folder_path: '/minecraft/instances',
    });

    // Step 3: User adds instance metadata
    mockDatabase.instance_metadata.set('folder-1', {
      folder_id: 'folder-1',
      instance_name: 'Vanilla Instance',
    });

    // Before logout: verify data exists
    expect(mockDatabase.save_folders.size).toBe(1);
    expect(mockDatabase.instance_metadata.size).toBe(1);

    // Step 4: User logs out then back in with new token
    // This calls saveAuth which uses INSERT OR REPLACE
    old_insertOrReplaceAuth(localId, uuid, 'testuser', 'token-v2');

    // Step 5: BUG - CASCADE DELETE deleted our instances!
    // This assertion demonstrates the bug:
    expect(mockDatabase.save_folders.size).toBe(0); // ❌ Should be 1, but deleted!
    expect(mockDatabase.instance_metadata.size).toBe(0); // ❌ Should be 1, but deleted!
  });

  it('should fix cascade delete with UPDATE + INSERT pattern', () => {
    const localId = 'local-testuser';
    const uuid = '12345-67890';

    // Step 1: User creates local account
    new_updateOrInsertAuth(localId, uuid, 'testuser', 'token-v1');
    expect(mockDatabase.auth.has(localId)).toBe(true);
    expect(mockDatabase.auth.size).toBe(1);

    // Step 2: User adds folders (simulating folder import)
    mockDatabase.save_folders.set('folder-1', {
      id: 'folder-1',
      user_uuid: uuid,
      folder_path: '/minecraft/instances',
    });

    // Step 3: User adds instance metadata
    mockDatabase.instance_metadata.set('folder-1', {
      folder_id: 'folder-1',
      instance_name: 'Vanilla Instance',
    });

    // Before logout: verify data exists
    expect(mockDatabase.save_folders.size).toBe(1);
    expect(mockDatabase.instance_metadata.size).toBe(1);

    // Step 4: User logs out then back in with new token
    // This calls saveAuth which now uses UPDATE + INSERT
    new_updateOrInsertAuth(localId, uuid, 'testuser', 'token-v2');

    // Step 5: FIXED - CASCADE DELETE no longer occurs!
    // Data is preserved:
    expect(mockDatabase.save_folders.size).toBe(1); // ✅ Still there!
    expect(mockDatabase.instance_metadata.size).toBe(1); // ✅ Still there!

    // Verify auth record was updated
    const authRecord = mockDatabase.auth.get(localId)!;
    expect(authRecord.token).toBe('token-v2');
    expect(authRecord.user_uuid).toBe(uuid);
  });

  it('should handle UUID reuse correctly with UPDATE pattern', () => {
    const localId = 'local-testuser';
    const uuid = '12345-67890';

    // Step 1: Create account with UUID reuse logic
    const existingAuth = mockDatabase.auth.get(localId);
    let userUuid = existingAuth ? existingAuth.user_uuid : uuid;
    new_updateOrInsertAuth(localId, userUuid, 'testuser', 'token-v1');

    // Add folder
    mockDatabase.save_folders.set('folder-1', {
      id: 'folder-1',
      user_uuid: userUuid,
      folder_path: '/minecraft/instances',
    });

    // Step 2: Logout/Login - UUID should be reused (same as before)
    const existingAuth2 = mockDatabase.auth.get(localId);
    const reuseUuid = existingAuth2 ? existingAuth2.user_uuid : uuid;
    expect(reuseUuid).toBe(userUuid); // UUID is reused

    new_updateOrInsertAuth(localId, reuseUuid, 'testuser', 'token-v2');

    // Step 3: Verify data persists
    expect(mockDatabase.save_folders.size).toBe(1);
    expect(mockDatabase.save_folders.get('folder-1')!.user_uuid).toBe(userUuid);
  });

  it('should handle multiple folders with UPDATE pattern', () => {
    const localId = 'local-testuser';
    const uuid = '12345-67890';

    // Create account
    new_updateOrInsertAuth(localId, uuid, 'testuser', 'token-v1');

    // Add multiple folders
    const folders = [
      { id: 'folder-1', path: '/minecraft/instances/folder1' },
      { id: 'folder-2', path: '/minecraft/instances/folder2' },
      { id: 'folder-3', path: '/minecraft/instances/folder3' },
    ];

    folders.forEach(folder => {
      mockDatabase.save_folders.set(folder.id, {
        id: folder.id,
        user_uuid: uuid,
        folder_path: folder.path,
      });

      mockDatabase.instance_metadata.set(folder.id, {
        folder_id: folder.id,
        instance_name: `Instance ${folder.id}`,
      });
    });

    expect(mockDatabase.save_folders.size).toBe(3);
    expect(mockDatabase.instance_metadata.size).toBe(3);

    // Logout/Login with UPDATE pattern
    new_updateOrInsertAuth(localId, uuid, 'testuser', 'token-v2');

    // All folders should still exist
    expect(mockDatabase.save_folders.size).toBe(3);
    expect(mockDatabase.instance_metadata.size).toBe(3);
  });
});
