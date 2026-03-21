# Development Notes

## Architecture Overview

### Three-Tier Stack

1. **Backend** (Node.js + Express + PostgreSQL)
   - Handles authentication and authorization
   - Manages save metadata in PostgreSQL
   - Provides REST API for desktop and web
   - Broadcasts sync events via WebSocket

2. **Desktop** (Electron + React + SQLite)
   - Offline-first local database (SQLite)
   - Scans Minecraft saves and parses NBT metadata
   - Queues changes for sync
   - Periodic background sync (every 30 seconds)

3. **Web** (React + Vite)
   - Reads from server database
   - Real-time updates via WebSocket
   - Edit interface for save metadata
   - Dashboard view of all synced saves

---

## Key Implementation Details

### Authentication Flow

```
User → Microsoft OAuth → Backend → JWT Token
                           ↓
                    Stored in localStorage (web)
                    Stored in keytar (desktop)
```

All API requests require JWT token in `Authorization: Bearer <token>` header.

### Sync Strategy

**Desktop → Server Sync:**
1. Desktop queues changes in SQLite `sync_queue` table
2. Every 30 seconds, desktop sends queued changes to `POST /api/sync`
3. Backend applies changes with "Last Write Wins" conflict resolution
4. Desktop clears queue and updates local DB with server state

**Server → Web Sync:**
- Web polls `GET /saves` every 60 seconds (or on demand)
- WebSocket broadcasts `save_updated` event when changes occur
- Web re-fetches saves when notified

**Conflict Resolution:**
- If server has newer version (updated_at), server version wins
- Desktop is notified but change is not lost (logged in sync_log)
- User can manually reconcile in future releases

### Database Schema

**Users:**
```sql
- minecraft_uuid (PK)
- username
- email
- profile_name
- created_at, updated_at
```

**Saves:**
```sql
- id (PK)
- user_uuid (FK)
- world_name
- version, game_mode, difficulty, seed
- spawn coordinates
- notes, custom_tags (JSON)
- status (active/abandoned/completed)
- last_played, created_at, updated_at
- deleted_at (soft delete)
- synced (boolean)
```

**Sync Log:**
```sql
- id (PK)
- user_uuid (FK)
- event_type (sync/conflict/error)
- payload (JSON)
- created_at
```

### NBT Parsing

The `nbt-parser.ts` in desktop app:
- Reads `level.dat` (gzip compressed)
- Extracts: version, gameType, difficulty, seed, spawn coords
- Handles errors gracefully (missing files, parse errors)
- Returns metadata object

**Note:** Current implementation is simplified. Production should use:
```bash
npm install nbt  # Full NBT parser library
```

### IPC (Electron Inter-Process Communication)

Desktop uses `preload.ts` to expose safe APIs:
```javascript
window.api.auth.initiate()
window.api.scanner.scanSaves(uuid)
window.api.sync.perform(uuid, token)
```

Benefits:
- No direct access to main process
- Type-safe from renderer
- Secure credential handling

---

## Development Workflow

### Phase 1: Foundation (Weeks 1-2)
✅ **Completed:**
- Backend auth with Minecraft OAuth
- User CRUD endpoints
- PostgreSQL schema
- Desktop account detection
- Desktop OAuth integration
- Web login flow

### Phase 2: Scanning & Storage (Weeks 3-4)
**TODO:**
- Complete NBT parser (may need `nbt` library)
- Save listing in desktop UI
- SQLite query optimization
- Desktop UI for editing saves

### Phase 3: Sync (Weeks 5-6)
**TODO:**
- Full sync algorithm testing
- Conflict resolution handling
- WebSocket real-time updates
- Desktop background sync

### Phase 4: Polish (Weeks 7-8)
**TODO:**
- Backup creation and management
- Error handling and recovery
- Performance optimization
- E2E testing

---

## Common Tasks

### Add a New API Endpoint

1. Create route in `backend/src/api/`:
```typescript
router.post('/endpoint', authMiddleware, async (req, res) => {
  // Logic here
  res.json(result);
});
```

2. Export in `backend/src/index.ts`:
```typescript
app.use('/route-prefix', routeHandler);
```

3. Create hook in `web/src/hooks/useQuery.ts`:
```typescript
export function useNewData() {
  return useQuery({
    queryKey: ['data'],
    queryFn: () => apiClient.get('/endpoint')
  });
}
```

### Add a Desktop IPC Handler

1. Create handler in `desktop/src/*/ipc.ts`:
```typescript
ipcMain.handle('namespace:action', async (event, ...args) => {
  // Logic here
  return result;
});
```

