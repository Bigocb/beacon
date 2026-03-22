# Beacon Architecture Documentation

> Last Updated: 2026-03-21
> Status: Phase 1 - Core Auth API-Driven Refactoring

---

## Frontend Architecture (Desktop Electron)

```
┌─────────────────────────────────────────────────────────────┐
│                    Beacon Desktop App                        │
│                    (Electron + React)                        │
│                                                              │
│  ┌──────────────────┐          ┌──────────────────┐         │
│  │   Main Process   │◄────IPC──┤  Renderer (React)│         │
│  │   (Node.js)      │          │   Pages/Comps    │         │
│  │                  │          │                  │         │
│  │ • OAuth.ts       │          │ • LoginPage      │         │
│  │ • Scanner.ts     │          │ • DashboardPage  │         │
│  │ • Sync.ts        │          │ • SaveAnalyticsP │         │
│  │ • Main.ts        │          │ • etc            │         │
│  └────────┬─────────┘          └────────┬─────────┘         │
│           │                             │                   │
│           │                    ┌─────────▼──────┐            │
│           │                    │ LocalStorage   │            │
│           │                    │ - JWT Token    │            │
│           │                    │ - User Data    │            │
│           │                    └────────────────┘            │
└────────────┼─────────────────────────────────────────────────┘
             │
             │ HTTP (AXIOS)
             ▼
    ┌────────────────────┐
    │  Backend API       │
    │  (Express.js)      │
    │  :3000             │
    └────────────────────┘
```

### Key Components:

**Main Process (Node.js):**
- `oauth.ts` - Handles Minecraft OAuth flow, local user auth
- `scanner.ts` - Fetches saves and instance metadata via API
- `sync.ts` - Manages sync queue via API
- `main.ts` - IPC handlers and Electron lifecycle

**Renderer (React):**
- Components call `window.api.*` (IPC bridge)
- IPC handlers in main process make API calls
- All data flows through backend API

**LocalStorage:**
- JWT token for authentication
- User session data
- Preferences

---

## Backend Architecture (API)

```
┌──────────────────────────────────────────────────────┐
│            Backend API (Express.js)                  │
│                    :3000                             │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │          API Routes                         │    │
│  │                                             │    │
│  │  ┌──────────────┐ ┌──────────────┐          │    │
│  │  │ /auth        │ │ /users       │          │    │
│  │  │ • oauth/cb   │ │ • GET /me    │          │    │
│  │  │ • local      │ │ • PATCH /me  │          │    │
│  │  │ • accounts   │ │ • DELETE /me │          │    │
│  │  │ • verify     │ │ • preferences│          │    │
│  │  └──────────────┘ └──────────────┘          │    │
│  │                                             │    │
│  │  ┌──────────────┐ ┌──────────────┐          │    │
│  │  │ /saves       │ │ /favorites   │          │    │
│  │  │ • GET (all)  │ │ • GET        │          │    │
│  │  │ • GET (one)  │ │ • POST       │          │    │
│  │  │ • PATCH      │ │ • DELETE     │          │    │
│  │  └──────────────┘ └──────────────┘          │    │
│  │                                             │    │
│  │  ┌──────────────┐ ┌──────────────┐          │    │
│  │  │ /sync        │ │ /notes       │          │    │
│  │  │ • POST queue │ │ • CRUD ops   │          │    │
│  │  │ • GET status │ │              │          │    │
│  │  └──────────────┘ └──────────────┘          │    │
│  └─────────────────────────────────────────────┘    │
│                      ▲                              │
│         ┌────────────┼────────────┐                │
│         │            │            │                │
│  ┌──────▼──┐  ┌──────▼──┐  ┌─────▼──────┐         │
│  │ Auth    │  │ Sync    │  │ Enrichment │         │
│  │ Helpers │  │ Logic   │  │ Engines    │         │
│  └─────────┘  └─────────┘  └────────────┘         │
│         │            │            │                │
│         └────────────┼────────────┘                │
│                      ▼                              │
│              ┌────────────────┐                    │
│              │   SQLite DB    │                    │
│              │  beacon.db     │                    │
│              └────────────────┘                    │
└──────────────────────────────────────────────────────┘
```

### Database Schema (SQLite):

```sql
-- Core Tables
users (minecraft_uuid, username, email, profile_name, avatar_url, theme_preference, last_login)
saves (id, user_uuid, world_name, folder_id, version, game_mode, ...)
save_folders (id, user_uuid, folder_path, display_name)
instance_metadata (folder_id, mod_loader, game_version, mod_count, ...)
favorites (id, instance_folder_id)

-- Sync & Backup
sync_queue (id, save_id, operation, data)
backups (id, save_id, version, file_path, size_mb)

-- Enrichment
notes (id, save_id, title, content, timestamp)
tags (id, name, color)
note_tags (note_id, tag_id)
```

---

## Integration Diagram: FE ↔ BE Flow

### Authentication Flow (Local User)

