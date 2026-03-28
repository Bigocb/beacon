import { ipcMain } from 'electron';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { scanMinecraftSaves, scanMinecraftSavesFromFolders, scanFolder, Save } from './index';
import { getAllDetectedAccounts } from './profiles';
import { detectLauncherAndGetSavesPath } from './instance-metadata';
import { discoverInstancesInFolder } from './batch-scanner';
import { launchInstance, findLauncherExecutable, LauncherType } from './launcher-executor';
import { getInstanceMods } from './mods-scanner';
import { getInstanceResourcepacks } from './resourcepacks-scanner';
import { getInstanceShaderpacks } from './shaderpacks-scanner';
import { getInstanceScreenshots } from './screenshots-scanner';

// GraphQL helper
async function graphqlQuery(query: string, variables?: any, token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const response = await axios.post(`http://localhost:3000/graphql`, { query, variables }, { headers });
  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }
  return response.data.data;
}

export function registerScannerIPC() {
  ipcMain.handle('scanner:detectAccounts', async () => {
    try {
      const accounts = getAllDetectedAccounts();
      return { success: true, accounts };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scanner:scanSaves', async (event, userUuid: string, token?: string) => {
    try {
      const saves = await scanMinecraftSaves(userUuid);
      console.log(`💾 Uploading ${saves.length} scanned saves to backend API...`);

      // Upload scanned saves to backend via GraphQL
      // Use custom serializer to handle BigInt values in file stats
      const savesJson = JSON.parse(JSON.stringify(saves, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));

      const mutation = `
        mutation batchUpsert($saves: [SaveInput!]!) {
          batchUpsertSaves(saves: $saves) {
            inserted
            updated
            message
          }
        }
      `;

      const result = await graphqlQuery(mutation, { saves: savesJson }, token);
      console.log(`✅ Backend response:`, result.batchUpsertSaves);
      return { success: true, saves: result.batchUpsertSaves || savesJson };
    } catch (error: any) {
      console.error('❌ [scanSaves] Error uploading to backend:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('scanner:getSaves', async (event, userUuid: string, token?: string) => {
    try {
      // Fetch from backend API instead of local database
      const query = `
        query {
          saves(limit: 100) {
            saves {
              id
              folder_id
              world_name
              version
              game_mode
              difficulty
              file_path
              seed
              spawn_x
              spawn_y
              spawn_z
              play_time_ticks
              last_played
              health
              hunger
              level
              xp
            }
            total
          }
        }
      `;
      const result = await graphqlQuery(query, {}, token);
      const saves = result.saves?.saves || [];
      return { success: true, saves, savesCount: saves.length };
    } catch (error: any) {
      console.error('❌ [getSaves] Error fetching saves:', error.message);
      // Fallback to empty array if backend is unavailable
      return { success: false, savesCount: 0, error: error.message };
    }
  });

  ipcMain.handle('scanner:updateSave', async (event, saveId: string, updates: any, token?: string) => {
    try {
      // Update save via backend GraphQL API
      const mutation = `
        mutation updateSave($id: String!, $data: SaveUpdateInput!) {
          updateSave(id: $id, data: $data) {
            id
            world_name
            version
          }
        }
      `;
      const result = await graphqlQuery(mutation, { id: saveId, data: updates }, token);

      console.log(`✅ [updateSave] Save updated on backend`);
      return { success: true, save: result.updateSave };
    } catch (error: any) {
      console.error('❌ [updateSave] Error updating save:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Folder management is now API-driven via backend /folders endpoint
  // See FolderManager.tsx for frontend implementation

  ipcMain.handle('scanner:getInstanceMetadata', async (event, userUuid: string, token?: string) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const query = `
        query {
          instances {
            folder_id
            display_name
            instance_name
            mod_loader
            loader_version
            game_version
            instance_type
            launcher
            save_count
            mod_count
          }
        }
      `;

      const response = await axios.post(`http://localhost:3000/graphql`, { query }, { headers });

      if (response.data.errors) {
        throw new Error(response.data.errors[0].message);
      }

      const metadata = response.data.data?.instances || [];
      return { success: true, metadata, metadataCount: metadata.length };
    } catch (error: any) {
      console.error('❌ [getInstanceMetadata] Error:', error.message);
      return { success: false, metadataCount: 0, error: error.message };
    }
  });

  ipcMain.handle('scanner:scanAllFolders', async (event, userUuid: string, token?: string) => {
    try {
      console.log('🔄 Starting scanAllFolders for user:', userUuid);

      // Fetch configured folders from backend GraphQL API
      const foldersQuery = `
        query {
          folders {
            id
            folder_path
            display_name
          }
        }
      `;
      const foldersResult = await graphqlQuery(foldersQuery, {}, token);
      const folders = foldersResult.folders || [];

      console.log(`📁 Found ${folders.length} folders to scan`);
      if (folders.length > 0) {
        console.log('📋 Folders:', folders.map((f: any) => ({ id: f.id, path: f.folder_path })));
      }

      // If no custom folders, fall back to default Minecraft saves location
      const saves = folders.length > 0
        ? await scanMinecraftSavesFromFolders(userUuid, folders.map((f: any) => ({ id: f.id, path: f.folder_path })))
        : await scanMinecraftSaves(userUuid);

      console.log(`💾 Found ${saves.length} total saves`);

      // Upload scanned saves to backend via GraphQL
      // Use custom serializer to handle BigInt values in file stats
      const savesJson = JSON.parse(JSON.stringify(saves, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));

      const mutation = `
        mutation batchUpsert($saves: [SaveInput!]!) {
          batchUpsertSaves(saves: $saves) {
            inserted
            updated
            message
          }
        }
      `;

      const result = await graphqlQuery(mutation, { saves: savesJson }, token);
      console.log(`✅ Backend response:`, result.batchUpsertSaves);
      return { success: true, saves: result.batchUpsertSaves || saves };
    } catch (error: any) {
      console.error('❌ [scanAllFolders] Error:', error.message);
      return { success: false, error: error.message };
    }
  });

  // Scan a single folder
  ipcMain.handle('scanner:scanFolder', async (event, folderId: string, userUuid: string, token?: string) => {
    try {
      console.log(`🔄 Starting scanFolder for folder: ${folderId}, user: ${userUuid}`);

      // Get folder path from backend GraphQL API
      const foldersQuery = `
        query {
          folders {
            id
            folder_path
            display_name
          }
        }
      `;
      const foldersResult = await graphqlQuery(foldersQuery, {}, token);
      const folders = foldersResult.folders || [];
      const folder = folders.find((f: any) => f.id === folderId);

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

      // Upload scanned saves to backend via GraphQL
      // Use custom serializer to handle BigInt values in file stats
      const savesJson = JSON.parse(JSON.stringify(saves, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
      const mutation = `
        mutation batchUpsert($saves: [SaveInput!]!) {
          batchUpsertSaves(saves: $saves) {
            inserted
            updated
            message
          }
        }
      `;
      const result = await graphqlQuery(mutation, { saves: savesJson }, token);
      console.log(`✅ Backend response:`, result.batchUpsertSaves);
      return { success: true, saves: result.batchUpsertSaves || savesJson };
    } catch (error: any) {
      console.error('❌ [scanFolder] Error:', error.message);
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
  ipcMain.handle('scanner:batchAddAndScan', async (event, userUuid: string, parentFolderPath: string, token?: string) => {
    try {
      console.log(`\n📦 Batch scanning parent folder for user: ${userUuid}`);

      // Discover all instances in the parent folder
      const instances = discoverInstancesInFolder(parentFolderPath);
      console.log(`🔍 Discovered instances:`, JSON.stringify(instances, null, 2));

      if (instances.length === 0) {
        return { success: false, error: 'No Minecraft instances found in this folder' };
      }

      console.log(`\n➕ Adding ${instances.length} instance(s) via backend API...`);

      // Add all instances as save folders via backend GraphQL API
      const addedFolders: Array<{ id: string; path: string; name: string }> = [];

      for (const instance of instances) {
        try {
          const mutation = `
            mutation createFolder($folder_path: String!, $display_name: String!) {
              createFolder(folder_path: $folder_path, display_name: $display_name) {
                id
                folder_path
                display_name
              }
            }
          `;
          console.log(`📤 Creating folder with vars:`, { folder_path: instance.path, display_name: instance.name });
          const result = await graphqlQuery(mutation, {
            folder_path: instance.path,
            display_name: instance.name
          }, token);

          const folder = result.createFolder;
          addedFolders.push({ id: folder.id, path: folder.folder_path, name: folder.display_name });
          console.log(`  ✓ Added: ${instance.name}`);
        } catch (error) {
          console.error(`  ✗ Failed to add ${instance.name}:`, error);
        }
      }

      console.log(`\n🔄 Scanning saves for all instances...`);

      // Fetch all folders for this user (including newly added ones) from backend GraphQL API
      const foldersQuery = `
        query {
          folders {
            id
            folder_path
            display_name
          }
        }
      `;
      const foldersResult = await graphqlQuery(foldersQuery, {}, token);
      const folders = foldersResult.folders || [];

      // Scan all folders for saves
      const saves = await scanMinecraftSavesFromFolders(
        userUuid,
        folders.map((f: any) => ({ id: f.id, path: f.folder_path }))
      );

      // Upload scanned saves to backend via GraphQL
      // Use custom serializer to handle BigInt values in file stats
      const savesJson = JSON.parse(JSON.stringify(saves, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      ));
      const mutation = `
        mutation batchUpsert($saves: [SaveInput!]!) {
          batchUpsertSaves(saves: $saves) {
            inserted
            updated
            message
          }
        }
      `;
      const result = await graphqlQuery(mutation, { saves: savesJson }, token);
      console.log(`\n✅ Batch scan complete! Added ${addedFolders.length} instance(s) and found ${saves.length} save(s)`);

      return {
        success: true,
        instancesAdded: addedFolders.length,
        savesFound: saves.length,
        instances: addedFolders
      };
    } catch (error: any) {
      console.error('❌ [batchAddAndScan] Error:', error.message);
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
