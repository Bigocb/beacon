# Microsoft OAuth Setup Guide

Your Minecraft Save Tracker now uses Microsoft OAuth for authentication! Follow these steps to get it working.

## Step 1: Register Your App on Azure

1. Go to https://portal.azure.com/
2. Sign in with your Microsoft account
3. Search for "Azure Active Directory" and click it
4. Click "App registrations" in the left sidebar
5. Click "New registration"
6. Fill in:
   - **Name**: "Minecraft Save Tracker" (or any name you prefer)
   - **Supported account types**: "Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts (e.g. Skype, Xbox)"
   - **Redirect URI**:
     - Type: "Web"
     - URI: `http://localhost:3000/auth/callback`
7. Click "Register"

## Step 2: Get Your Credentials

After registering, you'll see your app details:

1. **Find your Client ID**:
   - Look for "Application (client) ID" on the overview page
   - Copy this value

2. **Create a Client Secret**:
   - Click "Certificates & secrets" in the left sidebar
   - Click "New client secret"
   - Set expiration to "24 months" (or your preference)
   - Click "Add"
   - Copy the secret **Value** (not the ID!)

⚠️ **Important**: The secret value is only shown once! Copy it immediately.

## Step 3: Add Credentials to .env

1. Open the `.env` file in your Minecraft Save Tracker desktop folder
2. Replace the placeholder values:
   ```
   MICROSOFT_CLIENT_ID=your-app-id-here
   MICROSOFT_CLIENT_SECRET=your-secret-value-here
   ```
3. Save the file

## Step 4: Test It Out!

1. In your desktop folder, run:
   ```bash
   npm install
   npm run dev
   ```

2. When the app opens, click "Sign in with Microsoft"
3. A login window will open - sign in with your Microsoft account
4. Grant permission when asked
5. The window will close and you'll be logged in!

## How It Works

- When you click "Sign in with Microsoft", a browser window opens
- You sign in with your Microsoft account
- The app securely exchanges the login code for an access token
- Your token is stored locally in `~/.minecraft-tracker/saves.db`
- All your save data stays on your computer - nothing is shared with Microsoft beyond identifying you

## Troubleshooting

**Error: "Invalid client ID"**
- Check that you copied the Client ID correctly in .env
- Make sure there are no extra spaces

**Error: "Invalid redirect URI"**
- Make sure your redirect URI in Azure is exactly: `http://localhost:3000/auth/callback`
- Check for typos and make sure it's registered as "Web" type

**Login window doesn't appear**
- Make sure you're on Windows (this is Windows-only for now)
- Check that no firewall is blocking the app
- Try closing and reopening the app

**"Failed to authenticate"**
- Check your Client Secret is correct in .env
- Make sure your secret hasn't expired (if so, create a new one in Azure)
- Check your internet connection

## Next Steps (Future Features)

Once you have login working:
- The app will scan your Minecraft saves
- You can add notes and track your worlds
- Future: Launch saves directly from the app as a lightweight launcher

Enjoy tracking your Minecraft saves!
