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
      WHERE user_uuid = ? AND deleted_at IS NULL
      ORDER BY last_played DESC
      LIMIT ? OFFSET ?;
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

// POST /saves/batch - Bulk upsert saves from scanner
router.post('/batch', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const { saves } = req.body;

  if (!Array.isArray(saves) || saves.length === 0) {
    return res.status(400).json({ error: 'saves array required' });
  }

  try {
    const inserted = [];
    const updated = [];

    for (const save of saves) {
      const checkQuery = 'SELECT id FROM saves WHERE id = ? AND user_uuid = ?';
      const existing = await pool.query(checkQuery, [save.id, req.user?.uuid]);

      if (existing.rows && existing.rows.length > 0) {
        // Update existing
        const updateQuery = `
          UPDATE saves SET
            world_name = ?, version = ?, game_mode = ?, difficulty = ?,
            seed = ?, play_time_ticks = ?, spawn_x = ?, spawn_y = ?, spawn_z = ?,
            health = ?, hunger = ?, level = ?, xp = ?, food_eaten = ?,
            beds_slept_in = ?, deaths = ?, blocks_mined = ?, blocks_placed = ?,
            items_crafted = ?, mobs_killed = ?, damage_taken = ?, updated_at = NOW()
          WHERE id = ? AND user_uuid = ?
        `;
        await pool.query(updateQuery, [
          save.world_name, save.version, save.game_mode, save.difficulty,
          save.seed, save.play_time_ticks, save.spawn_x, save.spawn_y, save.spawn_z,
          save.health || null, save.hunger || null, save.level || null, save.xp || null,
          save.food_eaten || null, save.beds_slept_in || null, save.deaths || null,
          save.blocks_mined || null, save.blocks_placed || null, save.items_crafted || null,
          save.mobs_killed || null, save.damage_taken || null, save.id, req.user?.uuid,
        ]);
        updated.push(save.id);
      } else {
        // Insert new
        const insertQuery = `
          INSERT INTO saves (
            id, user_uuid, folder_id, world_name, file_path, version, game_mode,
            difficulty, seed, play_time_ticks, spawn_x, spawn_y, spawn_z,
            health, hunger, level, xp, food_eaten, beds_slept_in, deaths,
            blocks_mined, blocks_placed, items_crafted, mobs_killed, damage_taken
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await pool.query(insertQuery, [
          save.id, req.user?.uuid, save.folder_id || null, save.world_name, save.file_path,
          save.version, save.game_mode, save.difficulty, save.seed, save.play_time_ticks,
          save.spawn_x, save.spawn_y, save.spawn_z, save.health || null, save.hunger || null,
          save.level || null, save.xp || null, save.food_eaten || null, save.beds_slept_in || null,
          save.deaths || null, save.blocks_mined || null, save.blocks_placed || null,
          save.items_crafted || null, save.mobs_killed || null, save.damage_taken || null,
        ]);
        inserted.push(save.id);
      }
    }

    res.json({
      message: 'Saves synced',
      inserted: inserted.length,
      updated: updated.length,
    });
  } catch (error: any) {
    console.error('❌ Error batch syncing saves:', error.message || error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to sync saves' });
  }
});

export default router;