```
Desktop App              Backend API           Database
┌──────────────┐        ┌──────────────┐      ┌──────────┐
│              │        │              │      │          │
│ User enters  │        │              │      │          │
│ username     │        │              │      │          │
└──────┬───────┘        │              │      │          │
       │                │              │      │          │
       │ IPC: auth:     │              │      │          │
       │ createLocalUser│              │      │          │
       ├───────────────►│              │      │          │
       │                │              │      │          │
       │                │ POST /auth/local   │          │
       │                ├─────────────────►  │          │
       │                │                    │          │
       │                │   Check if exists  │          │
       │                │   (SELECT by uuid) │◄─────────┤
       │                │◄─────────────────┐ │          │
       │                │                  │ │          │
       │                │   If new: INSERT │ │          │
       │                ├────────────────►│ │          │
       │                │◄────────────────┼─┤          │
       │                │                  │ │          │
       │                │ Generate JWT &   │ │          │
       │                │ return {token,   │ │          │
       │                │  user}           │ │          │
       │◄───────────────┤                  │ │          │
       │                │                  │ │          │
       │ Store token in │                  │ │          │
       │ localStorage   │                  │ │          │
       └────────────────┘                  └──────────────┘

Result: JWT stored locally, used in Authorization header
```

### Data Fetch Flow (Get Saves)

```
Desktop App              Backend API           Database
┌──────────────┐        ┌──────────────┐      ┌──────────┐
│              │        │              │      │          │
│ User clicks  │        │              │      │          │
│ Dashboard    │        │              │      │          │
└──────┬───────┘        │              │      │          │
       │                │              │      │          │
       │ IPC: scanner:  │              │      │          │
       │ getSaves       │              │      │          │
       │ (uuid, token)  │              │      │          │
       ├───────────────►│              │      │          │
       │                │              │      │          │
       │                │ GET /saves   │      │          │
       │                │ (Bearer token)      │          │
       │                ├─────────────────►  │          │
       │                │                    │          │
       │                │ authMiddleware     │          │
       │                │ validates JWT      │          │
       │                │                    │          │
       │                │ Query saves for    │          │
       │                │ user_uuid          │├─────────┤
       │                │◄───────────────────┤          │
       │                │  [saves...]        │          │
       │                │                    │          │
       │                │ Return JSON        │          │
       │◄───────────────┤                    │          │
       │                │                    │          │
       │ Process &      │                    │          │
       │ render in      │                    │          │
       │ React          │                    │          │
       └────────────────┘                    └──────────────┘

Result: Data flows from DB → API → FE via HTTP
```

---

## Current State (Phase 1)

### ✅ Completed:
- Backend: 3 new auth endpoints (`/auth/local`, `/auth/accounts`, `/auth/verify`)
- Frontend: `oauth.ts` refactored for `getLocalAccounts` and `createLocalUser` to call API
- Minecraft OAuth flow already calling backend API

### 🔄 In Progress:
- Remove all SQLite dependencies from Electron main process
- Ensure all IPC handlers call backend API

### ⏳ Pending:
- **SCANNER/DATA:** Refactor `scanner.ts` to use API for all data fetching
- **DATABASE/STORAGE:** Remove SQLite from main process entirely
- **SYNC/QUEUE:** Move sync logic to backend
- **FRONTEND PAGES:** Ensure all components call APIs through IPC
- **TESTS:** Add test suite for API endpoints and IPC handlers

---

## API Endpoints Reference

### Auth Endpoints
```
POST   /auth/oauth/callback    - Exchange Minecraft OAuth code for JWT
POST   /auth/local             - Create/retrieve local user account
GET    /auth/accounts          - List all local accounts
POST   /auth/verify            - Verify token validity
```

### User Endpoints
```
GET    /users/me               - Get current user profile
PATCH  /users/me               - Update user profile (email, avatar_url, profile_name)
PATCH  /users/me/preferences   - Update user preferences (theme_preference)
DELETE /users/me               - Delete user account
GET    /users/player-name/:uuid - Get Minecraft username from UUID
```

### Saves Endpoints
```
GET    /saves                  - Get all saves for user
GET    /saves/:id              - Get single save
PATCH  /saves/:id              - Update save metadata
```

### Other Endpoints
```
GET    /favorites              - Get favorited saves
POST   /favorites              - Add favorite
DELETE /favorites/:id          - Remove favorite
POST   /api/sync               - Queue sync operation
GET    /notes                  - Get notes
...more endpoints...
```

---

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=3000
JWT_SECRET=your-secret-key-change-in-production
MINECRAFT_CLIENT_ID=xxxx
MINECRAFT_CLIENT_SECRET=xxxx
REDIRECT_URI=http://localhost:8080/minecraft/auth/callback
```

### Desktop (.env)
```
MINECRAFT_CLIENT_ID=xxxx
MINECRAFT_CLIENT_SECRET=xxxx
```

---

## Next Steps

### Phase 2: Scanner Refactoring
- Update `desktop/src/scanner/ipc.ts` to use `/saves` API
- Remove all `queries` references
- Cache saves in React state instead of local DB

### Phase 3: Sync System
- Move sync queue to backend
- Implement sync status API endpoint
- Remove local sync database

### Phase 4: Frontend Integration
- Ensure all pages use API through IPC
- Remove localStorage for data (keep JWT token only)
- Add proper error handling and loading states

### Phase 5: Testing & Optimization
- Write test suite for all endpoints
- Add integration tests for FE↔BE flow
- Aim for 90% coverage
- Performance profiling and optimization
