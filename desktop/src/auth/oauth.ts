import { ipcMain, BrowserWindow } from 'electron';
import db, { queries } from '../db/sqlite';
import axios from 'axios';
import http from 'http';
import url from 'url';

// Minecraft OAuth configuration
const MINECRAFT_REDIRECT_URI = 'http://localhost:8080/minecraft/auth/callback';
const OAUTH_PORT = 8080;
const BACKEND_API_URL = 'http://localhost:3000';

// Minecraft OAuth client credentials
function getMinecraftClientId(): string {
  return process.env.MINECRAFT_CLIENT_ID || 'your-client-id-here';
}

function getMinecraftClientSecret(): string {
  return process.env.MINECRAFT_CLIENT_SECRET || 'your-client-secret-here';
}

// In-memory storage for current auth session and oauth window
let currentAuthSession: any = null;
let oauthWindow: BrowserWindow | null = null;
let httpServer: http.Server | null = null;
let pendingAuthCode: string | null = null;

console.log('🔐 Minecraft OAuth Module Loaded');
console.log('Minecraft Client ID:', getMinecraftClientId() ? getMinecraftClientId().substring(0, 20) + '...' : 'NOT SET');
console.log('Minecraft Client Secret:', getMinecraftClientSecret() ? '***SET***' : 'NOT SET');

// Note: Token management functions have been moved to renderer/auth/tokenStorage.ts
// to avoid bundling Node.js code with the browser renderer

// Start local HTTP server to handle OAuth callback
function startOAuthServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (httpServer) {
      console.log('✓ OAuth server already running');
      resolve();
      return;
    }

    httpServer = http.createServer((req, res) => {
      console.log('📨 Incoming request:', req.url);
      const parsedUrl = url.parse(req.url || '', true);

      if (parsedUrl.pathname === '/minecraft/auth/callback') {
        const code = parsedUrl.query.code as string;
        const error = parsedUrl.query.error as string;
        const errorDescription = parsedUrl.query.error_description as string;

        console.log('Minecraft OAuth callback details:');
        console.log('  - Code received:', code ? 'YES ✓' : 'NO ✗');
        console.log('  - Error:', error || 'NONE ✓');

        if (error) {
          console.error('❌ OAuth Error:', error, errorDescription);
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<h1>Authentication Error</h1><p>${error}</p><p>${errorDescription}</p><p>You can close this window.</p>`);
          return;
        }

        if (code) {
          console.log('✓ Auth code received and stored');
          pendingAuthCode = code;
          // Send success page
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head>
                <title>Minecraft Authentication Successful</title>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #1a1a1a; }
                  .container { background: #2d2d2d; padding: 40px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.5); text-align: center; max-width: 400px; }
                  h1 { color: #4CAF50; margin: 0 0 10px 0; }
                  p { color: #aaa; margin: 10px 0; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>🎮 Authentication Successful!</h1>
                  <p>You can now close this window and return to the app.</p>
                </div>
              </body>
            </html>
          `);

          // Close the OAuth window after a short delay
          setTimeout(() => {
            if (oauthWindow && !oauthWindow.isDestroyed()) {
              oauthWindow.close();
            }
          }, 1000);
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>Not Found</h1>');
      }
    });

    httpServer.listen(OAUTH_PORT, 'localhost', () => {
      console.log(`✓ Minecraft OAuth callback server listening on ${MINECRAFT_REDIRECT_URI}`);
      resolve();
    });

    httpServer.on('error', (err) => {
      console.error('❌ OAuth server error:', err);
      reject(err);
    });
  });
}

function stopOAuthServer(): void {
  if (httpServer) {
    httpServer.close(() => {
      console.log('OAuth callback server stopped');
      httpServer = null;
    });
  }
}

