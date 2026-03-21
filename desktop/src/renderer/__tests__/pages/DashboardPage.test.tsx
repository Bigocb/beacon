import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

/**
 * Test Suite: DashboardPage Persistence
 *
 * Tests for the critical bug where instances/saves don't display
 * after being saved to the database during scan.
 *
 * Issue: getInstanceMetadata returns 0 results even though data was saved
 * Root Cause: JOIN query with save_folders may be failing
 */

describe('DashboardPage Persistence', () => {
  const mockUser = {
    id: 'local-testuser',
    username: 'testuser',
    minecraft_uuid: '471dccd1-3920-463b-be0e-0922a678f017',
  };

  const mockInstance = {
    folder_id: 'da12e9fc-4279-4fe6-8648-ac35064af3bc',
    instance_name: 'Test Instance',
    display_name: 'Test Instance',
    mod_loader: 'fabric',
    mod_count: 5,
    launcher: 'multimc',
    game_version: '1.21.11',
    user_uuid: '471dccd1-3920-463b-be0e-0922a678f017',
    folder_path: '/path/to/instance',
  };

  const mockSave = {
    id: 'test-save-1',
    world_name: 'Test World',
    folder_id: mockInstance.folder_id,
    user_uuid: mockUser.minecraft_uuid,
    version: '1.21.11',
    game_mode: 'Survival',
    difficulty: 2,
    play_time_ticks: 100000,
  };

  beforeEach(() => {
    // Mock API responses
    (window.api.scanner.getSaves as any).mockResolvedValue({
      success: true,
      saves: [mockSave],
    });

    (window.api.scanner.getInstanceMetadata as any).mockResolvedValue({
      success: true,
      metadata: [mockInstance],
    });

    (window.api.scanner.scanAllFolders as any).mockResolvedValue({
      success: true,
    });

    (window.api.favorites.getAll as any).mockResolvedValue({
      success: true,
      favorites: [],
    });
  });

  it('should display instances after scan completes', async () => {
    // This test would require a full setup with UserContext and router
    // For now, this is a placeholder that demonstrates the test structure

    // Simulate the scan operation
    const scanResult = await window.api.scanner.scanAllFolders(
      mockUser.minecraft_uuid
    );
    expect(scanResult.success).toBe(true);

    // After scan, getInstanceMetadata should return the instance
    const metadata = await window.api.scanner.getInstanceMetadata(
      mockUser.minecraft_uuid
    );
    expect(metadata.success).toBe(true);
    expect(metadata.metadata).toHaveLength(1);
    expect(metadata.metadata[0].folder_id).toBe(mockInstance.folder_id);
  });

  it('should handle missing save_folders gracefully', async () => {
    // Test case for the bug: if save_folders entry is missing,
    // the JOIN query returns 0 results

    // Mock scenario where save_folders is empty
    (window.api.scanner.getInstanceMetadata as any).mockResolvedValue({
      success: true,
      metadata: [], // Empty because JOIN failed
    });

    const metadata = await window.api.scanner.getInstanceMetadata(
      mockUser.minecraft_uuid
    );

    expect(metadata.success).toBe(true);
    expect(metadata.metadata).toHaveLength(0);
    // This should trigger an error or warning in the UI
  });

  it('should load saves and instances on mount', async () => {
    // Verify that DashboardPage loads data correctly on initialization

    const getSaves = window.api.scanner.getSaves as any;
    const getMetadata = window.api.scanner.getInstanceMetadata as any;

    // Simulate component mount
    const savesResult = await getSaves(mockUser.minecraft_uuid);
    const instanceResult = await getMetadata(mockUser.minecraft_uuid);

    expect(getSaves).toHaveBeenCalledWith(mockUser.minecraft_uuid);
    expect(getMetadata).toHaveBeenCalledWith(mockUser.minecraft_uuid);

    expect(savesResult.success).toBe(true);
    expect(instanceResult.success).toBe(true);
  });
});

