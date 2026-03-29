import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import { spawn, ChildProcess } from 'child_process';
import express from 'express';
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
let backendProcess: ChildProcess | null = null;

// Start backend server in packaged mode
async function startBackendServer() {
  if (app.isPackaged) {
    console.log('🚀 Starting backend server...');
    try {
      const backendDir = path.join(__dirname, '../backend');

      backendProcess = spawn('npm', ['start'], {
        cwd: backendDir,
        stdio: 'inherit',
        shell: true,
      });

      backendProcess.on('error', (error) => {
        console.error('❌ Backend process error:', error);
      });

      backendProcess.on('exit', (code) => {
        console.warn(`⚠️ Backend process exited with code ${code}`);
        backendProcess = null;
      });

      // Wait for backend health check instead of fixed delay
      let attempts = 0;
      const maxAttempts = 30; // 30 attempts * 100ms = 3 seconds max
      while (attempts < maxAttempts) {
        try {
          const response = await fetch('http://localhost:3000/health');
          if (response.ok) {
            console.log('✅ Backend server ready');
            return;
          }
        } catch {
          // Backend not ready yet, try again
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      console.warn('⚠️ Backend health check timed out, but proceeding anyway');
    } catch (error) {
      console.error('❌ Failed to start backend server:', error);
    }
  }
}

async function startRendererServer() {
  const rendererApp = express();
  // In packaged mode, renderer is at app.asar/dist/renderer
  // __dirname is app.asar/dist, so renderer is at ./renderer relative to dist
  const rendererDir = path.join(__dirname, 'renderer');

  console.log(`📁 Renderer directory: ${rendererDir}`);

  rendererApp.use(express.static(rendererDir));
  rendererApp.get('*', (req, res) => {
    res.sendFile(path.join(rendererDir, 'index.html'));
  });

  return new Promise<string>((resolve) => {
    const server = rendererApp.listen(3001, '127.0.0.1', () => {
      console.log('📡 Renderer server started on http://127.0.0.1:3001');
      resolve('http://127.0.0.1:3001');
    });
  });
}

async function createWindow() {
  const isDev = !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const startUrl = isDev
    ? 'http://localhost:5174'
    : await startRendererServer();

  mainWindow.loadURL(startUrl);

  // Open dev tools only in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
  // Start backend server in packaged mode
  await startBackendServer();

  // Restore user auth from database (for app restart persistence)
  try {
    restoreAuthFromDatabase();
  } catch (error) {
    console.error('Failed to restore auth:', error);
  }

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

  // Favorites handlers - call backend GraphQL API
  const axios = require('axios').default;

  // GraphQL query helper for favorites
  async function graphqlQuery(query: string, variables?: any, token?: string) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const response = await axios.post(`http://localhost:3000/graphql`, { query, variables }, { headers });
    if (response.data.errors) {
      throw new Error(response.data.errors[0].message);
    }
    return response.data.data;
  }

  ipcMain.handle('favorites:getAll', async (event, token?: string) => {
    try {
      const query = `
        query {
          getFavorites
        }
      `;
      const result = await graphqlQuery(query, {}, token);
      return { success: true, favorites: result.getFavorites || [] };
    } catch (error: any) {
      console.error('❌ [favorites:getAll] Error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('favorites:add', async (event, { instanceFolderId, token }: { instanceFolderId: string; token?: string }) => {
    try {
      if (!instanceFolderId) {
        return { success: false, error: 'instanceFolderId is required' };
      }
      const mutation = `
        mutation addFav($id: String!) {
          addFavorite(instanceFolderId: $id)
        }
      `;
      const result = await graphqlQuery(mutation, { id: instanceFolderId }, token);
      return { success: true, added: result.addFavorite };
    } catch (error: any) {
      console.error('❌ [favorites:add] Error:', error.message);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('favorites:remove', async (event, { instanceFolderId, token }: { instanceFolderId: string; token?: string }) => {
    try {
      const mutation = `
        mutation removeFav($id: String!) {
          removeFavorite(instanceFolderId: $id)
        }
      `;
      const result = await graphqlQuery(mutation, { id: instanceFolderId }, token);
      return { success: true, removed: result.removeFavorite };
    } catch (error: any) {
      console.error('❌ [favorites:remove] Error:', error.message);
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
  // Kill backend process before quitting
  if (backendProcess) {
    const proc = backendProcess;
    console.log('🛑 Killing backend process (PID:', proc.pid, ')');
    try {
      // Try graceful shutdown first
      proc.kill('SIGTERM');
      // If still running after 2 seconds, force kill
      setTimeout(() => {
        if (!proc.killed) {
          console.log('⚠️ Backend still running, force killing...');
          proc.kill('SIGKILL');
        }
      }, 2000);
    } catch (error) {
      console.error('Error killing backend:', error);
    }
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
