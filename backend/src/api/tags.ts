import { Router, Response, Request } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db/connection';
import { CreateTagInput } from '../types/enrichment';

const router = Router();

// Temporary: Use a default user UUID for desktop app (will be replaced with Minecraft auth)
const DEFAULT_USER_UUID = '00000000-0000-0000-0000-000000000000';

// ============================================
// GET /tags - List user's tags
// ============================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = DEFAULT_USER_UUID;

    console.log('🏷️  [Backend] GET /api/tags');
    console.log('   userId:', userId);

    console.log('📚 [Backend] Fetching tags from database...');
    const result = await pool.query(
      `SELECT t.*, COUNT(nt.note_id) as tag_count
       FROM tags t
       LEFT JOIN note_tags nt ON t.id = nt.tag_id
       WHERE t.user_uuid = $1
       GROUP BY t.id
       ORDER BY t.name ASC`,
      [userId]
    );

    console.log('✅ [Backend] Found', result.rows.length, 'tags');
    const tags = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      color: row.color,
      created_at: row.created_at,
      count: parseInt(row.tag_count),
    }));

    console.log('📤 [Backend] Returning tags response');
    res.json({ tags });
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /tags - Create tag
// ============================================
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = DEFAULT_USER_UUID;
    const { name, color } = req.body as CreateTagInput;

    console.log('🏷️  [Backend] POST /api/tags');
    console.log('   userId:', userId);
    console.log('   body:', { name, color });

    if (!name || !name.trim()) {
      console.log('❌ [Backend] Tag name is empty');
      return res.status(400).json({ error: 'Tag name is required' });
    }

    // Check if tag already exists
    console.log('🔍 [Backend] Checking if tag already exists...');
    const existing = await pool.query(
      'SELECT id FROM tags WHERE user_uuid = $1 AND LOWER(name) = LOWER($2)',
      [userId, name]
    );

    if (existing.rows.length > 0) {
      console.log('❌ [Backend] Tag already exists');
      return res.status(409).json({ error: 'Tag already exists' });
    }

    const tagId = randomUUID();
    const now = new Date();

    console.log('💾 [Backend] Inserting tag into database...');
    await pool.query(
      `INSERT INTO tags (id, user_uuid, name, color, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [tagId, userId, name, color || null, now]
    );

    console.log('✅ [Backend] Tag created with id:', tagId);
    res.status(201).json({
      tag: {
        id: tagId,
        name,
        color: color || null,
        created_at: now,
      },
    });
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PATCH /tags/:tagId - Update tag
// ============================================
router.patch('/:tagId', async (req: Request, res: Response) => {
  try {
    const { tagId } = req.params;
    const userId = DEFAULT_USER_UUID;
    const { name, color } = req.body;

    console.log('✏️  [Backend] PATCH /api/tags/:tagId');
    console.log('   tagId:', tagId);
    console.log('   userId:', userId);
    console.log('   body:', { name, color });

    // Verify ownership
    console.log('🔍 [Backend] Verifying tag ownership...');
    const tagResult = await pool.query(
      'SELECT * FROM tags WHERE id = $1 AND user_uuid = $2',
      [tagId, userId]
    );

    if (tagResult.rows.length === 0) {
      console.log('❌ [Backend] Tag not found or ownership mismatch');
      return res.status(404).json({ error: 'Tag not found' });
    }

    console.log('✅ [Backend] Ownership verified');

    const updates: string[] = [];
    const values: any[] = [tagId, userId];
    let paramIndex = 3;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex}`);
      values.push(color);
      paramIndex++;
    }

    if (updates.length === 0) {
      console.log('❌ [Backend] No fields to update');
      return res.status(400).json({ error: 'No fields to update' });
    }

    console.log('💾 [Backend] Updating tag...');
    await pool.query(
      `UPDATE tags SET ${updates.join(', ')} WHERE id = $1 AND user_uuid = $2`,
      values
    );

    console.log('✅ [Backend] Tag updated, fetching updated record...');
    const updated = await pool.query(
      'SELECT * FROM tags WHERE id = $1',
      [tagId]
    );

    console.log('📤 [Backend] Returning updated tag response');
    res.json({ tag: updated.rows[0] });
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// DELETE /tags/:tagId - Delete tag
// ============================================
router.delete('/:tagId', async (req: Request, res: Response) => {
  try {
    const { tagId } = req.params;
    const userId = DEFAULT_USER_UUID;

    console.log('🗑️  [Backend] DELETE /api/tags/:tagId');
    console.log('   tagId:', tagId);
    console.log('   userId:', userId);

    // Verify ownership
    console.log('🔍 [Backend] Verifying tag ownership...');
    const tagResult = await pool.query(
      'SELECT * FROM tags WHERE id = $1 AND user_uuid = $2',
      [tagId, userId]
    );

    if (tagResult.rows.length === 0) {
      console.log('❌ [Backend] Tag not found or ownership mismatch');
      return res.status(404).json({ error: 'Tag not found' });
    }

    console.log('✅ [Backend] Ownership verified, deleting tag...');

    // Delete tag (cascade deletes note_tags via foreign key)
    await pool.query(
      'DELETE FROM tags WHERE id = $1',
      [tagId]
    );

    console.log('✅ [Backend] Tag deleted successfully');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
