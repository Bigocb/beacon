// Standalone offline app - no backend sync needed
// IPC handlers for sync are not required for local-only data storage

export function registerSyncIPC() {
  // No-op: All data is stored locally in SQLite
  // No backend syncing needed for standalone app
}
