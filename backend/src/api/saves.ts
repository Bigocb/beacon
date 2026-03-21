import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db/connection';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = Router();

// GET /saves - List user's saves with pagination
router.get('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const query = `
      SELECT * FROM saves
      WHERE user_uuid = $1 AND deleted_at IS NULL
      ORDER BY last_played DESC
      LIMIT $2 OFFSET $3;
    `;

    const result = await pool.query(query, [req.user?.uuid, limit, offset]);

    res.json({
      saves: result.rows,
      total: result.rows.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching saves:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /saves - Create new save record
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const {
    world_name,
    file_path,
    version,
    game_mode,
    difficulty,
    seed,
    play_time_ticks,
    spawn_x,
    spawn_y,
    spawn_z,
  } = req.body;

  try {
    const id = randomUUID();
    const query = `
      INSERT INTO saves (
        id, user_uuid, world_name, file_path, version, game_mode,
        difficulty, seed, play_time_ticks, spawn_x, spawn_y, spawn_z
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;

    const result = await pool.query(query, [
      id,
      req.user?.uuid,
      world_name,
      file_path,
      version,
      game_mode,
      difficulty,
      seed,
      play_time_ticks,
      spawn_x,
      spawn_y,
      spawn_z,
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating save:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /saves/:save_id - Update save metadata
router.patch(
  '/:save_id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const { save_id } = req.params;
    const { notes, status, custom_tags } = req.body;

    try {
      const query = `
        UPDATE saves
        SET notes = COALESCE($1, notes),
            status = COALESCE($2, status),
            custom_tags = COALESCE($3, custom_tags),
            updated_at = NOW()
        WHERE id = $4 AND user_uuid = $5
        RETURNING *;
      `;

      const result = await pool.query(query, [
        notes || null,
        status || null,
        custom_tags ? JSON.stringify(custom_tags) : null,
        save_id,
        req.user?.uuid,
      ]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Save not found' });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating save:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /saves/:save_id - Soft delete save
router.delete(
  '/:save_id',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const { save_id } = req.params;

    try {
      const query = `
        UPDATE saves
        SET deleted_at = NOW(), status = 'deleted'
        WHERE id = $1 AND user_uuid = $2
        RETURNING *;
      `;

      const result = await pool.query(query, [save_id, req.user?.uuid]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Save not found' });
        return;
      }

      res.json({ message: 'Save deleted' });
    } catch (error) {
      console.error('Error deleting save:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
