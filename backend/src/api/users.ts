import { Router, Response } from 'express';
import pool from '../db/connection';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /users/me - Get current user profile
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = 'SELECT * FROM users WHERE minecraft_uuid = $1';
    const result = await pool.query(query, [req.user?.uuid]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /users/me - Update current user profile
router.patch('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { email, profile_name, avatar_url } = req.body;

  try {
    console.log('👤 [Backend] Updating user profile:', req.user?.uuid);
    const query = `
      UPDATE users
      SET email = COALESCE($1, email),
          profile_name = COALESCE($2, profile_name),
          avatar_url = COALESCE($3, avatar_url),
          updated_at = NOW()
      WHERE minecraft_uuid = $4
      RETURNING *;
    `;

    const result = await pool.query(query, [
      email || null,
      profile_name || null,
      avatar_url || null,
      req.user?.uuid,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('✅ [Backend] User profile updated successfully');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ [Backend] Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /users/me/preferences - Update user preferences
router.patch('/me/preferences', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { theme_preference } = req.body;

  try {
    console.log('⚙️ [Backend] Updating user preferences:', req.user?.uuid);
    const query = `
      UPDATE users
      SET theme_preference = COALESCE($1, theme_preference),
          updated_at = NOW()
      WHERE minecraft_uuid = $2
      RETURNING *;
    `;

    const result = await pool.query(query, [
      theme_preference || null,
      req.user?.uuid,
    ]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('✅ [Backend] User preferences updated successfully');
    res.json(result.rows[0]);
  } catch (error) {
    console.error('❌ [Backend] Error updating preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /users/me - Delete user account
router.delete('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🗑️ [Backend] Deleting user account:', req.user?.uuid);

    const query = 'DELETE FROM users WHERE minecraft_uuid = $1 RETURNING minecraft_uuid;';
    const result = await pool.query(query, [req.user?.uuid]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('✅ [Backend] User account deleted successfully');
    res.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    console.error('❌ [Backend] Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /users/player-name/:uuid - Get player name from Mojang API
router.get('/player-name/:uuid', async (req: any, res: Response) => {
  const { uuid } = req.params;

  if (!uuid) {
    res.status(400).json({ error: 'UUID is required' });
    return;
  }

  try {
    // Remove hyphens from UUID for API call
    const uuidWithoutHyphens = uuid.replace(/-/g, '');

    // Fetch from Mojang API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://sessionserver.mojang.com/session/minecraft/profile/${uuidWithoutHyphens}`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`⚠️ Mojang API returned status ${response.status} for UUID: ${uuid}`);
      res.status(response.status).json({ error: 'Failed to fetch player name from Mojang API' });
      return;
    }

    const profileData: any = await response.json();
    res.json({
      uuid,
      name: profileData.name || null,
      success: true
    });
  } catch (error: any) {
    console.error(`⚠️ Could not fetch player name for UUID ${uuid}:`, error.message);
    res.status(500).json({
      error: 'Failed to fetch player name',
      message: error.message
    });
  }
});

export default router;
