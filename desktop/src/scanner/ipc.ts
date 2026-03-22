import { ipcMain } from 'electron';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { scanMinecraftSaves, scanMinecraftSavesFromFolders, scanFolder, Save } from './index';
import { getAllDetectedAccounts } from './profiles';
import { analyzeInstanceMetadata, detectLauncherAndGetSavesPath } from './instance-metadata';
import { discoverInstancesInFolder } from './batch-scanner';
import { launchInstance, findLauncherExecutable, LauncherType } from './launcher-executor';
import { getInstanceMods } from './mods-scanner';
import { getInstanceResourcepacks } from './resourcepacks-scanner';
import { getInstanceShaderpacks } from './shaderpacks-scanner';
import { getInstanceScreenshots } from './screenshots-scanner';
import db, { queries } from '../db/sqlite';
import { v4 as uuidv4 } from 'uuid';

export function registerScannerIPC() {
  ipcMain.handle('scanner:detectAccounts', async () => {
    try {
      const accounts = getAllDetectedAccounts();
      return { success: true, accounts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scanner:scanSaves', async (event, userUuid: string) => {
    try {
      const saves = await scanMinecraftSaves(userUuid);

      // Store in local SQLite database
      const stmt = db.transaction((savesToInsert: Save[]) => {
        for (const save of savesToInsert) {
          const existing = queries.getSaveById.get(save.id);

          if (existing) {
            // Update existing
            queries.updateSave.run(
              save.notes || null,
              save.status || null,
              null,
              save.id
            );
          } else {
            // Insert new
            queries.insertSave.run(
              save.id,
              save.user_uuid,
              save.folder_id || null,
              save.world_name,
              save.file_path,
              save.version,
              save.game_mode,
              save.difficulty,
              save.seed,
              save.play_time_ticks,
              save.spawn_x,
              save.spawn_y,
              save.spawn_z,
              save.health || null,
              save.hunger || null,
              save.level || null,
              save.xp || null,
              save.food_eaten || null,
              save.beds_slept_in || null,
              save.deaths || null,
              save.blocks_mined || null,
              save.blocks_placed || null,
              save.items_crafted || null,
              save.mobs_killed || null,
              save.damage_taken || null
            );
          }
        }
      });

      stmt(saves);

      return { success: true, saves };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scanner:getSaves', async (event, userUuid: string, token?: string) => {
    try {
      // Fetch from backend API instead of local database
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`http://localhost:3000/saves`, {
        headers
      });
      return { success: true, saves: response.data.saves || [], savesCount: response.data.saves?.length || 0 };
    } catch (error: any) {
      console.error('❌ [getSaves] Error fetching saves:', error.message);
      // Fallback to empty array if backend is unavailable
      return { success: false, savesCount: 0, error: error.message };
    }
  });

  ipcMain.handle('scanner:updateSave', async (event, saveId: string, updates: any) => {
    try {
      queries.updateSave.run(
        updates.notes || null,
        updates.status || null,
        updates.custom_tags ? JSON.stringify(updates.custom_tags) : null,
        saveId
      );

      const updated = queries.getSaveById.get(saveId);
      return { success: true, save: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Folder management handlers
  ipcMain.handle('scanner:listFolders', async (event, userUuid: string) => {
    try {
      const folders = queries.getSaveFolders.all(userUuid);
      return { success: true, folders };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scanner:addFolder', async (event, userUuid: string, folderPath: string, displayName?: string) => {
    try {
      const id = uuidv4();
      const parts = folderPath.split(/[\\\/]/).filter(Boolean);
      // Use the actual folder name (last part), not parent folder (second-to-last)
      const name = displayName || parts[parts.length - 1] || 'Minecraft Saves';

      queries.addSaveFolder.run(id, userUuid, folderPath, name);

      const folder = queries.getSaveFolderById.get(id);
      return { success: true, folder };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scanner:removeFolder', async (event, folderId: string, userUuid: string) => {
    try {
      queries.removeSaveFolder.run(folderId, userUuid);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scanner:getInstanceMetadata', async (event, userUuid: string, token?: string) => {
    try {
      // Fetch saves from backend API (instances are derived from saves)
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`http://localhost:3000/saves`, {
        headers
      });
      const metadata = response.data.saves || [];
      return { success: true, metadata, metadataCount: metadata.length };
    } catch (error: any) {
      console.error('❌ [getInstanceMetadata] Error:', error.message);
      return { success: false, metadataCount: 0, error: error.message };
    }
  });

  ipcMain.handle('scanner:scanAllFolders', async (event, userUuid: string) => {
    try {
      console.log('🔄 Starting scanAllFolders for user:', userUuid);
      // For now, skip folder scanning since backend doesn't have folder management
      // In the future, this should be implemented on the backend
      const folders: any[] = [];
      console.log(`📁 Found ${folders.length} folders to scan`);
      if (folders.length > 0) {
        console.log('📋 Folders:', folders.map((f: any) => ({ id: f.id, path: f.folder_path, user_uuid: f.user_uuid })));
      }

      // If no custom folders, fall back to default Minecraft saves location
      const saves = folders.length > 0
        ? await scanMinecraftSavesFromFolders(userUuid, folders.map((f: any) => ({ id: f.id, path: f.folder_path })))
        : await scanMinecraftSaves(userUuid);

      console.log(`💾 Found ${saves.length} total saves`);

      // Analyze and store instance metadata for each folder
      folders.forEach((folder: any) => {
        try {
          console.log(`\n🎯 Analyzing metadata for folder: ${folder.folder_path}`);

          // Get saves for this specific folder
          const folderSaves = saves.filter((save: Save) => save.folder_id === folder.id);
          console.log(`  📋 Found ${folderSaves.length} saves in this folder`);

          // If any saves have unknown version, try to get from manifest.json
          if (folderSaves.some(s => s.version === 'unknown')) {
            try {
              const manifestPath = path.join(folder.folder_path, 'manifest.json');
              if (fs.existsSync(manifestPath)) {
                const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
                const manifest = JSON.parse(manifestContent);
                const manifestVersion = manifest.minecraft?.version;
                if (manifestVersion) {
                  console.log(`  📦 Found version from manifest.json: ${manifestVersion}`);
                  folderSaves.forEach(save => {
                    if (save.version === 'unknown') {
                      save.version = manifestVersion;
                    }
                  });
                }
              }
            } catch (error) {
              console.warn(`  ⚠️ Could not read manifest.json for fallback version:`, error);
            }
          }

          // Log save versions detected
          if (folderSaves.length > 0) {
            console.log(`  📋 Save versions detected:`);
            folderSaves.forEach((save: Save) => {
              console.log(`    - ${save.world_name}: version=${save.version}`);
            });
          }

          const metadata = analyzeInstanceMetadata(folder.folder_path, folder.id);

          // Extract game version from first save if available (fallback only)
          const gameVersionFromSave = folderSaves.length > 0 ? folderSaves[0].version : undefined;
          if (gameVersionFromSave && !metadata.game_version) {
            metadata.game_version = gameVersionFromSave;
            console.log(`  📌 Game version from save (fallback): ${gameVersionFromSave}`);
          }

          console.log(`  ✅ Metadata analyzed:`, {
            launcher: metadata.launcher,
            mod_loader: metadata.mod_loader,
            mod_count: metadata.mod_count,
            instance_name: metadata.instance_name,
            game_version: metadata.game_version,
          });
          queries.saveInstanceMetadata.run(
            metadata.folder_id,
            metadata.mod_loader,
            metadata.loader_version || null,
            metadata.game_version || null,
            metadata.mod_count,
            metadata.icon_path || null,
            metadata.instance_type,
            metadata.launcher || null,
            metadata.instance_name || null,
            metadata.folder_size_mb || null,
            metadata.mods_folder_size_mb || null
          );
          console.log(`  💾 Instance metadata saved to database with folder_id: ${metadata.folder_id}`);
        } catch (error) {
          console.error(`Error analyzing metadata for folder ${folder.id}:`, error);
        }
      });

      // Store in local SQLite database
      const stmt = db.transaction((savesToInsert: Save[]) => {
        for (const save of savesToInsert) {
          const existing = queries.getSaveById.get(save.id);

          if (existing) {
            // Update existing with new metadata (including version)
            queries.updateSaveMetadata.run(
              save.version,
              save.game_mode,
              save.difficulty,
              save.seed,
              save.play_time_ticks,
              save.spawn_x,
              save.spawn_y,
              save.spawn_z,
              save.id
            );
          } else {
            // Insert new
            queries.insertSave.run(
              save.id,
              save.user_uuid,
              save.folder_id || null,
              save.world_name,
              save.file_path,
              save.version,
              save.game_mode,
              save.difficulty,
              save.seed,
              save.play_time_ticks,
              save.spawn_x,
              save.spawn_y,
              save.spawn_z,
              save.health || null,
              save.hunger || null,
              save.level || null,
              save.xp || null,
              save.food_eaten || null,
              save.beds_slept_in || null,
              save.deaths || null,
              save.blocks_mined || null,
              save.blocks_placed || null,
              save.items_crafted || null,
              save.mobs_killed || null,
              save.damage_taken || null
            );
          }
        }
      });

      stmt(saves);
      console.log(`💾 Stored ${saves.length} saves in database`);

      return { success: true, saves };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Scan a single folder
  ipcMain.handle('scanner:scanFolder', async (event, folderId: string, userUuid: string) => {
    try {
      console.log(`🔄 Starting scanFolder for folder: ${folderId}, user: ${userUuid}`);
      const folder = queries.getSaveFolderById.get(folderId);

      if (!folder) {
        return { success: false, error: 'Folder not found' };
      }

      // Get the correct saves path for this instance
      const { savesPath } = detectLauncherAndGetSavesPath(folder.folder_path);
      console.log(`📂 Detected saves path: ${savesPath}`);

      const saves = await scanFolder(savesPath, userUuid, folderId);
      console.log(`💾 Found ${saves.length} saves in folder`);

      // If any saves have unknown version, try to get from manifest.json
      if (saves.some(s => s.version === 'unknown')) {
        try {
          const manifestPath = path.join(folder.folder_path, 'manifest.json');
          if (fs.existsSync(manifestPath)) {
            const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(manifestContent);
            const manifestVersion = manifest.minecraft?.version;
            if (manifestVersion) {
              console.log(`📦 Found version from manifest.json: ${manifestVersion}`);
              saves.forEach(save => {
                if (save.version === 'unknown') {
                  save.version = manifestVersion;
                }
              });
            }
          }
        } catch (error) {
          console.warn(`Could not read manifest.json for fallback version:`, error);
        }
      }

      // Log save versions found
      if (saves.length > 0) {
        console.log(`📋 Save versions detected:`);
        saves.forEach(save => {
          console.log(`  - ${save.world_name}: version=${save.version}`);
        });
      }

      // Analyze and store instance metadata for this folder
      try {
        console.log(`\n🎯 Analyzing metadata for folder: ${folder.folder_path}`);
        const metadata = analyzeInstanceMetadata(folder.folder_path, folderId);

        // Extract game version from first save if available (fallback only)
        const gameVersionFromSave = saves.length > 0 ? saves[0].version : undefined;
        if (gameVersionFromSave && !metadata.game_version) {
          metadata.game_version = gameVersionFromSave;
          console.log(`📌 Game version from save (fallback): ${gameVersionFromSave}`);
        }

        console.log(`✅ Metadata analyzed:`, {
          launcher: metadata.launcher,
          mod_loader: metadata.mod_loader,
          loader_version: metadata.loader_version,
          game_version: metadata.game_version,
          mod_count: metadata.mod_count,
          instance_name: metadata.instance_name,
        });
        queries.saveInstanceMetadata.run(
          metadata.folder_id,
          metadata.mod_loader,
          metadata.loader_version || null,
          metadata.game_version || null,
          metadata.mod_count,
          metadata.icon_path || null,
          metadata.instance_type,
          metadata.launcher || null,
          metadata.instance_name || null,
          metadata.folder_size_mb || null,
          metadata.mods_folder_size_mb || null
        );
      } catch (error) {
        console.error(`Error analyzing metadata for folder ${folderId}:`, error);
      }

      // Store in local SQLite database
      const stmt = db.transaction((savesToInsert: Save[]) => {
        for (const save of savesToInsert) {
          const existing = queries.getSaveById.get(save.id);

          if (existing) {
            // Update existing with new metadata (including version)
            queries.updateSaveMetadata.run(
              save.version,
              save.game_mode,
              save.difficulty,
              save.seed,
              save.play_time_ticks,
              save.spawn_x,
              save.spawn_y,
              save.spawn_z,
              save.id
            );
          } else {
            // Insert new
            queries.insertSave.run(
              save.id,
              save.user_uuid,
              save.folder_id || null,
              save.world_name,
              save.file_path,
              save.version,
              save.game_mode,
              save.difficulty,
              save.seed,
              save.play_time_ticks,
              save.spawn_x,
              save.spawn_y,
              save.spawn_z,
              save.health || null,
              save.hunger || null,
              save.level || null,
              save.xp || null,
              save.food_eaten || null,
              save.beds_slept_in || null,
              save.deaths || null,
              save.blocks_mined || null,
              save.blocks_placed || null,
              save.items_crafted || null,
              save.mobs_killed || null,
              save.damage_taken || null
            );
          }
        }
      });

      stmt(saves);
      console.log(`💾 Stored ${saves.length} saves in database`);
      return { success: true, saves };
    } catch (error: any) {
      console.error('Error scanning folder:', error);
      return { success: false, error: error.message };
    }
  });

  // Batch scanning: discover all instances in a parent folder
  ipcMain.handle('scanner:discoverInstances', async (event, parentFolderPath: string) => {
    try {
      console.log('\n🔍 Discovering instances in parent folder...');
      const instances = discoverInstancesInFolder(parentFolderPath);

      return { success: true, instances };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Batch scan: add and scan all instances in a parent folder
  ipcMain.handle('scanner:batchAddAndScan', async (event, userUuid: string, parentFolderPath: string) => {
    try {
      console.log(`\n📦 Batch scanning parent folder for user: ${userUuid}`);

      // Discover all instances in the parent folder
      const instances = discoverInstancesInFolder(parentFolderPath);

      if (instances.length === 0) {
        return { success: false, error: 'No Minecraft instances found in this folder' };
      }

      console.log(`\n➕ Adding ${instances.length} instance(s) to database...`);

      // Add all instances as save folders
      const addedFolders: Array<{ id: string; path: string; name: string }> = [];
      for (const instance of instances) {
        try {
          const folderId = uuidv4();
          queries.addSaveFolder.run(folderId, userUuid, instance.path, instance.name);
          addedFolders.push({ id: folderId, path: instance.path, name: instance.name });
          console.log(`  ✓ Added: ${instance.name}`);
        } catch (error) {
          console.error(`  ✗ Failed to add ${instance.name}:`, error);
        }
      }

      console.log(`\n🔄 Scanning saves for all instances...`);

      // Get all folders for this user (including newly added ones)
      const folders = queries.getSaveFolders.all(userUuid);

      // Scan all folders for saves
      const saves = await scanMinecraftSavesFromFolders(
        userUuid,
        folders.map((f: any) => ({ id: f.id, path: f.folder_path }))
      );

      // Analyze and store instance metadata for each folder
      folders.forEach((folder: any) => {
        try {
          console.log(`\n📊 Analyzing: ${folder.folder_path}`);
          const metadata = analyzeInstanceMetadata(folder.folder_path, folder.id);
          queries.saveInstanceMetadata.run(
            metadata.folder_id,
            metadata.mod_loader,
            metadata.loader_version || null,
            metadata.game_version || null,
            metadata.mod_count,
            metadata.icon_path || null,
            metadata.instance_type,
            metadata.launcher || null,
            metadata.instance_name || null,
            metadata.folder_size_mb || null,
            metadata.mods_folder_size_mb || null
          );
        } catch (error) {
          console.error(`Error analyzing metadata for folder ${folder.id}:`, error);
        }
      });

      // Store saves in database
      const stmt = db.transaction((savesToInsert: Save[]) => {
        for (const save of savesToInsert) {
          const existing = queries.getSaveById.get(save.id);
          if (existing) {
            queries.updateSave.run(save.notes || null, save.status || null, null, save.id);
          } else {
            queries.insertSave.run(
              save.id,
              save.user_uuid,
              save.folder_id || null,
              save.world_name,
              save.file_path,
              save.version,
              save.game_mode,
              save.difficulty,
              save.seed,
              save.play_time_ticks,
              save.spawn_x,
              save.spawn_y,
              save.spawn_z,
              save.health || null,
              save.hunger || null,
              save.level || null,
              save.xp || null,
              save.food_eaten || null,
              save.beds_slept_in || null,
              save.deaths || null,
              save.blocks_mined || null,
              save.blocks_placed || null,
              save.items_crafted || null,
              save.mobs_killed || null,
              save.damage_taken || null
            );
          }
        }
      });

      stmt(saves);

      console.log(`\n✅ Batch scan complete! Found ${addedFolders.length} instances and ${saves.length} saves`);

      return {
        success: true,
        instancesAdded: addedFolders.length,
        savesFound: saves.length,
        instances: addedFolders
      };
    } catch (error: any) {
      console.error('Batch scan error:', error);
      return { success: false, error: error.message };
    }
  });

  // Launch an instance
  ipcMain.handle('scanner:launchInstance', async (event, launcherType: LauncherType, instancePath: string, instanceName: string) => {
    try {
      console.log(`🎮 Launch request for ${launcherType} instance: ${instanceName}`);
      const result = await launchInstance(launcherType, instancePath, instanceName);
      return result;
    } catch (error: any) {
      console.error('Launch error:', error);
      return { success: false, message: `Failed to launch instance: ${error.message}` };
    }
  });

  // Check if launcher is available
  ipcMain.handle('scanner:checkLauncherAvailable', async (event, launcherType: LauncherType) => {
    try {
      const exePath = findLauncherExecutable(launcherType);
      return {
        success: true,
        available: !!exePath,
        exePath: exePath || null,
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Get mods for an instance
  ipcMain.handle('scanner:getInstanceMods', async (event, instancePath: string) => {
    try {
      console.log(`📦 Scanning mods in: ${instancePath}`);
      const mods = getInstanceMods(instancePath);
      console.log(`✅ Found ${mods.length} mod(s)`);
      return { success: true, mods };
    } catch (error: any) {
      console.error('Error scanning mods:', error);
      return { success: false, error: error.message };
    }
  });

  // Get resourcepacks for an instance
  ipcMain.handle('scanner:getInstanceResourcepacks', async (event, instancePath: string) => {
    try {
      const resourcepacks = getInstanceResourcepacks(instancePath);
      return { success: true, resourcepacks };
    } catch (error: any) {
      console.error('Error scanning resourcepacks:', error);
      return { success: false, error: error.message };
    }
  });

  // Get shaderpacks for an instance
  ipcMain.handle('scanner:getInstanceShaderpacks', async (event, instancePath: string) => {
    try {
      const shaderpacks = getInstanceShaderpacks(instancePath);
      return { success: true, shaderpacks };
    } catch (error: any) {
      console.error('Error scanning shaderpacks:', error);
      return { success: false, error: error.message };
    }
  });

  // Get screenshots for an instance
  ipcMain.handle('scanner:getInstanceScreenshots', async (event, instancePath: string) => {
    try {
      const screenshots = getInstanceScreenshots(instancePath);
      return { success: true, screenshots };
    } catch (error: any) {
      console.error('Error scanning screenshots:', error);
      return { success: false, error: error.message };
    }
  });

  // Load image file as data URI
  ipcMain.handle('utils:loadImageAsDataUri', async (event, filePath: string) => {
    try {
      // Validate file path to prevent directory traversal
      const normalizedPath = path.normalize(filePath);

      if (!fs.existsSync(normalizedPath)) {
        console.error(`File not found: ${normalizedPath}`);
        return { success: false, error: `File not found: ${normalizedPath}` };
      }

      console.log(`📸 [IPC] File exists, reading...`);

      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(normalizedPath);
      console.log(`📸 [IPC] Read ${fileBuffer.length} bytes`);

      const base64 = fileBuffer.toString('base64');
      console.log(`📸 [IPC] Converted to base64, length: ${base64.length}`);

      // Determine MIME type from file extension
      const ext = path.extname(normalizedPath).toLowerCase();
      let mimeType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.bmp') mimeType = 'image/bmp';

      console.log(`📸 [IPC] MIME type: ${mimeType}`);

      const dataUri = `data:${mimeType};base64,${base64}`;
      console.log(`✅ [IPC] Successfully created data URI, length: ${dataUri.length}`);
      return { success: true, dataUri };
    } catch (error: any) {
      console.error(`❌ [IPC] Error loading image as data URI:`, error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  });
}
