# 🚀 Quick Start Guide

## Prerequisites
- Node.js 16+ and npm
- Your Minecraft instances folder
- ~5 minutes of your time

## 1️⃣ Install Dependencies
```bash
npm install
```

## 2️⃣ Start Development Server
```bash
npm run dev
```

This will:
- Start the React dev server on port 5174
- Build and launch the Electron app
- Open the app window

## 3️⃣ Create Your First User

### Option A: Local User (Recommended) 🏠
1. Click **"Create Local User"** button
2. Enter username: `YourUsername`
3. Click **"Create"**
4. ✅ You're now logged in!

### Option B: Google OAuth (Optional) 🔐
1. Click **"Sign in with Google"**
2. Authenticate with your Google account
3. ✅ You're now logged in!

## 4️⃣ Add Your First Save Folder

1. Click **"+"** or **"Add Folder"** button
2. Navigate to your Minecraft instance:
   ```
   C:\Users\[username]\curseforge\minecraft\Instances\[InstanceName]
   ```
   or
   ```
   C:\Users\[username]\AppData\Roaming\.minecraft\saves
   ```
3. Click **"Select Folder"**
4. Folder will appear in the list
5. Click **"Scan"** to detect saves and metadata

## 5️⃣ View Your Instance

The dashboard will show:
```
┌─────────────────────────────────┐
│ 🎮 CurseForge Instance          │
│ Fabric | 47 Mods | 5 Saves      │
│ Together - 21.11                │
│ 12.45 GB                        │
└─────────────────────────────────┘
```

**Click the card** to see:
- Instance metadata in info boxes
- All saves in this instance
- Detailed information (mod loader, launcher, sizes, etc.)

## 6️⃣ Verify Persistence

1. **Close the app** completely
2. **Run it again**: `npm run dev`
3. **Check if:**
   - ✅ You're still logged in (no login screen)
   - ✅ Your saves are still there
   - ✅ All metadata is intact

## 📁 Add Multiple Folders

Repeat steps 4-5 for each Minecraft installation:

### CurseForge
```
C:\Users\bigoc\curseforge\minecraft\Instances\[InstanceName]\saves\
```

### MultiMC / Prism Launcher
```
C:\Users\bigoc\Desktop\instances\[InstanceName]\.minecraft\saves\
```

### Direct Minecraft (Vanilla)
```
C:\Users\bigoc\AppData\Roaming\.minecraft\saves\
```

### ATLauncher
```
C:\Users\bigoc\AppData\Roaming\ATLauncher\instances\[InstanceName]\saves\
```

## 🎮 Dashboard Features

### Cards View (Default)
- See all instances as cards
- Shows launcher icon, mods count, saves count
- Click to see details
- Search and filter

### List View (Alternative)
- See instances in a list
- More compact view
- Same info, different layout

### Toggle View
Click the **view toggle** button (top right) to switch between cards and list view.

## 🔍 What Gets Detected

When you scan a folder, the app automatically detects:

| Item | Detection Method |
|------|------------------|
| **Launcher** | manifest.json, instance.cfg, mmc-pack.json |
| **Mod Loader** | fabric.json, forge files, quilt.json |
| **Mod Count** | Counts .jar files in /mods folder |
| **Folder Size** | Recursively calculates all folder contents |
| **Instance Icon** | Looks for instance.png, icon.png |
| **Game Version** | Reads from version files |

## ⚙️ Settings & Management

### Manage Folders
1. Click **"Manage Folders"** button
2. See all added folders
3. Click **"Scan"** to refresh
4. Click **"×"** to remove a folder

### Logout
1. Click **user menu** (top right)
2. Click **"Logout"**
3. You'll be returned to login screen
4. ⚠️ Local data is not deleted, just logged out

### Delete Local User (Optional)
⚠️ **Warning:** This cannot be undone!
1. Click **user menu** (top right)
2. Click **"Delete User"**
3. Confirm deletion
4. All local data will be removed

## 🐛 Troubleshooting

### "No saves found"
- Make sure the folder path is correct
- Check that saves exist in that location
- Verify folder permissions

### "Can't scan folder"
- Make sure the path exists
- Check folder permissions
- Try a different folder

### "App crashes on startup"
- Delete `~/.minecraft-tracker/saves.db`
- Run `npm install` again
- Try `npm run dev` again

### "Still logged in but no saves?"
- Click "Scan" on your folder
- Wait for scan to complete
- Refresh the app (close and reopen)

## 💾 Database Location

Your data is stored at:
```
C:\Users\[YourUsername]\.minecraft-tracker\saves.db
```

This is a SQLite database that persists:
- User accounts
- Save data
- Folder paths
- Instance metadata
- Backups

You can safely back this up or copy it to another computer.

## 🎯 What's Next?

1. ✅ Add all your Minecraft instance folders
2. ✅ Let the app scan and detect metadata
3. ✅ Click instances to see detailed info
4. ✅ Organize and tag your saves
5. ✅ (Future) Enable cloud sync for multi-device

## 📞 Support

If you encounter issues:
1. Check the console: `F12` in the app
2. Check `~/.minecraft-tracker/` folder
3. Try deleting the database and restarting

## ✨ Enjoy!

Your Minecraft saves are now organized, tracked, and safe! 🎮

---

**Pro Tips:**
- 💡 Use tags to organize saves by theme/content
- 💡 Set backup intervals for automatic backups
- 💡 Use search to quickly find saves
- 💡 Check folder sizes to identify space hogs
- 💡 Monitor playtime to track your gaming

Happy gaming! 🎮
