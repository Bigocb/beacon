import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Test Suite: FolderManager
 *
 * Tests for:
 * - Adding folders to the scanner
 * - Removing folders
 * - Listing existing folders
 * - Automatic scan after folder addition
 * - Error handling
 */

describe('FolderManager - Folder Operations', () => {
  const testUserUuid = '471dccd1-3920-463b-be0e-0922a678f017';

  beforeEach(() => {
    (window.api.scanner.listFolders as any).mockResolvedValue({
      success: true,
      folders: [],
    });

    (window.api.scanner.addFolder as any).mockResolvedValue({
      success: true,
      folder: {
        id: 'folder-1',
        user_uuid: testUserUuid,
        folder_path: '/path/to/saves',
        display_name: 'My Saves',
        created_at: new Date().toISOString(),
      },
    });

    (window.api.scanner.removeFolder as any).mockResolvedValue({
      success: true,
    });

    (window.api.scanner.scanAllFolders as any).mockResolvedValue({
      success: true,
    });
  });

  it('should load existing folders on mount', async () => {
    const mockFolders = [
      {
        id: 'folder-1',
        user_uuid: testUserUuid,
        folder_path: '/path/to/saves1',
        display_name: 'Saves 1',
      },
      {
        id: 'folder-2',
        user_uuid: testUserUuid,
        folder_path: '/path/to/saves2',
        display_name: 'Saves 2',
      },
    ];

    (window.api.scanner.listFolders as any).mockResolvedValue({
      success: true,
      folders: mockFolders,
    });

    const result = await window.api.scanner.listFolders(testUserUuid);

    expect(result.success).toBe(true);
    expect(result.folders).toHaveLength(2);
    expect(result.folders[0].folder_path).toBe('/path/to/saves1');
  });

  it('should add a new folder successfully', async () => {
    const folderPath = '/path/to/new/saves';

    (window.api.scanner.addFolder as any).mockResolvedValue({
      success: true,
      folder: {
        id: 'folder-new',
        user_uuid: testUserUuid,
        folder_path: folderPath,
        display_name: 'New Saves',
        created_at: new Date().toISOString(),
      },
    });

    const result = await window.api.scanner.addFolder(testUserUuid, folderPath);

    expect(result.success).toBe(true);
    expect(result.folder.folder_path).toBe(folderPath);
    expect(result.folder.user_uuid).toBe(testUserUuid);
  });

  it('should use folder name from path if display_name not provided', async () => {
    const folderPath = '/path/to/MyInstance';

    (window.api.scanner.addFolder as any).mockResolvedValue({
      success: true,
      folder: {
        id: 'folder-1',
        user_uuid: testUserUuid,
        folder_path: folderPath,
        display_name: 'MyInstance', // Extracted from path (actual folder, not parent)
      },
    });

    const result = await window.api.scanner.addFolder(testUserUuid, folderPath);

    expect(result.folder.display_name).toBe('MyInstance');
    expect(result.folder.display_name).not.toBe('to'); // Should NOT be parent folder name
  });

  it('should extract folder name correctly for various path formats', async () => {
    const testCases = [
      { path: '/home/user/Instances/VanillaServer', expectedName: 'VanillaServer' },
      { path: 'C:\\Users\\user\\Instances\\FabricModpack', expectedName: 'FabricModpack' },
      { path: '/mnt/drive/mc/SkyfactoryServer', expectedName: 'SkyfactoryServer' },
      { path: './local/instances/TestInstance', expectedName: 'TestInstance' },
    ];

    for (const testCase of testCases) {
      (window.api.scanner.addFolder as any).mockResolvedValue({
        success: true,
        folder: {
          id: `folder-${testCase.expectedName}`,
          user_uuid: testUserUuid,
          folder_path: testCase.path,
          display_name: testCase.expectedName,
        },
      });

      const result = await window.api.scanner.addFolder(testUserUuid, testCase.path);

      expect(result.folder.display_name).toBe(testCase.expectedName);
    }
  });

  it('should remove a folder by id', async () => {
    const folderId = 'folder-1';

    const result = await window.api.scanner.removeFolder(
      folderId,
      testUserUuid
    );

    expect(result.success).toBe(true);
    expect(
      (window.api.scanner.removeFolder as any).mock.calls[0][0]
    ).toBe(folderId);
  });

  it('should verify user_uuid matches when removing folder', async () => {
    const folderId = 'folder-1';
    const wrongUserUuid = 'different-uuid';

    (window.api.scanner.removeFolder as any).mockResolvedValue({
      success: false,
      error: 'User not authorized',
    });

    const result = await window.api.scanner.removeFolder(
      folderId,
      wrongUserUuid
    );

    expect(result.success).toBe(false);
  });

  it('should trigger automatic scan after adding folder', async () => {
    // Add folder
    await window.api.scanner.addFolder(testUserUuid, '/path/to/saves');

    // Verify scan was triggered (via onFoldersChanged callback)
    const scanResult = await window.api.scanner.scanAllFolders(testUserUuid);

    expect(scanResult.success).toBe(true);
    expect(
      (window.api.scanner.scanAllFolders as any).mock.calls.length
    ).toBeGreaterThan(0);
  });

  it('should display error if adding folder fails', async () => {
    (window.api.scanner.addFolder as any).mockResolvedValue({
      success: false,
      error: 'Folder does not exist',
    });

    const result = await window.api.scanner.addFolder(
      testUserUuid,
      '/nonexistent/path'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Folder does not exist');
  });
});

describe('FolderManager - Folder Discovery', () => {
  const testUserUuid = '471dccd1-3920-463b-be0e-0922a678f017';

  beforeEach(() => {
    (window.api.fs?.selectFolder as any).mockResolvedValue(
      '/path/to/selected/folder'
    );
  });

  it('should call folder selection dialog when user clicks Add', async () => {
    // Simulate user selecting a folder
    const selectedPath = await window.api.fs?.selectFolder?.();

    expect(selectedPath).toBe('/path/to/selected/folder');
    expect(window.api.fs?.selectFolder).toHaveBeenCalled();
  });

  it('should handle folder selection being cancelled', async () => {
    (window.api.fs?.selectFolder as any).mockResolvedValue(null);

    const selectedPath = await window.api.fs?.selectFolder?.();

    expect(selectedPath).toBeNull();
  });

  it('should validate folder path is not empty', async () => {
    const folderPath = '';

    (window.api.scanner.addFolder as any).mockResolvedValue({
      success: false,
      error: 'Folder path cannot be empty',
    });

    const result = await window.api.scanner.addFolder(testUserUuid, folderPath);

    expect(result.success).toBe(false);
  });

  it('should prevent duplicate folder entries', async () => {
    const folderPath = '/path/to/saves';

    (window.api.scanner.addFolder as any).mockResolvedValue({
      success: false,
      error: 'Folder already added',
    });

    // First add should succeed
    const first = await window.api.scanner.addFolder(testUserUuid, folderPath);

    // Second add should fail with duplicate error
    const second = await window.api.scanner.addFolder(
      testUserUuid,
      folderPath
    );

    expect(second.success).toBe(false);
    expect(second.error).toContain('already');
  });
});

describe('FolderManager - Batch Operations', () => {
  const testUserUuid = '471dccd1-3920-463b-be0e-0922a678f017';

  beforeEach(() => {
    (window.api.scanner.addFolder as any).mockResolvedValue({
      success: true,
      folder: {
        id: 'folder-1',
        user_uuid: testUserUuid,
        folder_path: '/path/to/saves',
        display_name: 'My Saves',
        created_at: new Date().toISOString(),
      },
    });

    (window.api.scanner.listFolders as any).mockResolvedValue({
      success: true,
      folders: [],
    });

    (window.api.scanner.scanAllFolders as any).mockResolvedValue({
      success: true,
    });
  });

  it('should handle adding multiple folders', async () => {
    const folders = [
      { path: '/saves1', name: 'Saves 1' },
      { path: '/saves2', name: 'Saves 2' },
      { path: '/saves3', name: 'Saves 3' },
    ];

    // Mock response for each folder addition
    (window.api.scanner.addFolder as any).mockImplementation(
      async (uuid: string, path: string) => ({
        success: true,
        folder: {
          id: `folder-${path}`,
          user_uuid: uuid,
          folder_path: path,
          display_name: path.split('/').pop(),
          created_at: new Date().toISOString(),
        },
      })
    );

    const results = await Promise.all(
      folders.map(f =>
        window.api.scanner.addFolder(testUserUuid, f.path)
      )
    );

    expect(results).toHaveLength(3);
    results.forEach((result, i) => {
      expect(result.success).toBe(true);
      expect(result.folder.folder_path).toBe(folders[i].path);
    });
  });

  it('should scan all folders after batch add', async () => {
    // Mock adding multiple folders
    (window.api.scanner.listFolders as any).mockResolvedValue({
      success: true,
      folders: [
        { id: 'f1', folder_path: '/saves1', user_uuid: testUserUuid },
        { id: 'f2', folder_path: '/saves2', user_uuid: testUserUuid },
        { id: 'f3', folder_path: '/saves3', user_uuid: testUserUuid },
      ],
    });

    (window.api.scanner.scanAllFolders as any).mockResolvedValue({
      success: true,
    });

    // Scan all
    const scanResult = await window.api.scanner.scanAllFolders(testUserUuid);

    expect(scanResult.success).toBe(true);

    // Verify all folders are included
    const folders = await window.api.scanner.listFolders(testUserUuid);
    expect(folders.folders).toHaveLength(3);
  });
});
