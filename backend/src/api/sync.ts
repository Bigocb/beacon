import { Router, Response } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db/connection';
import { AuthenticatedRequest, authMiddleware } from '../middleware/auth';

const router = Router();

interface SyncPayload {
  saves: any[];
  deletes: {
    saves: string[];
  };
}

// POST /sync - Main sync endpoint
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const payload: SyncPayload = req.body;
  const userUuid = req.user?.uuid;

  if (!userUuid) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const conflicts: any[] = [];
      const updatedSaves: any[] = [];

      // Process saves (create or update)
      if (payload.saves && Array.isArray(payload.saves)) {
        for (const save of payload.saves) {
          const existingQuery = `
            SELECT * FROM saves
            WHERE user_uuid = $1 AND world_name = $2 AND deleted_at IS NULL
          `;
          const existingResult = await client.query(existingQuery, [
            userUuid,
            save.world_name,
          ]);

          if (existingResult.rows.length > 0) {
            const existing = existingResult.rows[0];

            // Check for conflicts (Last Write Wins strategy)
            if (
              existing.updated_at &&
              new Date(existing.updated_at) > new Date(save.updated_at || new Date())
            ) {
              conflicts.push({
                save_id: existing.id,
                resolution: 'server_wins',
                message: 'Server version is newer',
              });
            } else {
              // Update existing save
              const updateQuery = `
                UPDATE saves
                SET world_name = $1, version = $2, game_mode = $3,
                    difficulty = $4, seed = $5, play_time_ticks = $6,
                    spawn_x = $7, spawn_y = $8, spawn_z = $9,
                    notes = COALESCE($10, notes),
                    custom_tags = COALESCE($11, custom_tags),
                    status = COALESCE($12, status),
                    last_played = COALESCE($13, last_played),
                    updated_at = NOW()
                WHERE id = $14
                RETURNING *;
              `;

              const updateResult = await client.query(updateQuery, [
                save.world_name,
                save.version,
                save.game_mode,
                save.difficulty,
                save.seed,
                save.play_time_ticks,
                save.spawn_x,
                save.spawn_y,
                save.spawn_z,
                save.notes || null,
                save.custom_tags ? JSON.stringify(save.custom_tags) : null,
                save.status || null,
                save.last_played || null,
                existing.id,
              ]);

              updatedSaves.push(updateResult.rows[0]);
            }
          } else {
            // Create new save
            const id = save.id || randomUUID();
            const insertQuery = `
              INSERT INTO saves (
                id, user_uuid, world_name, file_path, version, game_mode,
                difficulty, seed, play_time_ticks, spawn_x, spawn_y, spawn_z,
                notes, custom_tags, status, last_played
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
              RETURNING *;
            `;

            const insertResult = await client.query(insertQuery, [
              id,
              userUuid,
              save.world_name,
              save.file_path || null,
              save.version,
              save.game_mode,
              save.difficulty || null,
              save.seed || null,
              save.play_time_ticks || 0,
              save.spawn_x || null,
              save.spawn_y || null,
              save.spawn_z || null,
              save.notes || null,
              save.custom_tags ? JSON.stringify(save.custom_tags) : null,
              save.status || 'active',
              save.last_played || new Date(),
            ]);

            updatedSaves.push(insertResult.rows[0]);
          }
        }
      }

      // Process deletes
      if (payload.deletes && payload.deletes.saves) {
        for (const saveId of payload.deletes.saves) {
          await client.query(
            'UPDATE saves SET deleted_at = NOW(), status = $1 WHERE id = $2 AND user_uuid = $3',
            ['deleted', saveId, userUuid]
          );
        }
      }

      // Log sync event
      await client.query(
        'INSERT INTO sync_log (id, user_uuid, event_type, payload) VALUES ($1, $2, $3, $4)',
        [randomUUID(), userUuid, 'sync', JSON.stringify(payload)]
      );

      await client.query('COMMIT');

      // Fetch all current saves for client
      const currentSavesQuery = `
        SELECT * FROM saves WHERE user_uuid = $1 AND deleted_at IS NULL
      `;
      const currentSavesResult = await client.query(currentSavesQuery, [userUuid]);

      res.json({
        success: true,
        conflicts,
        server_state: {
          saves: currentSavesResult.rows,
        },
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

export default router;