2. Register in `desktop/src/main.ts`:
```typescript
registerCustomIPC();
```

3. Expose in `desktop/src/preload.ts`:
```typescript
namespace: {
  action: (...args) => ipcRenderer.invoke('namespace:action', ...args)
}
```

4. Use in React component:
```typescript
await window.api.namespace.action(args);
```

---

## Testing Checklist

### Backend API Tests

```bash
# Test auth
curl -X POST http://localhost:3000/auth/oauth/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"..."}'

# Test protected endpoint
curl http://localhost:3000/users/me \
  -H "Authorization: Bearer <token>"

# Test sync
curl -X POST http://localhost:3000/api/sync \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"saves":[...],"deletes":{...}}'
```

### Desktop App Tests

- [ ] OAuth flow works
- [ ] Account detection finds Prism/MultiMC accounts
- [ ] Save scanning finds worlds
- [ ] Notes persist in SQLite
- [ ] Sync queue populates
- [ ] Background sync executes

### Web App Tests

- [ ] Login redirects correctly
- [ ] Saves display after sync
- [ ] Editing notes calls API
- [ ] WebSocket updates real-time
- [ ] Logout clears token

---

## Performance Considerations

### Backend
- **Pagination:** All list endpoints support limit/offset
- **Indexing:** All foreign keys and frequently-queried fields indexed
- **Caching:** Could add Redis for auth token validation

### Desktop
- **Batch Sync:** Queue multiple changes before syncing
- **SQLite:** Use WAL mode for concurrency
- **Memory:** Stream large files instead of loading entirely

### Web
- **React Query:** Auto-caching and stale-while-revalidate
- **Virtualization:** Use virtual lists for 100+ saves
- **Code Splitting:** Lazy load pages with React.lazy()

---

## Security Notes

### Authentication
- ✅ OAuth via Microsoft (secure)
- ✅ JWT tokens with 7-day expiry
- ✅ Tokens stored securely (keytar on desktop, httpOnly cookie on web)
- ⚠️ TODO: Refresh token rotation

### Authorization
- ✅ All endpoints check user_uuid matches
- ✅ Users can only see their own saves
- ⚠️ TODO: Rate limiting on API endpoints
- ⚠️ TODO: CSRF protection

### Data Validation
- ✅ Input validation on backend
- ⚠️ TODO: Type validation with Zod
- ⚠️ TODO: Sanitize user input

---

## Known Limitations (MVP)

1. **No Data Sharing** - Saves are private to user
2. **Simple Conflict Resolution** - Last Write Wins only
3. **No Backup Management** - Backup creation not implemented
4. **Limited NBT Support** - Basic parsing, may need `nbt` library
5. **No Search/Filter** - Client-side filtering only
6. **No Analytics** - No usage tracking

---

## Future Enhancements

### Phase 5: Features
- [ ] Screenshot gallery per save
- [ ] Backup versioning and restore
- [ ] Multi-device sync status
- [ ] Save sharing with friends
- [ ] World statistics and insights

### Phase 6: Polish
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] Offline mode for web
- [ ] Mobile app (React Native)
- [ ] Save import/export

### Phase 7: Scale
- [ ] CDN for static assets
- [ ] Database replication
- [ ] Load balancing
- [ ] Analytics dashboard
- [ ] Admin panel

---

## Deployment Checklist

Before going to production:

- [ ] All tests pass
- [ ] No console errors/warnings
- [ ] JWT_SECRET is strong random string
- [ ] CORS_ORIGIN points to actual domain
- [ ] Database backups configured
- [ ] Error logging setup (Sentry, etc.)
- [ ] HTTPS enforced
- [ ] Rate limiting enabled
- [ ] DDoS protection configured
- [ ] Database encrypted at rest

---

## Useful Links

- **Minecraft OAuth:** https://wiki.vg/Authentication
- **NBT Format:** https://wiki.vg/NBT
- **Prism Launcher:** https://prismlauncher.org/
- **SQLite Best Practices:** https://www.sqlite.org/bestpractice.html
- **PostgreSQL Docs:** https://www.postgresql.org/docs/

---

## Notes from Build

- Monorepo structure uses npm workspaces for easy parallel development
- All three projects use TypeScript for type safety
- Electron preload script ensures security isolation
- WebSocket used for real-time updates (Socket.io optional)
- Database migrations run automatically on backend startup
- OAuth flow requires manual setup with Microsoft account
