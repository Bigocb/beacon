# Minecraft Save Tracker - Standalone Desktop App

This is a simplified, **completely offline** desktop application for tracking your Minecraft saves.

## ✨ Features

- ✅ **Offline First** - All data stored locally in SQLite
- ✅ **Account Detection** - Auto-detects accounts from Prism Launcher / MultiMC
- ✅ **Save Scanning** - Scans your local Minecraft saves and reads metadata
- ✅ **Local Database** - All saves stored locally, no sync needed
- ✅ **Edit Metadata** - Add notes, tags, and status to each world
- ✅ **Builds to Binary** - Compiles to .exe, .dmg, .AppImage

## 🚀 Quick Start

### 1. Navigate to Desktop App

```bash
cd /tmp/minecraft-tracker/desktop
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run in Development Mode

```bash
npm run dev
```

Electron window opens automatically. You should see:
1. Account selection screen (from Prism Launcher / MultiMC)
2. Click "Continue"
3. Click "Scan Saves"
4. See your Minecraft worlds listed

### 4. Build for Distribution

To create a binary (.exe on Windows, .dmg on Mac, .AppImage on Linux):

```bash
npm run dist
```

Output files will be in `dist/` folder:
- **Windows**: `dist/Minecraft Save Tracker-0.1.0.exe` (installer)
- **Windows**: `dist/Minecraft Save Tracker 0.1.0 portable.exe` (standalone)
- **Mac**: `dist/Minecraft Save Tracker-0.1.0.dmg`
- **Linux**: `dist/Minecraft Save Tracker-0.1.0.AppImage`

## 📁 Data Storage

All your save data is stored locally:

```
~/.minecraft-tracker/
├── saves.db          (SQLite database with all save info)
└── backups/          (future backup storage)
```

On Windows: `C:\Users\<YourName>\.minecraft-tracker\`
On Mac: `/Users/<YourName>/.minecraft-tracker/`
On Linux: `/home/<YourName>/.minecraft-tracker/`

## 🔧 Development

### Project Structure

```
desktop/
├── src/
│   ├── main.ts                 # Electron main process
│   ├── preload.ts              # IPC security bridge
│   ├── renderer/               # React UI
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx   # Account selection
│   │   │   └── DashboardPage.tsx
│   │   └── components/
│   ├── scanner/
│   │   ├── profiles.ts         # Prism/MultiMC detection
│   │   ├── nbt-parser.ts       # Parse level.dat
│   │   ├── index.ts            # Save scanning
│   │   └── ipc.ts              # IPC handlers
│   └── db/sqlite.ts            # SQLite setup
├── public/index.html
├── vite.config.ts
└── package.json
```

### Available Scripts

```bash
npm run dev          # Start dev server + Electron
npm run react-dev    # Just Vite dev server
npm run build        # Build React + TypeScript
npm run dist         # Create distributable binary
npm run pack         # Quick package preview
npm start            # Run built app
```

## 🎮 Usage

1. **Select Account** - Choose your Minecraft account from detected launchers
2. **Scan Saves** - Click "Scan Saves" to find all your worlds
3. **View Worlds** - See worlds with version, difficulty, game mode, last played
4. **Edit** - Click any world to:
   - Add/edit notes
   - Add tags (survival, technical, creative, speedrun, modded, etc.)
   - Change status (active, abandoned, completed)
5. **Switch Account** - Click "Switch Account" to select a different account

## 🐛 Troubleshooting

### Accounts Not Detecting

- Make sure Prism Launcher or MultiMC is installed
- Check account is configured in launcher
- Accounts file is in:
  - **Prism**: `%APPDATA%\PrismLauncher\accounts\`
  - **MultiMC**: `%APPDATA%\.MultiMC\accounts.json`

### Saves Not Showing

- Click "Scan Saves" to discover worlds
- Minecraft must be installed with saves in: `%APPDATA%\.minecraft\saves\`
- Check the app didn't error (no console errors)

### Build Fails

```bash
# Clear cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
npm run dist
```

## 📦 Distribution

Once you've built the binary (`npm run dist`), you can:

1. **Share the .exe/.dmg/.AppImage** file directly with others
2. **Host on GitHub Releases** for easy download
3. **Setup auto-updates** (future enhancement with electron-updater)

The binary is standalone - users just download and run!

## 🚀 Future Features

- Backup creation & management
- World statistics (block count, playtime, etc.)
- Search & filter
- Dark mode
- Screenshot gallery
- Export/import saves

## 📝 Notes

- **No Backend Required** - Everything runs locally
- **No OAuth** - Just select your account from launcher
- **No Internet Needed** - Works completely offline
- **Safe** - No data ever leaves your computer

---

**Ready to build?** Run `npm run dist` and distribute the binary! 🎮
