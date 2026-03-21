# 🏗️ Minecraft Save Tracker - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     MINECRAFT SAVE TRACKER                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │               Electron Main Process                         │ │
│  │  • App lifecycle management                               │ │
│  │  • Window management                                      │ │
│  │  • IPC communication                                      │ │
│  │  • Database initialization                                │ │
│  └────────────────┬───────────────────────────────────────────┘ │
│                   │                                              │
│  ┌────────────────▼────────────────────────────────────────────┐ │
│  │              SQLite Database                                │ │
│  │  • saves table                                            │ │
│  │  • instance_metadata table                                │ │
│  │  • auth table                                             │ │
│  │  • save_folders table                                     │ │
│  │  • backups table                                          │ │
│  │  • sync_queue table                                       │ │
│  └────────────────┬───────────────────────────────────────────┘ │
│                   │                                              │
│  ┌────────────────▼───────────────────────────────────────────┐ │
│  │           Backend Services (Node.js)                       │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Scanner Service                                     │ │ │
│  │  │ • Folder scanning                                  │ │ │
│  │  │ • Save detection                                   │ │ │
│  │  │ • Metadata analysis                                │ │ │
│  │  │ • Launcher detection                               │ │ │
│  │  │ • Size calculation                                 │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Auth Service                                        │ │ │
│  │  │ • Local user creation                              │ │ │
│  │  │ • Google OAuth integration                         │ │ │
│  │  │ • Session restoration                              │ │ │
│  │  │ • Token management                                 │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Sync Service (Future)                               │ │ │
│  │  │ • Cloud synchronization                             │ │ │
│  │  │ • Change tracking                                   │ │ │
│  │  │ • Conflict resolution                               │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         IPC Bridge (Preload)                               │ │
│  │  • Secure API exposure                                   │ │
│  │  • Type-safe communication                              │ │
│  │  • Request/response handling                            │ │
│  └────────────────┬───────────────────────────────────────────┘ │
│                   │                                              │
│  ┌────────────────▼───────────────────────────────────────────┐ │
│  │              React Frontend                                │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Pages                                               │ │ │
│  │  │ • LoginPage - Authentication                       │ │ │
│  │  │ • DashboardPage - Instance cards                   │ │ │
│  │  │ • InstanceDetailView - Instance details            │ │ │
│  │  │ • MetricsPage - Analytics (future)                 │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Components                                          │ │ │
│  │  │ • SavesByInstance - Saves list                      │ │ │
│  │  │ • FolderManager - Folder management modal           │ │ │
│  │  │ • SaveDetailsModal - Save editing                   │ │ │
│  │  │ • InstanceDetailView - Metadata display             │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  │                                                            │ │
│  │  ┌──────────────────────────────────────────────────────┐ │ │
│  │  │ Styles (Dark Theme)                                 │ │ │
│  │  │ • Glassmorphism effects                             │ │ │
│  │  │ • Responsive design                                 │ │ │
│  │  │ • Dark slate colors                                 │ │ │
│  │  └──────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### User Login Flow
```
┌─────────────────────────────────────────────────────────────┐
│ User Opens App                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ App Startup (main.ts) │
            │ • Initialize DB       │
            │ • Restore Auth        │
            └──────────────┬────────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
          ┌──────────┐           ┌──────────┐
          │ Logged In│           │ Not Found│
          │ Restore  │           │ Show     │
          │ Session  │           │ Login    │
          └──────────┘           └────┬─────┘
                │                     │
                ▼                     ▼
          ┌──────────────────────────────┐
          │ Check Auth in Database       │
          │ Get user_uuid, token         │
          └──────────┬───────────────────┘
                     │
         ┌───────────┴────────────┐
         │                        │
         ▼                        ▼
    ┌────────────┐          ┌──────────────┐
    │ Dashboard  │          │ LoginPage    │
    │ (Logged In)│          │ (2 options)  │
    └────────────┘          └────┬─────────┘
                                  │
                      ┌───────────┴────────────┐
                      │                        │
                      ▼                        ▼
                ┌─────────────┐        ┌────────────┐
                │ Local User  │        │ OAuth      │
                │ Create with │        │ Sign in    │
                │ Username    │        │ w/ Google  │
                └─────────────┘        └────────────┘
                      │                        │
                      └───────────┬────────────┘
                                  │
                                  ▼
                        ┌──────────────────┐
                        │ Save to Database │
                        │ Create Auth Rec  │
                        └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │ Dashboard Page   │
                        │ (Saved!)         │
                        └──────────────────┘
```

