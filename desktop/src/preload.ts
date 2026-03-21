import { contextBridge, ipcRenderer, dialog } from 'electron';

const api = {
  // File system
  fs: {
    selectFolder: async () => {
      const result = await ipcRenderer.invoke('fs:selectFolder');
      return result;
    },
  },


  // Auth - Google OAuth or Local User
  auth: {
    initiateLogin: () => ipcRenderer.invoke('auth:initiateLogin'),
    handleCallback: (code: string) => ipcRenderer.invoke('auth:handleCallback', code),
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
    getLocalAccounts: () => ipcRenderer.invoke('auth:getLocalAccounts'),
    createLocalUser: (username: string) => ipcRenderer.invoke('auth:createLocalUser', username),
    logout: () => ipcRenderer.invoke('auth:logout'),
    onOAuthCallback: (callback: (data: any) => void) => {
      ipcRenderer.on('auth:oauth-callback', (event, data) => callback(data));
    },
  },

  // Scanner
  scanner: {
    detectAccounts: () => ipcRenderer.invoke('scanner:detectAccounts'),
    scanSaves: (userUuid: string) => ipcRenderer.invoke('scanner:scanSaves', userUuid),
    getSaves: (userUuid: string) => ipcRenderer.invoke('scanner:getSaves', userUuid),
    updateSave: (saveId: string, updates: any) =>
      ipcRenderer.invoke('scanner:updateSave', saveId, updates),
    listFolders: (userUuid: string) => ipcRenderer.invoke('scanner:listFolders', userUuid),
    addFolder: (userUuid: string, folderPath: string, displayName?: string) =>
      ipcRenderer.invoke('scanner:addFolder', userUuid, folderPath, displayName),
    removeFolder: (folderId: string, userUuid: string) =>
      ipcRenderer.invoke('scanner:removeFolder', folderId, userUuid),
    scanAllFolders: (userUuid: string) => ipcRenderer.invoke('scanner:scanAllFolders', userUuid),
    scanFolder: (folderId: string, userUuid: string) => ipcRenderer.invoke('scanner:scanFolder', folderId, userUuid),
    getInstanceMetadata: (userUuid: string) => ipcRenderer.invoke('scanner:getInstanceMetadata', userUuid),
    // Batch scanning: discover instances in a parent folder
    discoverInstances: (parentFolderPath: string) => ipcRenderer.invoke('scanner:discoverInstances', parentFolderPath),
    // Batch scan: add and scan all instances in a parent folder
    batchAddAndScan: (userUuid: string, parentFolderPath: string) =>
      ipcRenderer.invoke('scanner:batchAddAndScan', userUuid, parentFolderPath),
    // Launch instance
    launchInstance: (launcherType: string, instancePath: string, instanceName: string) =>
      ipcRenderer.invoke('scanner:launchInstance', launcherType, instancePath, instanceName),
    // Check if launcher is available
    checkLauncherAvailable: (launcherType: string) =>
      ipcRenderer.invoke('scanner:checkLauncherAvailable', launcherType),
    // Get mods for an instance
    getInstanceMods: (instancePath: string) =>
      ipcRenderer.invoke('scanner:getInstanceMods', instancePath),
    // Get resourcepacks for an instance
    getInstanceResourcepacks: (instancePath: string) =>
      ipcRenderer.invoke('scanner:getInstanceResourcepacks', instancePath),
    // Get shaderpacks for an instance
    getInstanceShaderpacks: (instancePath: string) =>
      ipcRenderer.invoke('scanner:getInstanceShaderpacks', instancePath),
    // Get screenshots for an instance
    getInstanceScreenshots: (instancePath: string) =>
      ipcRenderer.invoke('scanner:getInstanceScreenshots', instancePath),
  },

  // Utilities
  utils: {
    loadImageAsDataUri: (filePath: string) =>
      ipcRenderer.invoke('utils:loadImageAsDataUri', filePath),
  },

  // Logging
  logger: {
    writeLogs: (logEntries: any[]) =>
      ipcRenderer.invoke('write-logs', logEntries),
  },

  // Player data
  player: {
    getPlayerList: (savePath: string) =>
      ipcRenderer.invoke('player:getPlayerList', savePath),
    extractPlayerData: (savePath: string, uuid: string) =>
      ipcRenderer.invoke('player:extractPlayerData', savePath, uuid),
  },

  // Progress data
  progress: {
    extractAdvancements: (savePath: string, uuid: string) =>
      ipcRenderer.invoke('progress:extractAdvancements', savePath, uuid),
    extractStatistics: (savePath: string, uuid: string) =>
      ipcRenderer.invoke('progress:extractStatistics', savePath, uuid),
  },

  // Exploration data
  exploration: {
    extractExploration: (savePath: string, uuid: string) =>
      ipcRenderer.invoke('exploration:extractExploration', savePath, uuid),
  },

  // Favorites
  favorites: {
    getAll: () => ipcRenderer.invoke('favorites:getAll'),
    add: (instanceFolderId: string) =>
      ipcRenderer.invoke('favorites:add', { instanceFolderId }),
    remove: (instanceFolderId: string) =>
      ipcRenderer.invoke('favorites:remove', { instanceFolderId }),
  },

  // Players
  players: {
    getPlayerName: (uuid: string) =>
      ipcRenderer.invoke('players:getPlayerName', { uuid }),
  },
};

contextBridge.exposeInMainWorld('api', api);
