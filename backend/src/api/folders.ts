import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db/connection';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /folders - List user's save folders
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const query = `
      SELECT id, user_uuid, folder_path, display_name, created_at
      FROM save_folders
      WHERE user_uuid = ?
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query, [req.user?.uuid]);

    res.json({
      folders: result.rows || [],
      total: result.rows?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /folders - Create new save folder
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { folder_path, display_name } = req.body;

  if (!folder_path) {
    return res.status(400).json({ error: 'folder_path is required' });
  }

  try {
    const id = randomUUID();
    const name = display_name || folder_path.split(/[\\\/]/).pop() || 'Minecraft Saves';

    const query = `
      INSERT INTO save_folders (id, user_uuid, folder_path, display_name)
      VALUES (?, ?, ?, ?);
    `;

    await pool.query(query, [id, req.user?.uuid, folder_path, name]);

    const folder = await pool.query('SELECT * FROM save_folders WHERE id = ?', [id]);

    res.status(201).json({
      folder: folder.rows?.[0] || { id, user_uuid: req.user?.uuid, folder_path, display_name: name },
    });
  } catch (error: any) {
    console.error('Error creating folder:', error);

    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Folder already added for this user' });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /folders/:id - Remove save folder
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  try {
    const query = `
      DELETE FROM save_folders
      WHERE id = ? AND user_uuid = ?;
    `;

    await pool.query(query, [id, req.user?.uuid]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
