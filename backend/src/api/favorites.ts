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
      WHERE user_uuid = ?
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, [req.user?.uuid]);
    const favoriteIds = (result.rows || []).map((row: any) => row.instance_folder_id);

    res.json({ favorites: favoriteIds });
  } catch (error: any) {
    console.error('❌ [GET /favorites] Error:', error.message || error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
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
    const id = randomUUID();
    const query = `
      INSERT OR IGNORE INTO favorites (id, user_uuid, instance_folder_id)
      VALUES (?, ?, ?);
    `;

    await pool.query(query, [id, req.user?.uuid, instanceFolderId]);

    const result = await pool.query('SELECT id FROM favorites WHERE id = ?', [id]);

    const recordId = (result.rows && result.rows[0]?.id) || id;
    res.status(201).json({
      success: true,
      id: recordId
    });
  } catch (error: any) {
    console.error('❌ [POST /favorites] Error:', error.message || error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// DELETE /favorites/:instanceFolderId - Remove an instance from favorites
router.delete('/:instanceFolderId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { instanceFolderId } = req.params;

  try {
    const query = `
      DELETE FROM favorites
      WHERE user_uuid = ? AND instance_folder_id = ?;
    `;

    await pool.query(query, [req.user?.uuid, instanceFolderId]);

    res.json({ success: true });
  } catch (error: any) {
    console.error('❌ [DELETE /favorites] Error:', error.message || error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

export default router;
