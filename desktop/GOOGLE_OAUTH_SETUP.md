# Google OAuth Setup Guide

Your Minecraft Save Tracker now uses **Google OAuth** for authentication - no paid subscriptions needed!

## Step 1: Create a Google Cloud Project

1. Go to https://console.cloud.google.com/
2. Sign in with your Google account (create one at https://accounts.google.com if needed)
3. At the top, you'll see a project dropdown - click it
4. Click "NEW PROJECT" button
5. Name it: `Minecraft Save Tracker`
6. Click "CREATE"
7. Wait for it to be created (takes a few seconds)

## Step 2: Enable Google Identity API

1. In the left sidebar, click "APIs & Services"
2. Click "Library" (or search for "OAuth 2.0")
3. Search for "Google+ API" or "People API"
4. Click on it
5. Click "ENABLE"

## Step 3: Create OAuth Credentials

1. Go to "APIs & Services" → "Credentials" (left sidebar)
2. Click "Create Credentials" (blue button at top)
3. Choose "OAuth client ID"
4. If you see a warning, click "Configure consent screen" first:
   - Choose "External" user type
   - Click "Create"
   - Fill in required fields:
     - App name: `Minecraft Save Tracker`
     - User support email: (your email)
     - Developer contact: (your email)
   - Click "Save and Continue"
   - Skip optional scopes
   - Click "Save and Continue"
5. Go back to Credentials → "Create Credentials" → "OAuth client ID"

6. Choose application type: **Desktop application**
7. Name: `Minecraft Save Tracker Desktop`
8. Click "CREATE"

## Step 4: Get Your Credentials

You'll see a popup with your credentials:
- **Client ID** - looks like: `123456789-abc...apps.googleusercontent.com`
- **Client Secret** - a random string

**Copy both values!**

## Step 5: Add Redirect URI

1. Click the "X" to close the popup (or go back to Credentials)
2. Find your created "OAuth 2.0 Client ID" in the list
3. Click the edit button (pencil icon)
4. Under "Authorized redirect URIs", click "ADD URI"
5. Paste: `http://localhost:3000/auth/callback`
6. Click "SAVE"

## Step 6: Add Credentials to Your App

1. Open the `.env` file in your `desktop` folder
2. Replace the placeholder values:
   ```
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```
3. Save the file

## Step 7: Test It!

1. In your desktop folder, run:
   ```bash
   npm install
   npm run dev
   ```

2. When the app opens, click "Sign in with Google"
3. A login window will open
4. Sign in with your Google account
5. Grant permission to the app
6. The window will close and you'll be logged in!

## How It Works

- Click "Sign in with Google" in the app
- A secure login window opens
- You sign in with your Google account
- Google sends back an authentication code
- The app exchanges this code for an access token
- Token is stored locally in `~/.minecraft-tracker/saves.db`
- All your save data stays on your computer - never shared

## Troubleshooting

**Error: "Invalid client ID"**
- Check you copied the entire Client ID correctly
- Make sure there are no extra spaces
- Verify it ends with `.apps.googleusercontent.com`

**Error: "Redirect URI mismatch"**
- Make sure you added `http://localhost:3000/auth/callback` to your OAuth credentials
- Check for typos

**Login window doesn't appear**
- Try closing and reopening the app
- Check your internet connection
- Make sure no firewall is blocking the app

**"Failed to authenticate"**
- Check your Client Secret is correct in `.env`
- Make sure you used the exact value from Google Cloud Console
- Try creating new credentials if they're very old

## Next Steps

Once login is working:
- The app will scan your Minecraft saves
- Add notes and track your worlds
- Future: Launch saves directly from the app

Enjoy tracking your saves! 🎮
