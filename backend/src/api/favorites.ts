import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db/connection';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /favorites - Get all favorite instances for current user
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = `
      SELECT instance_folder_id
      FROM favorites
      WHERE user_uuid = $1
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, [req.user?.uuid]);
    const favoriteIds = result.rows.map((row: any) => row.instance_folder_id);

    res.json({ favorites: favoriteIds });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /favorites - Add an instance to favorites
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { instanceFolderId } = req.body;

  if (!instanceFolderId) {
    res.status(400).json({ error: 'instanceFolderId is required' });
    return;
  }

  try {
    const query = `
      INSERT INTO favorites (id, user_uuid, instance_folder_id)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_uuid, instance_folder_id) DO NOTHING
      RETURNING id;
    `;

    const result = await pool.query(query, [
      randomUUID(),
      req.user?.uuid,
      instanceFolderId
    ]);

    res.status(201).json({
      success: true,
      id: result.rows[0]?.id
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /favorites/:instanceFolderId - Remove an instance from favorites
router.delete('/:instanceFolderId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { instanceFolderId } = req.params;

  try {
    const query = `
      DELETE FROM favorites
      WHERE user_uuid = $1 AND instance_folder_id = $2;
    `;

    await pool.query(query, [req.user?.uuid, instanceFolderId]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