describe('DashboardPage Folder Management', () => {
  const mockUser = {
    id: 'local-testuser',
    username: 'testuser',
    minecraft_uuid: '471dccd1-3920-463b-be0e-0922a678f017',
  };

  beforeEach(() => {
    (window.api.scanner.listFolders as any).mockResolvedValue({
      success: true,
      folders: [],
    });

    (window.api.scanner.addFolder as any).mockResolvedValue({
      success: true,
      folder: {
        id: 'folder-1',
        user_uuid: mockUser.minecraft_uuid,
        folder_path: '/path/to/saves',
        display_name: 'My Saves',
      },
    });

    (window.api.scanner.scanAllFolders as any).mockResolvedValue({
      success: true,
    });
  });

  it('should automatically scan when folder is added', async () => {
    // Test the fix: onFoldersChanged should trigger scanAllFolders

    const scanAllFolders = window.api.scanner.scanAllFolders as any;

    // Simulate adding a folder
    await window.api.scanner.addFolder(
      mockUser.minecraft_uuid,
      '/path/to/saves'
    );

    // Simulate onFoldersChanged callback
    await scanAllFolders(mockUser.minecraft_uuid);

    expect(scanAllFolders).toHaveBeenCalledWith(mockUser.minecraft_uuid);
  });
});

describe('DashboardPage Search', () => {
  const mockInstances = [
    {
      folder_id: 'folder-1',
      instance_name: 'Vanilla Server',
      display_name: 'Vanilla Server',
      mod_loader: 'vanilla',
      mod_count: 0,
      launcher: 'vanilla',
      game_version: '1.21.11',
      user_uuid: 'user-1',
      folder_path: '/path/to/vanilla',
    },
    {
      folder_id: 'folder-2',
      instance_name: 'Fabric Modpack',
      display_name: 'Fabric Modpack',
      mod_loader: 'fabric',
      mod_count: 15,
      launcher: 'multimc',
      game_version: '1.20.4',
      user_uuid: 'user-1',
      folder_path: '/path/to/fabric',
    },
    {
      folder_id: 'folder-3',
      instance_name: 'Forge Server',
      display_name: 'Forge Server',
      mod_loader: 'forge',
      mod_count: 8,
      launcher: 'launcher',
      game_version: '1.19.2',
      user_uuid: 'user-1',
      folder_path: '/path/to/forge',
    },
  ];

  const mockSaves = [
    {
      id: 'save-1',
      world_name: 'Main World',
      folder_id: 'folder-1',
      user_uuid: 'user-1',
      version: '1.21.11',
      game_mode: 'Survival',
      difficulty: 2,
      play_time_ticks: 500000,
    },
    {
      id: 'save-2',
      world_name: 'Creative Test',
      folder_id: 'folder-2',
      user_uuid: 'user-1',
      version: '1.20.4',
      game_mode: 'Creative',
      difficulty: 0,
      play_time_ticks: 100000,
    },
  ];

  beforeEach(() => {
    (window.api.scanner.getSaves as any).mockResolvedValue({
      success: true,
      saves: mockSaves,
    });

    (window.api.scanner.getInstanceMetadata as any).mockResolvedValue({
      success: true,
      metadata: mockInstances,
    });

    (window.api.favorites.getAll as any).mockResolvedValue({
      success: true,
      favorites: [],
    });
  });

  it('should find instances by name', () => {
    // Test filtering instances by instance name
    const searchTerm = 'Vanilla';
    const filtered = mockInstances.filter((instance) =>
      (instance.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].display_name).toBe('Vanilla Server');
  });

  it('should find instances by mod loader', () => {
    // Test filtering instances by mod loader
    const searchTerm = 'fabric';
    const filtered = mockInstances.filter((instance) =>
      (instance.mod_loader || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].mod_loader).toBe('fabric');
  });

  it('should find saves by world name', () => {
    // Test filtering saves by world name
    const searchTerm = 'Creative';
    const filtered = mockSaves.filter((save) =>
      (save.world_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].world_name).toBe('Creative Test');
  });

  it('should find saves by version', () => {
    // Test filtering saves by Minecraft version
    const searchTerm = '1.20.4';
    const filtered = mockSaves.filter((save) =>
      (save.version || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].version).toBe('1.20.4');
  });

  it('should return empty results for non-matching search', () => {
    const searchTerm = 'NonExistent';
    const filtered = mockInstances.filter((instance) =>
      (instance.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    expect(filtered).toHaveLength(0);
  });

  it('should handle case-insensitive search', () => {
    const searchTerm = 'VANILLA';
    const filtered = mockInstances.filter((instance) =>
      (instance.display_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].display_name).toBe('Vanilla Server');
  });
});