### Save Scanning Flow
```
┌────────────────────────────────────┐
│ User Clicks "Add Folder"           │
└──────────────┬─────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ FolderManager Modal  │
    │ Browse & Select Path │
    └──────────────┬───────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │ addSaveFolder IPC Handler    │
    │ • Generate folder ID         │
    │ • Save folder path to DB     │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────┐
    │ User Clicks "Scan Folder"    │
    └──────────────┬───────────────┘
                   │
                   ▼
    ┌──────────────────────────────────┐
    │ scanAllFolders IPC Handler       │
    └──────────────┬────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
   ┌─────────────────┐  ┌──────────────────────┐
   │ For Each Folder │  │ analyzeInstanceMeta  │
   │ • Scan saves    │  │ • Detect launcher    │
   │ • Parse level.* │  │ • Detect mod loader  │
   │ • Extract data  │  │ • Count mods         │
   └────────┬────────┘  │ • Calculate sizes    │
            │           │ • Find icon          │
            ▼           └──────────┬───────────┘
   ┌─────────────────────────┐    │
   │ detectLauncher()        │    │
   │ • Check manifest.json   │────┘
   │ • Check instance.cfg    │
   │ • Check mmc-pack.json   │
   │ • Check modpack.json    │
   │ • Determine saves path  │
   └──────────┬──────────────┘
              │
              ▼
   ┌──────────────────────────┐
   │ Save Metadata to DB      │
   │ • launcher               │
   │ • instance_name          │
   │ • folder_size_mb         │
   │ • mods_folder_size_mb    │
   │ • mod_count              │
   │ • mod_loader             │
   └──────────┬───────────────┘
              │
              ▼
   ┌──────────────────────────┐
   │ Save Saves to DB         │
   │ • Create save records    │
   │ • Link to folder_id      │
   │ • Store metadata         │
   └──────────┬───────────────┘
              │
              ▼
   ┌──────────────────────────┐
   │ Return Results           │
   │ • Frontend updates       │
   │ • Shows new saves        │
   │ • Shows new metadata     │
   └──────────────────────────┘
```

### Instance Display Flow
```
┌────────────────────────────┐
│ DashboardPage Renders      │
│ • Get all instances        │
│ • Get all saves            │
│ • Get all metadata         │
└──────────────┬─────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ For Each Instance:   │
    │ InstanceCard shows:  │
    │ • Launcher icon 🎮   │
    │ • Mod loader badge   │
    │ • Save count         │
    │ • Mod count          │
    │ • Folder size        │
    └──────────────┬───────┘
                   │
     ┌─────────────┴─────────────┐
     │                           │
     ▼                           ▼
  Click Card                   Hover
     │                           │
     ▼                           ▼
┌─────────────────┐        ┌──────────────┐
│ Navigate to     │        │ Show hover   │
│ InstanceDetail  │        │ effects      │
│ View Pass:      │        │ • Highlight  │
│ • instance      │        │ • Shadow     │
│ • saves         │        │ • Scale      │
│ • folder_id     │        └──────────────┘
└────────┬────────┘
         │
         ▼
┌──────────────────────────┐
│ InstanceDetailView Init  │
│ • Filter saves by folder │
│ • Display metadata boxes │
│ • Show save list         │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Render Metadata Grid     │
│ • Mod Loader Box         │
│ • Instance Type Box      │
│ • Mods Count Box         │
│ • Launcher Box (with 🎮) │
│ • Folder Size Box        │
│ • Mods Size Box          │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐
│ Render Saves Section     │
│ • List all saves         │
│ • Clickable entries      │
│ • "No saves" message     │
└──────────────────────────┘
```

---

## Component Hierarchy

```
App
├── LoginPage
│   ├── LocalUserForm
│   │   └── Input: username
│   ├── GoogleAuthButton
│   └── SessionChecker
│
├── DashboardPage
│   ├── Header
│   │   ├── Logo
│   │   ├── UserMenu
│   │   ├── ViewToggle (Cards/List)
│   │   ├── SearchBar
│   │   └── ManageFoldersButton
│   │
│   ├── FolderManager (Modal)
│   │   ├── FolderList
│   │   │   └── FolderItem
│   │   │       ├── FolderPath
│   │   │       ├── ScanButton
│   │   │       └── DeleteButton
│   │   └── AddFolderButton
│   │
│   └── InstancesView
│       ├── CardsView
│       │   └── InstanceCard (multiple)
│       │       ├── LauncherIcon
│       │       ├── ModLoaderBadge
│       │       ├── SaveCount
│       │       ├── ModCount
│       │       └── FolderSize
│       │
│       └── ListView
│           └── InstanceRow (multiple)
│               ├── Icon
│               ├── Name
│               └── Info
│
└── InstanceDetailView
    ├── Header
    │   ├── BackButton
    │   ├── InstanceIcon
    │   ├── InstanceName
    │   └── InstancePath
    │
    ├── MetadataSection
    │   └── MetadataGrid
    │       ├── ModLoaderBox
    │       ├── InstanceTypeBox
    │       ├── ModCountBox
    │       ├── LauncherBox
    │       ├── FolderSizeBox
    │       └── ModsSizeBox
    │
    └── SavesSection
        ├── SavesHeader
        └── SavesByInstance
            └── SaveItem (multiple)
                ├── WorldName
                ├── GameMode
                ├── Version
                └── LastPlayed
```

