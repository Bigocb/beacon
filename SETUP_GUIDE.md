# Minecraft Save Tracker - Setup Guide

## 🚀 Quick Start

### Step 1: Clone & Install Dependencies

```bash
cd minecraft-tracker
npm install
```

### Step 2: Start PostgreSQL Database

```bash
docker-compose up -d
```

Wait for PostgreSQL to be ready (check with `docker-compose logs`):
```bash
docker-compose logs postgres | grep "database system is ready"
```

### Step 3: Setup Backend

```bash
cd backend

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Run database migrations
npm run migrate

# Start backend server
npm run dev
```

Backend should be running on: **http://localhost:3000**

### Step 4: Setup Desktop App

In a new terminal:

```bash
cd desktop

# Install dependencies
npm install

# Start development server
npm run dev
```

Electron app will open automatically.

### Step 5: Setup Web App

In another new terminal:

```bash
cd web

# Copy environment file
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

Web dashboard available at: **http://localhost:5173**

---

## 🔐 OAuth Setup

### Get Minecraft OAuth Credentials

1. Visit: https://account.live.com/developers/applications
2. Create a new application
3. Add redirect URI: `http://localhost:8080/oauth/callback`
4. Copy `Client ID` and `Client Secret`

### Update Environment Files

**backend/.env:**
```env
MINECRAFT_CLIENT_ID=your-client-id-here
MINECRAFT_CLIENT_SECRET=your-client-secret-here
```

---

## 📊 Database Schema

All migrations run automatically on first backend startup. Tables created:

- `users` - User accounts
- `saves` - Minecraft save metadata
- `sync_log` - Sync operation logs
- `screenshots` - Save screenshots
- `backups` - Save backups

---

## 🧪 Testing the Flow

### 1. Desktop App Test

- [ ] Click "Sign in with Microsoft"
- [ ] Complete OAuth flow
- [ ] See detected Minecraft accounts
- [ ] Click "Scan Saves"
- [ ] Should see your local Minecraft worlds
- [ ] Click a world to edit notes/tags
- [ ] Click "Sync Now"

### 2. Web App Test

- [ ] Go to http://localhost:5173/login
- [ ] Click "Sign in with Microsoft"
- [ ] Should redirect to dashboard
- [ ] Check that saves synced from desktop appear
- [ ] Click a world and edit notes
- [ ] Check that desktop app reflects the changes

### 3. Real-time Sync Test

- [ ] Have desktop and web open side-by-side
- [ ] Edit a save on desktop
- [ ] Watch web app update in real-time (via WebSocket)
- [ ] Edit a save on web
- [ ] Check desktop refreshes (polling every 30s)

---

## 🛠️ Development Commands

### Backend
```bash
npm run dev       # Start with nodemon
npm run build     # Compile TypeScript
npm run migrate   # Run migrations
```

### Desktop
```bash
npm run dev       # Start dev server + electron
npm run build     # Build distribution
npm run pack      # Create installer
```

### Web
```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run preview   # Preview production build
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Backend (3000)
lsof -i :3000
kill -9 <PID>

# Web (5173)
lsof -i :5173
kill -9 <PID>
```

### Database Connection Error

```bash
# Check Docker
docker-compose ps

# View logs
docker-compose logs postgres

# Restart
docker-compose restart postgres
```

### OAuth Fails

- [ ] Verify `MINECRAFT_CLIENT_ID` matches
- [ ] Verify `MINECRAFT_CLIENT_SECRET` matches
- [ ] Check redirect URI is `http://localhost:8080/oauth/callback`
- [ ] Clear browser cookies for login.live.com

### Sync Not Working

- [ ] Check backend is running (`http://localhost:3000/health`)
- [ ] Check network tab in browser DevTools
- [ ] Check backend logs for errors
- [ ] Verify JWT token in localStorage

### Minecraft Saves Not Showing

- [ ] Ensure Prism Launcher or MultiMC is installed
- [ ] Check `.minecraft` folder exists in home directory
- [ ] Desktop app must scan before any saves appear
- [ ] Check desktop app logs for NBT parsing errors

---

## 📦 File Structure

```
minecraft-tracker/
├── backend/
│   ├── src/
│   │   ├── auth/oauth.ts         # OAuth logic
│   │   ├── api/                  # Express routes
│   │   ├── db/                   # Database
│   │   └── middleware/           # Auth middleware
│   ├── migrations/               # SQL migrations
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── desktop/
│   ├── src/
│   │   ├── main.ts              # Electron main
│   │   ├── preload.ts           # IPC bridge
│   │   ├── renderer/            # React components
│   │   ├── auth/                # OAuth
│   │   ├── scanner/             # Save scanning
│   │   ├── sync/                # Sync engine
│   │   └── db/sqlite.ts         # SQLite setup
│   ├── public/index.html
│   ├── vite.config.ts
│   └── package.json
├── web/
│   ├── src/
│   │   ├── main.tsx            # React entry
│   │   ├── pages/              # Pages
│   │   ├── components/         # Reusable components
│   │   ├── hooks/              # React Query hooks
│   │   ├── api/client.ts       # API client
│   │   └── styles/             # CSS
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── docker-compose.yml          # PostgreSQL + Redis
├── package.json               # Monorepo root
└── README.md
```

---

## 🚢 Deployment

### Build All Projects

```bash
# Backend
cd backend && npm run build && docker build -t minecraft-tracker-backend .

# Desktop
cd desktop && npm run dist

# Web
cd web && npm run build
```

### Deploy Backend

```bash
# Docker to Railway, Fly.io, or Cloud Run
docker push minecraft-tracker-backend:latest
```

### Deploy Web

```bash
# Static files to Vercel, Netlify, or S3
cd web && npm run build
# Deploy dist/ folder
```

---

## 📝 Next Steps

After successful setup:

1. **Test the flow** - Follow "Testing the Flow" section above
2. **Implement backups** - Add ZIP backup creation in Week 7-8
3. **Add tests** - Jest for backend, E2E for desktop/web
4. **Polish UI** - Refine styling and UX
5. **Deploy** - Follow deployment section

---

## 💬 Support

### Common Issues

- **OAuth redirects wrong** → Check REDIRECT_URI in env
- **Database won't connect** → Run `docker-compose up -d` and wait 10s
- **Saves not syncing** → Check WebSocket connection in browser DevTools
- **NBT parsing fails** → May need to handle additional Minecraft versions

### Logs to Check

```bash
# Backend errors
npm run dev  # Watch for errors

# Desktop errors
# Check DevTools (F12 when Electron window open)

# Web errors
# Browser DevTools Console (F12)

# Database errors
docker-compose logs postgres
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] PostgreSQL running: `docker-compose ps`
- [ ] Backend health: `curl http://localhost:3000/health`
- [ ] Backend responds: `curl http://localhost:3000/users/me` (should fail with 401)
- [ ] Database migrated: Check in DB with `psql`
- [ ] Desktop app launches
- [ ] Web app loads
- [ ] OAuth flow works
- [ ] Saves sync properly

**All green? 🎉 Ready to develop!**
