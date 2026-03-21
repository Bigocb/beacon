import { Router, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import pool from '../db/connection';
import { CreateWorldMetadataInput, UpdateWorldMetadataInput } from '../types/enrichment';

const router = Router();

// Temporary: Use a default user UUID for desktop app (will be replaced with Minecraft auth)
const DEFAULT_USER_UUID = '00000000-0000-0000-0000-000000000000';

// ============================================
// GET /saves/:saveId/metadata - Get world metadata
// ============================================
router.get('/saves/:saveId/metadata', async (req: Request, res: Response) => {
  try {
    const { saveId } = req.params;
    const userId = DEFAULT_USER_UUID;

    console.log('🌍 [Backend] GET /api/saves/:saveId/metadata');
    console.log('   saveId:', saveId);
    console.log('   userId:', userId);

    // Fetch metadata for this save
    console.log('📚 [Backend] Fetching metadata from database...');
    const result = await pool.query(
      'SELECT * FROM world_metadata WHERE save_id = $1',
      [saveId]
    );

    // If no metadata exists, return default/empty metadata
    if (result.rows.length === 0) {
      console.log('   No metadata found, returning defaults');
      const defaultMetadata = {
        save_id: saveId,
        description: null,
        is_favorite: false,
        theme_color: null,
        world_type: 'survival',
        modpack_name: null,
        modpack_version: null,
        project_id: null,
        archived_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      console.log('📤 [Backend] Returning default metadata');
      return res.json({ metadata: defaultMetadata });
    }

    console.log('✅ [Backend] Found metadata');
    console.log('📤 [Backend] Returning metadata response');
    res.json({ metadata: result.rows[0] });
  } catch (error) {
    console.error('❌ [Backend] Error fetching metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// POST /saves/:saveId/metadata - Create world metadata
// ============================================
router.post('/saves/:saveId/metadata', async (req: Request, res: Response) => {
  try {
    const { saveId } = req.params;
    const userId = DEFAULT_USER_UUID;
    const { description, is_favorite, theme_color, world_type, modpack_name, modpack_version, project_id } =
      req.body as CreateWorldMetadataInput;

    console.log('🌍 [Backend] POST /api/saves/:saveId/metadata');
    console.log('   saveId:', saveId);
    console.log('   userId:', userId);
    console.log('   body:', {
      description: description?.substring(0, 50),
      is_favorite,
      theme_color,
      world_type,
      modpack_name,
      modpack_version,
    });

    // Check if metadata already exists
    console.log('🔍 [Backend] Checking if metadata already exists...');
    const existing = await pool.query('SELECT save_id FROM world_metadata WHERE save_id = $1', [saveId]);

    if (existing.rows.length > 0) {
      console.log('⚠️  [Backend] Metadata already exists, returning existing record');
      const result = await pool.query('SELECT * FROM world_metadata WHERE save_id = $1', [saveId]);
      return res.status(200).json({ metadata: result.rows[0] });
    }

    const now = new Date();

    console.log('💾 [Backend] Inserting metadata into database...');
    const result = await pool.query(
      `INSERT INTO world_metadata (save_id, description, is_favorite, theme_color, world_type, modpack_name, modpack_version, project_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        saveId,
        description || null,
        is_favorite || false,
        theme_color || null,
        world_type || 'survival',
        modpack_name || null,
        modpack_version || null,
        project_id || null,
        now,
        now,
      ]
    );

    console.log('✅ [Backend] Metadata created');
    console.log('📤 [Backend] Returning metadata response');
    res.status(201).json({ metadata: result.rows[0] });
  } catch (error) {
    console.error('❌ [Backend] Error creating metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PATCH /saves/:saveId/metadata - Update world metadata
// ============================================
router.patch('/saves/:saveId/metadata', async (req: Request, res: Response) => {
  try {
    const { saveId } = req.params;
    const userId = DEFAULT_USER_UUID;
    const { description, is_favorite, theme_color, world_type, modpack_name, modpack_version, project_id } =
      req.body as UpdateWorldMetadataInput;

    console.log('✏️  [Backend] PATCH /api/saves/:saveId/metadata');
    console.log('   saveId:', saveId);
    console.log('   userId:', userId);
    console.log('   body:', {
      description: description?.substring(0, 50),
      is_favorite,
      theme_color,
      world_type,
      modpack_name,
      modpack_version,
    });

    // Check if metadata exists
    console.log('🔍 [Backend] Checking if metadata exists...');
    const metadataCheck = await pool.query('SELECT save_id FROM world_metadata WHERE save_id = $1', [saveId]);

    if (metadataCheck.rows.length === 0) {
      console.log('❌ [Backend] Metadata not found, creating new record');
      // Create if doesn't exist
      const now = new Date();
      const result = await pool.query(
        `INSERT INTO world_metadata (save_id, description, is_favorite, theme_color, world_type, modpack_name, modpack_version, project_id, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          saveId,
          description || null,
          is_favorite || false,
          theme_color || null,
          world_type || 'survival',
          modpack_name || null,
          modpack_version || null,
          project_id || null,
          now,
          now,
        ]
      );
      return res.json({ metadata: result.rows[0] });
    }

    console.log('✅ [Backend] Metadata exists, updating...');

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [saveId, new Date()];
    let paramIndex = 3;

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }
    if (is_favorite !== undefined) {
      updates.push(`is_favorite = $${paramIndex}`);
      values.push(is_favorite);
      paramIndex++;
    }
    if (theme_color !== undefined) {
      updates.push(`theme_color = $${paramIndex}`);
      values.push(theme_color);
      paramIndex++;
    }
    if (world_type !== undefined) {
      updates.push(`world_type = $${paramIndex}`);
      values.push(world_type);
      paramIndex++;
    }
    if (modpack_name !== undefined) {
      updates.push(`modpack_name = $${paramIndex}`);
      values.push(modpack_name);
      paramIndex++;
    }
    if (modpack_version !== undefined) {
      updates.push(`modpack_version = $${paramIndex}`);
      values.push(modpack_version);
      paramIndex++;
    }
    if (project_id !== undefined) {
      updates.push(`project_id = $${paramIndex}`);
      values.push(project_id);
      paramIndex++;
    }

    if (updates.length > 0) {
      updates.push('updated_at = $2');
      console.log('💾 [Backend] Updating metadata fields...');
      await pool.query(
        `UPDATE world_metadata SET ${updates.join(', ')} WHERE save_id = $1`,
        values
      );
      console.log('✅ [Backend] Metadata updated');
    }

    // Fetch and return updated metadata
    console.log('📚 [Backend] Fetching updated metadata...');
    const result = await pool.query('SELECT * FROM world_metadata WHERE save_id = $1', [saveId]);

    console.log('📤 [Backend] Returning updated metadata response');
    res.json({ metadata: result.rows[0] });
  } catch (error) {
    console.error('❌ [Backend] Error updating metadata:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