---

## Database Schema

### Auth Table
```
auth
├── id (PK)
├── user_uuid (UNIQUE)
├── username
├── token
├── token_expires_at
├── created_at
└── updated_at
```

### Save Folders Table
```
save_folders
├── id (PK)
├── user_uuid (FK → auth)
├── folder_path
├── display_name
└── created_at
```

### Instance Metadata Table
```
instance_metadata
├── folder_id (PK, FK → save_folders)
├── mod_loader (vanilla, fabric, forge, quilt)
├── loader_version
├── game_version
├── mod_count
├── icon_path
├── instance_type (vanilla, modded)
├── launcher (curseforge, multimc, prismlauncher, atlauncher, direct)
├── instance_name
├── folder_size_mb
├── mods_folder_size_mb
└── updated_at
```

### Saves Table
```
saves
├── id (PK)
├── user_uuid (FK → auth)
├── folder_id (FK → save_folders)
├── world_name
├── file_path
├── version
├── game_mode
├── difficulty
├── seed
├── play_time_ticks
├── spawn_x, spawn_y, spawn_z
├── custom_tags
├── status
├── notes
├── last_played
├── created_at
├── updated_at
├── synced
└── UNIQUE(user_uuid, folder_id, world_name)
```

---

## IPC API

### Auth IPC Handlers
```typescript
ipcRenderer.invoke('auth:initiateLogin') → OAuth URL
ipcRenderer.invoke('auth:handleCallback', code) → User
ipcRenderer.invoke('auth:createLocalUser', username) → User
ipcRenderer.invoke('auth:getCurrentUser') → User
ipcRenderer.invoke('auth:logout') → void
```

### Scanner IPC Handlers
```typescript
ipcRenderer.invoke('scanner:listFolders', userUuid) → Folder[]
ipcRenderer.invoke('scanner:addFolder', userUuid, path) → Folder
ipcRenderer.invoke('scanner:removeFolder', folderId) → void
ipcRenderer.invoke('scanner:scanAllFolders', userUuid) → Save[]
ipcRenderer.invoke('scanner:getSaves', userUuid) → Save[]
ipcRenderer.invoke('scanner:getInstanceMetadata', userUuid) → Metadata[]
ipcRenderer.invoke('scanner:updateSave', saveId, updates) → Save
```

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Desktop** | Electron | Latest |
| **Frontend** | React 18 | 18.x |
| **Build** | Vite | Latest |
| **Type System** | TypeScript | 5.x |
| **Backend** | Node.js | 16+ |
| **Database** | SQLite | 3.x |
| **DB Driver** | better-sqlite3 | 9.x |
| **Auth** | Google OAuth 2.0 | - |
| **Styling** | CSS Modules | - |
| **State** | React Hooks | - |
| **IPC** | Electron IPC | - |

---

## Security Measures

1. **Preload Script**
   - Sandboxed context bridge
   - Type-safe API exposure
   - No direct require() access

2. **Database**
   - Local file storage (user's home directory)
   - No network by default
   - Foreign key constraints

3. **Authentication**
   - Token-based sessions
   - OAuth 2.0 for Google
   - Local user UUID generation

4. **File Access**
   - Restricted to user's home directory
   - No arbitrary file operations
   - Folder picker validated

---

## Performance Optimizations

1. **Database**
   - Indexed columns (user_uuid, folder_id, status)
   - Transaction batching for bulk operations
   - Prepared statements

2. **Frontend**
   - React.memo for components
   - Conditional rendering
   - CSS modules for scoping

3. **Scanning**
   - Async file operations
   - Skip inaccessible files
   - Efficient folder traversal

4. **Caching**
   - Metadata caching
   - Save list caching
   - Folder list caching

---

## Deployment Architecture

```
Source Code
├── TypeScript (src/)
│   ├── Main Process
│   ├── Renderer Process
│   ├── Preload Script
│   └── Backend Services
│
├── Compilation
│   ├── TSC → JavaScript (main)
│   ├── Vite → Bundle (renderer)
│   └── Output → dist/
│
└── Electron App
    ├── Main: dist/main.js
    ├── Renderer: dist/renderer/
    └── Database: ~/.minecraft-tracker/saves.db
```

---

## Future Architecture Considerations

### Cloud Sync Module
```
Local Device          Cloud Server         Other Devices
    ↓                      ↓                     ↓
  Saves          →    SyncQueue       →    Sync Handler
   Metadata           ChangeLog             Update Local
   Changes           Conflict Res            Merge Data
```

### Analytics Module
```
Saves Data → Analytics Engine → Metrics → Dashboard
├── Play time stats
├── World distribution
├── Mod trends
└── Storage analysis
```

---

**Architecture Version:** 1.0
**Last Updated:** March 14, 2026
**Status:** Production Ready ✅
