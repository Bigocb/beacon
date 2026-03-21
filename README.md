# 🎮 Minecraft Save Tracker

A cross-platform application for tracking and managing your Minecraft saves across all devices.

## Features

- **Desktop App** (Electron): Scan and track local Minecraft saves
- **Web Dashboard** (React): View and manage saves from anywhere
- **Sync**: Automatically sync saves between desktop and web
- **OAuth**: Secure authentication via Microsoft account
- **Offline-First**: Desktop app works offline and syncs when online
- **Backup Management**: Create and manage save backups
- **Metadata Editing**: Add notes, tags, and status to your saves

## Project Structure

```
minecraft-tracker/
├── backend/          # Node.js API (Express + PostgreSQL)
├── desktop/          # Electron + React desktop app
├── web/              # React web dashboard
├── docker-compose.yml # Local dev database setup
└── README.md
```

## Quick Start

### Prerequisites

- Node.js 20+
- Docker & Docker Compose (for local database)
- PostgreSQL 15+ (or use docker-compose)

### 1. Start Local Database

```bash
docker-compose up -d
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run migrate  # Run database migrations
npm run dev
```

Backend runs on: `http://localhost:3000`

### 3. Desktop App Setup

```bash
cd desktop
npm install
npm run dev
```

Electron app will launch on development mode

### 4. Web App Setup

```bash
cd web
npm install
npm run dev
```

Web app runs on: `http://localhost:5173`

## Environment Setup

### Backend `.env`

```env
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=minecraft_tracker
DB_USER=postgres
DB_PASSWORD=postgres

# Minecraft OAuth (register at https://account.live.com/developers/applications)
MINECRAFT_CLIENT_ID=your-client-id
MINECRAFT_CLIENT_SECRET=your-client-secret
REDIRECT_URI=http://localhost:8080/oauth/callback

# JWT
JWT_SECRET=your-random-secret-key

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Web `.env`

```env
VITE_API_URL=http://localhost:3000
```

## Architecture

### Backend API

- **Authentication**: Minecraft OAuth via Microsoft
- **Database**: PostgreSQL for persistent data
- **Real-time**: WebSocket for live sync updates
- **Routes**:
  - `POST /auth/oauth/callback` - OAuth callback
  - `GET /users/me` - User profile
  - `GET /saves` - List user's saves
  - `PATCH /saves/:id` - Update save metadata
  - `POST /api/sync` - Sync saves from desktop

### Desktop App

- **Local Database**: SQLite for offline-first storage
- **Token Storage**: Keytar for secure credential storage
- **Sync Engine**: Periodic background sync with conflict resolution
- **Features**:
  - Account detection (Prism Launcher, MultiMC)
  - Minecraft save scanning
  - NBT parsing for metadata extraction
  - Offline queue with retry

### Web App

- **Real-time Updates**: Socket.io for live sync
- **React Query**: For efficient data fetching and caching
- **Features**:
  - Dashboard with save list
  - Edit notes and tags
  - View save metadata
  - Filter and search

## Development

### Database Migrations

Migrations run automatically on backend startup. To manually run:

```bash
cd backend
npm run migrate
```

### Building for Production

**Backend:**
```bash
cd backend
npm run build
docker build -t minecraft-tracker-backend .
```

**Desktop:**
```bash
cd desktop
npm run dist  # Creates installers
```

**Web:**
```bash
cd web
npm run build  # Creates optimized static files
```

## Testing

### Manual Testing Checklist

- [ ] Desktop: Login with Microsoft account
- [ ] Desktop: Scan Minecraft saves
- [ ] Desktop: Edit save notes and tags
- [ ] Desktop: Sync to server
- [ ] Web: Login and view saves
- [ ] Web: See synced saves from desktop
- [ ] Web: Edit notes (updates on desktop)
- [ ] Offline: Edit on desktop while offline
- [ ] Back Online: Changes sync automatically

## Troubleshooting

### Database connection refused

```bash
docker-compose ps  # Check if PostgreSQL is running
docker-compose logs postgres  # View logs
```

### OAuth fails

- Check `MINECRAFT_CLIENT_ID` and `MINECRAFT_CLIENT_SECRET` are correct
- Ensure `REDIRECT_URI` matches your OAuth app settings

### Sync not working

- Check network connectivity
- Check backend logs for errors
- Verify JWT token is valid

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | Node.js + Express + TypeScript |
| Backend DB | PostgreSQL 15 |
| Desktop | Electron 27 + React 18 |
| Desktop DB | SQLite + better-sqlite3 |
| Web | React 18 + Vite |
| Real-time | Socket.io |
| Auth | JWT + Minecraft OAuth |

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT

---

**Built with ❤️ for Minecraft players**