// Restore auth session from database on app startup
export function restoreAuthFromDatabase() {
  try {
    // Query the auth table for the most recent auth record
    const authRecords = db.prepare('SELECT * FROM auth ORDER BY updated_at DESC LIMIT 1').all();

    if (authRecords && authRecords.length > 0) {
      const authRecord = authRecords[0];
      console.log('🔄 Restoring auth session from database:', authRecord.username);

      // Restore to in-memory session
      currentAuthSession = {
        userId: authRecord.id,
        uuid: authRecord.user_uuid,
        username: authRecord.username,
        email: authRecord.username, // We don't store email separately, use username as fallback
        accessToken: authRecord.token,
        refreshToken: null, // We don't persist refresh token currently
        expiresAt: new Date(authRecord.token_expires_at),
      };

      console.log('✓ Auth session restored successfully for user:', authRecord.username);
      return true;
    } else {
      console.log('ℹ No existing auth session found in database');
      return false;
    }
  } catch (error: any) {
    console.error('Error restoring auth from database:', error.message);
    return false;
  }
}

export function registerIPC() {
  // Initiate Minecraft OAuth login
  ipcMain.handle('auth:initiateLogin', async (event) => {
    try {
      const clientId = getMinecraftClientId();
      console.log('\n🎮 === STARTING MINECRAFT OAUTH FLOW ===');
      console.log('Client ID:', clientId.substring(0, 30) + '...');
      console.log('Redirect URI:', MINECRAFT_REDIRECT_URI);

      // Start the local callback server
      await startOAuthServer();

      // Build OAuth URL for Microsoft/Minecraft
      const authUrl = new URL('https://login.live.com/oauth20_authorize.srf');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', MINECRAFT_REDIRECT_URI);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', 'XboxLive.signin');

      console.log('📱 Opening Minecraft OAuth login window...');

      // Create new window for OAuth
      oauthWindow = new BrowserWindow({
        width: 600,
        height: 700,
        show: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Set a proper User-Agent
      oauthWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

      console.log('Loading Minecraft OAuth URL:', authUrl.toString().substring(0, 80) + '...');
      oauthWindow.loadURL(authUrl.toString());

      // Handle window closed
      oauthWindow.on('closed', () => {
        console.log('👤 Minecraft OAuth window closed');
        oauthWindow = null;
        if (pendingAuthCode) {
          // Code was captured, let the callback handler deal with it
          console.log('📬 Sending auth code to renderer...');
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow) {
            mainWindow.webContents.send('auth:oauth-callback', { code: pendingAuthCode });
          }
          pendingAuthCode = null;
        }
      });

      return { success: true, message: 'Opening Minecraft login...' };
    } catch (error: any) {
      stopOAuthServer();
      console.error('❌ Minecraft OAuth initiation error:', error);
      return { success: false, error: error.message };
    }
  });

  // Handle Minecraft OAuth callback from the redirect
  ipcMain.handle('auth:handleCallback', async (event, code: string) => {
    try {
      console.log('\n🎮 === EXCHANGING MINECRAFT CODE FOR JWT ===');
      console.log('Code:', code.substring(0, 20) + '...');

      // Exchange code for JWT with backend API
      console.log('📤 Sending authorization code to backend...');
      const tokenResponse = await axios.post(
        `${BACKEND_API_URL}/auth/oauth/callback`,
        { code },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('✓ JWT response received from backend');
      const { token, user } = tokenResponse.data;
      console.log('✓ User info:', { uuid: user.uuid, username: user.username });

      // Token will be stored in localStorage by the renderer
      // Store in SQLite for offline/fallback use
      const userId = `minecraft-${user.uuid}`;
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days (JWT expiry from backend)

      console.log('💾 Storing auth session in SQLite database...');
      // Use explicit update logic to avoid CASCADE DELETE on REPLACE
      try {
        const existingRecord = db.prepare('SELECT * FROM auth WHERE id = ?').get(userId);
        if (existingRecord) {
          console.log(`📝 Updating existing auth entry for ${userId}`);
          db.prepare(`
            UPDATE auth SET
              username = ?,
              token = ?,
              token_expires_at = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(user.username, token, expiresAt.toISOString(), userId);
        } else {
          console.log(`➕ Inserting new auth entry for ${userId}`);
          db.prepare(`
            INSERT INTO auth (id, user_uuid, username, token, token_expires_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(userId, user.uuid, user.username, token, expiresAt.toISOString());
        }
      } catch (dbError: any) {
        console.error('❌ Database error saving auth:', dbError.message);
        throw dbError;
      }

      // Store in memory for quick access
      currentAuthSession = {
        userId,
        uuid: user.uuid,
        username: user.username,
        email: user.email || null,
        accessToken: token,
        refreshToken: null,
        expiresAt,
      };

      console.log('🎮🎮🎮 Minecraft Authentication successful! 🎮🎮🎮');
      stopOAuthServer();

      return {
        success: true,
        token,  // ✅ Return token so renderer can store it
        user: {
          uuid: user.uuid,
          username: user.username,
          email: user.email,
          id: userId,
        },
      };
    } catch (error: any) {
      console.error('❌ Minecraft OAuth callback error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message,
      };
    }
  });

  // Get current authenticated user
  ipcMain.handle('auth:getCurrentUser', async () => {
    try {
      if (currentAuthSession) {
        return {
          success: true,
          user: {
            uuid: currentAuthSession.uuid,
            username: currentAuthSession.username,
            email: currentAuthSession.email,
            id: currentAuthSession.userId,
          },
        };
      }

      // If not in memory, return null (user needs to login)
      return { success: true, user: null };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Get all existing local accounts from backend API
  ipcMain.handle('auth:getLocalAccounts', async () => {
    try {
      console.log('📋 [Auth] Fetching local accounts from backend API');

      const response = await axios.get(`${BACKEND_API_URL}/auth/accounts`);
      const usernames = response.data.accounts || [];

      console.log('✓ Found', usernames.length, 'local account(s):', usernames);

      return {
        success: true,
        accounts: usernames,
      };
    } catch (error: any) {
      console.error('❌ Error fetching local accounts:', error.response?.data || error.message);
      return { success: false, error: error.message, accounts: [] };
    }
  });

  // Create or login to a local single-user account via backend API (no OAuth required)
  ipcMain.handle('auth:createLocalUser', async (event, username: string) => {
    try {
      console.log('📝 [Auth] Creating/logging in local user:', username);

      // Call backend API to create or retrieve local user
      const response = await axios.post(
        `${BACKEND_API_URL}/auth/local`,
        { username },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { token, user } = response.data;
      const isNewAccount = user.isNew || false;

      console.log(isNewAccount ? '✓ Local user account created:' : '✓ Local user logged in:', username);

      // Store in memory for quick access
      currentAuthSession = {
        userId: user.uuid,
        uuid: user.uuid,
        username: user.username,
        email: null,
        accessToken: token,
        refreshToken: null,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      };

      return {
        success: true,
        token,
        user: {
          uuid: user.uuid,
          username: user.username,
          id: user.uuid,
        },
      };
    } catch (error: any) {
      console.error('❌ Error with local user:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.error || error.message };
    }
  });

  // Logout
  ipcMain.handle('auth:logout', async () => {
    try {
      console.log('👤 [Auth] Logging out user');
      // ✅ FIX: Don't delete the auth record, just clear the session
      // This allows the user to restore their session on next login
      // The renderer will clear localStorage, which effectively logs them out
      currentAuthSession = null;
      // localStorage will be cleared by the renderer's logout function
      stopOAuthServer();
      pendingAuthCode = null;
      console.log('✅ [Auth] User logged out successfully (session cleared, auth record preserved)');
      return { success: true };
    } catch (error: any) {
      console.error('❌ [Auth] Logout error:', error.message);
      return { success: false, error: error.message };
    }
  });
}
