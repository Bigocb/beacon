import { Router, Response, Request } from 'express';
import { randomUUID } from 'crypto';
import {
  exchangeCodeForToken,
  getMinecraftProfile,
  createOrUpdateUser,
  generateJWT,
  verifyJWT,
} from '../auth/oauth';
import pool from '../db/connection';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// POST /auth/oauth/callback - Exchange OAuth code for JWT
router.post('/oauth/callback', async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    res.status(400).json({ error: 'Missing authorization code' });
    return;
  }

  try {
    // Exchange code for Microsoft token
    const { accessToken } = await exchangeCodeForToken(code);

    // Get Minecraft profile
    const profile = await getMinecraftProfile(accessToken);

    // Create or update user in database
    await createOrUpdateUser(profile.id, profile.name);

    // Generate JWT token
    const token = generateJWT(profile.id);

    res.json({
      token,
      user: {
        uuid: profile.id,
        username: profile.name,
      },
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// POST /auth/local - Create or retrieve local user account
router.post('/local', async (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username) {
    res.status(400).json({ error: 'Username is required' });
    return;
  }

  try {
    console.log('🎮 [Auth] Processing local user:', username);

    // Check if local user exists
    const query = 'SELECT * FROM users WHERE username = ? AND minecraft_uuid LIKE ?';
    const result = await pool.query(query, [username, 'local-%']);

    let userUuid: string;
    let isNew = false;

    if (result.rows.length > 0) {
      // User exists, reuse UUID
      userUuid = result.rows[0].minecraft_uuid;
      console.log('✅ [Auth] Local user found:', userUuid);
    } else {
      // Create new local user with UUID prefix
      userUuid = `local-${randomUUID()}`;
      isNew = true;

      // Insert new user
      const insertQuery = `
        INSERT INTO users (minecraft_uuid, username, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now'))
      `;
      const insertResult = await pool.query(insertQuery, [userUuid, username]);

      console.log('✨ [Auth] New local user created:', userUuid);
    }

    // Generate JWT token
    const token = generateJWT(userUuid);

    res.json({
      token,
      user: {
        uuid: userUuid,
        username: username,
        isNew,
      },
    });
  } catch (error: any) {
    console.error('❌ [Auth] Local auth error:', error);
    res.status(500).json({ error: 'Local authentication failed' });
  }
});

// GET /auth/accounts - List all existing local accounts
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    console.log('📋 [Auth] Fetching all local accounts');

    const query = 'SELECT username FROM users WHERE minecraft_uuid LIKE ? ORDER BY username';
    const result = await pool.query(query, ['local-%']);

    const accounts = result.rows.map((row: any) => row.username);

    console.log(`✅ [Auth] Found ${accounts.length} local accounts`);
    res.json({ accounts });
  } catch (error: any) {
    console.error('❌ [Auth] Error fetching accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// POST /auth/verify - Verify current token validity
router.post('/verify', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const uuid = req.user?.uuid;

    if (!uuid) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    console.log('🔐 [Auth] Verifying token for user:', uuid);

    // Query user from database to get current info
    const query = 'SELECT minecraft_uuid, username FROM users WHERE minecraft_uuid = ?';
    const result = await pool.query(query, [uuid]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];
    console.log('✅ [Auth] Token verified for user:', user.username);

    res.json({
      valid: true,
      user: {
        uuid: user.minecraft_uuid,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error('❌ [Auth] Token verification error:', error);
    res.status(500).json({ error: 'Token verification failed' });
  }
});

export default router;
