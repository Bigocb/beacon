import { Router, Response, Request } from 'express';
import {
  exchangeCodeForToken,
  getMinecraftProfile,
  createOrUpdateUser,
  generateJWT,
} from '../auth/oauth';

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

export default router;
