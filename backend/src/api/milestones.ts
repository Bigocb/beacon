import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db/connection';
import { CreateMilestoneInput, UpdateMilestoneInput } from '../types/enrichment';

const router = Router();

// Temporary: Use a default user UUID for desktop app (will be replaced with Minecraft auth)
const DEFAULT_USER_UUID = '00000000-0000-0000-0000-000000000000';

// ============================================
// GET /saves/:saveId/milestones - List all milestones
// ============================================
router.get('/saves/:saveId/milestones', async (req: Request, res: Response) => {
  try {
    const { saveId } = req.params;

    console.log('🎯 [Backend] GET /api/saves/:saveId/milestones');
    console.log('   saveId:', saveId);

    console.log('📚 [Backend] Fetching milestones from database...');
    const result = await pool.query(
      'SELECT * FROM milestones WHERE save_id = $1 ORDER BY position ASC, created_at DESC',
      [saveId]
    );

    console.log(`✅ [Backend] Found ${result.rows.length} milestones`);
    console.log('📤 [Backend] Returning milestones response');
    res.json({ milestones: result.rows });
  } catch (error) {
    console.error('❌ [Backend] Error fetching milestones:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /saves/:saveId/milestones - Create milestone
// ============================================
router.post('/saves/:saveId/milestones', async (req: Request, res: Response) => {
  try {
    const { saveId } = req.params;
    const { name, description, target_play_time_ticks, position } = req.body as CreateMilestoneInput;

    console.log('🎯 [Backend] POST /api/saves/:saveId/milestones');
    console.log('   saveId:', saveId);
    console.log('   body:', {
      name,
      description: description?.substring(0, 50),
      target_play_time_ticks,
      position,
    });

    if (!name || name.trim() === '') {
      console.log('⚠️  [Backend] Name is required');
      return res.status(400).json({ error: 'Milestone name is required' });
    }

    const id = randomUUID();
    const now = new Date();
    const pos = position ?? 0;

    console.log('💾 [Backend] Inserting milestone into database...');
    const result = await pool.query(
      `INSERT INTO milestones (id, save_id, name, description, target_play_time_ticks, position, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [id, saveId, name, description || null, target_play_time_ticks || null, pos, now, now]
    );

    console.log('✅ [Backend] Milestone created');
    console.log('📤 [Backend] Returning milestone response');
    res.status(201).json({ milestone: result.rows[0] });
  } catch (error) {
    console.error('❌ [Backend] Error creating milestone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PATCH /saves/:saveId/milestones/:id - Update milestone
// ============================================
router.patch('/saves/:saveId/milestones/:id', async (req: Request, res: Response) => {
  try {
    const { saveId, id } = req.params;
    const { name, description, target_play_time_ticks, position, achieved_at } = req.body as UpdateMilestoneInput;

    console.log('✏️  [Backend] PATCH /api/saves/:saveId/milestones/:id');
    console.log('   saveId:', saveId);
    console.log('   milestoneId:', id);
    console.log('   body:', {
      name,
      description: description?.substring(0, 50),
      target_play_time_ticks,
      position,
      achieved_at,
    });

    // Check if milestone exists
    console.log('🔍 [Backend] Checking if milestone exists...');
    const existing = await pool.query(
      'SELECT id FROM milestones WHERE id = $1 AND save_id = $2',
      [id, saveId]
    );

    if (existing.rows.length === 0) {
      console.log('❌ [Backend] Milestone not found');
      return res.status(404).json({ error: 'Milestone not found' });
    }

    console.log('✅ [Backend] Milestone exists, updating...');

    // Build dynamic update query
    const updates: string[] = ['updated_at = $3'];
    const values: any[] = [id, saveId, new Date()];
    let paramIndex = 4;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    if (target_play_time_ticks !== undefined) {
      updates.push(`target_play_time_ticks = $${paramIndex}`);
      values.push(target_play_time_ticks);
      paramIndex++;
    }
    if (position !== undefined) {
      updates.push(`position = $${paramIndex}`);
      values.push(position);
      paramIndex++;
    }
    if (achieved_at !== undefined) {
      updates.push(`achieved_at = $${paramIndex}`);
      values.push(achieved_at);
      paramIndex++;
    }

    console.log('💾 [Backend] Updating milestone...');
    await pool.query(
      `UPDATE milestones SET ${updates.join(', ')} WHERE id = $1 AND save_id = $2`,
      values
    );

    // Fetch and return updated milestone
    console.log('📚 [Backend] Fetching updated milestone...');
    const result = await pool.query('SELECT * FROM milestones WHERE id = $1', [id]);

    console.log('✅ [Backend] Milestone updated');
    console.log('📤 [Backend] Returning updated milestone response');
    res.json({ milestone: result.rows[0] });
  } catch (error) {
    console.error('❌ [Backend] Error updating milestone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DELETE /saves/:saveId/milestones/:id - Delete milestone
// ============================================
router.delete('/saves/:saveId/milestones/:id', async (req: Request, res: Response) => {
  try {
    const { saveId, id } = req.params;

    console.log('🗑️  [Backend] DELETE /api/saves/:saveId/milestones/:id');
    console.log('   saveId:', saveId);
    console.log('   milestoneId:', id);

    console.log('🔍 [Backend] Checking if milestone exists...');
    const existing = await pool.query(
      'SELECT id FROM milestones WHERE id = $1 AND save_id = $2',
      [id, saveId]
    );

    if (existing.rows.length === 0) {
      console.log('❌ [Backend] Milestone not found');
      return res.status(404).json({ error: 'Milestone not found' });
    }

    console.log('💾 [Backend] Deleting milestone...');
    await pool.query('DELETE FROM milestones WHERE id = $1 AND save_id = $2', [id, saveId]);

    console.log('✅ [Backend] Milestone deleted');
    console.log('📤 [Backend] Returning success response');
    res.json({ success: true });
  } catch (error) {
    console.error('❌ [Backend] Error deleting milestone:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
