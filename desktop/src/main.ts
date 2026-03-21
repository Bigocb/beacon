import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/sqlite';
import db from './db/sqlite';
import { registerIPC as registerAuthIPC, restoreAuthFromDatabase } from './auth/oauth';
import { registerScannerIPC } from './scanner/ipc';
import { registerSyncIPC } from './sync/ipc';
import { getPlayerList, extractPlayerData, extractAdvancementData, extractStatisticsData, extractExplorationData } from './utils/saveDataExtractor';

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Debug: Log environment variables (Client ID only, not secret)
console.log('=== Environment Configuration ===');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '***SET***' : 'NOT SET');
console.log('================================');

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = !app.isPackaged;
  const startUrl = isDev
    ? 'http://localhost:5174'
    : `file://${path.join(__dirname, '../renderer/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  // Initialize SQLite database
  initializeDatabase();

  // Restore user auth from database (for app restart persistence)
  restoreAuthFromDatabase();

  // Register IPC handlers
  registerAuthIPC();
  registerScannerIPC();
  registerSyncIPC();

  // Logging handler
  ipcMain.handle('write-logs', async (event, logEntries) => {
    try {
      const logsDir = path.join(app.getPath('userData'), 'logs');
      await fs.mkdir(logsDir, { recursive: true });

      const logFile = path.join(logsDir, 'debug.log');
      const timestamp = new Date().toISOString();
      const content = logEntries
        .map((entry: any) => `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`)
        .join('\n');

      await fs.appendFile(logFile, content + '\n', 'utf-8');
    } catch (error) {
      console.error('Error writing logs:', error);
    }
  });

  // Player data handlers
  ipcMain.handle('player:getPlayerList', async (event, savePath: string) => {
    try {
      console.log(`🎮 [IPC] Getting player list from: ${savePath}`);
      const uuids = await getPlayerList(savePath);
      console.log(`✅ [IPC] Found ${uuids.length} players: ${uuids.join(', ')}`);
      return { success: true, data: uuids };
    } catch (error: any) {
      console.error('❌ [IPC] Error getting player list:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('player:extractPlayerData', async (event, savePath: string, uuid: string) => {
    try {
      console.log(`🎮 [IPC] Extracting player data - UUID: ${uuid}, Path: ${savePath}`);
      const playerData = await extractPlayerData(savePath, uuid);
      console.log(`✅ [IPC] Player data extracted:`, playerData);
      return { success: true, data: playerData };
    } catch (error: any) {
      console.error(`❌ [IPC] Error extracting player data for ${uuid}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Progress data handlers
  ipcMain.handle('progress:extractAdvancements', async (event, savePath: string, uuid: string) => {
    try {
      console.log(`📈 [IPC] Extracting advancements - UUID: ${uuid}`);
      const advancementData = await extractAdvancementData(savePath, uuid);
      console.log(`✅ [IPC] Advancements extracted:`, advancementData);
      return { success: true, data: advancementData };
    } catch (error: any) {
      console.error(`❌ [IPC] Error extracting advancements for ${uuid}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('progress:extractStatistics', async (event, savePath: string, uuid: string) => {
    try {
      console.log(`📊 [IPC] Extracting statistics - UUID: ${uuid}`);
      const statsData = await extractStatisticsData(savePath, uuid);
      console.log(`✅ [IPC] Statistics extracted:`, statsData);
      return { success: true, data: statsData };
    } catch (error: any) {
      console.error(`❌ [IPC] Error extracting statistics for ${uuid}:`, error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('exploration:extractExploration', async (event, savePath: string, uuid: string) => {
    try {
      console.log(`🗺️ [IPC] Extracting exploration data - UUID: ${uuid}`);
      const explorationData = await extractExplorationData(savePath, uuid);
      console.log(`✅ [IPC] Exploration data extracted:`, explorationData);
      return { success: true, data: explorationData };
    } catch (error: any) {
      console.error(`❌ [IPC] Error extracting exploration data for ${uuid}:`, error);
      return { success: false, error: error.message };
    }
  });

  // File system handlers
  ipcMain.handle('fs:selectFolder', async (event) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Minecraft Saves Folder',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    return result.filePaths[0];
  });

  // Favorites handlers
  ipcMain.handle('favorites:getAll', async (event) => {
    try {
      const rows = db.prepare(`
        SELECT instance_folder_id
        FROM favorites
        ORDER BY created_at DESC
      `).all();
      const favoriteIds = rows?.map((row: any) => row.instance_folder_id) || [];
      return { success: true, favorites: favoriteIds };
    } catch (error: any) {
      console.error('Error fetching favorites:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('favorites:add', async (event, { instanceFolderId }: { instanceFolderId: string }) => {
    try {
      if (!instanceFolderId) {
        return { success: false, error: 'instanceFolderId is required' };
      }

      const id = `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      db.prepare(
        `INSERT OR IGNORE INTO favorites (id, instance_folder_id, created_at)
         VALUES (?, ?, datetime('now'))`
      ).run(id, instanceFolderId);
      return { success: true, id };
    } catch (error: any) {
      console.error('Error adding favorite:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('favorites:remove', async (event, { instanceFolderId }: { instanceFolderId: string }) => {
    try {
      db.prepare(
        `DELETE FROM favorites WHERE instance_folder_id = ?`
      ).run(instanceFolderId);
      return { success: true };
    } catch (error: any) {
      console.error('Error removing favorite:', error);
      return { success: false, error: error.message };
    }
  });

  // Player name lookup handler
  ipcMain.handle('players:getPlayerName', async (event, { uuid }: { uuid: string }) => {
    try {
      const response = await fetch(`https://sessionserver.mojang.com/session/minecraft/profile/${uuid}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, name: data.name, uuid: data.id };
    } catch (error: any) {
      console.error('Error fetching player name:', error);
      return { success: false, error: error.message, name: null };
    }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
