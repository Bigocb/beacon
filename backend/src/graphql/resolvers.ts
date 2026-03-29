import pool from '../db/connection';
import { AuthenticatedRequest } from '../middleware/auth';
import { randomUUID } from 'crypto';

// Helper: Fetch note with tags
async function getNoteWithTags(noteId: string) {
  const noteQuery = 'SELECT * FROM notes WHERE id = ?';
  const noteResult = await pool.query(noteQuery, [noteId]);
  const note = noteResult.rows?.[0];

  if (!note) return null;

  const tagsQuery = `
    SELECT t.* FROM tags t
    INNER JOIN note_tags nt ON t.id = nt.tag_id
    WHERE nt.note_id = ?
  `;
  const tagsResult = await pool.query(tagsQuery, [noteId]);
  note.tags = tagsResult.rows || [];

  return note;
}

export const resolvers = {
  Query: {
    currentUser: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) return null;

      const query = 'SELECT * FROM users WHERE minecraft_uuid = ?';
      const result = await pool.query(query, [req.user.uuid]);
      return result.rows?.[0] || null;
    },

    user: async (parent: any, args: any, context: any) => {
      const query = 'SELECT * FROM users WHERE minecraft_uuid = ?';
      const result = await pool.query(query, [args.minecraft_uuid]);
      return result.rows?.[0] || null;
    },

    instances: async (parent: any, args: any, context: any) => {
      console.log('🔍 [instances resolver] context:', context);
      console.log('🔍 [instances resolver] context.req:', context?.req);
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      // Get all folders for this user
      const foldersQuery = 'SELECT * FROM save_folders WHERE user_uuid = ?';
      const foldersResult = await pool.query(foldersQuery, [req.user.uuid]);
      const folders = foldersResult.rows || [];

      // Get all saves for this user
      const savesQuery = 'SELECT * FROM saves WHERE user_uuid = ? AND deleted_at IS NULL';
      const savesResult = await pool.query(savesQuery, [req.user.uuid]);
      const saves = savesResult.rows || [];

      // Create instance map from folders
      const folderMap = new Map(folders.map((f: any) => [f.id, f]));

      // Group saves by folder_id
      const instanceMap = new Map<string, any>();
      saves.forEach((save: any) => {
        const folderId = save.folder_id || 'default';
        if (!instanceMap.has(folderId)) {
          const folder = folderMap.get(folderId);
          instanceMap.set(folderId, {
            folder_id: folderId,
            display_name: folder?.display_name || folderId,
            instance_name: save.instance_name,
            mod_loader: save.mod_loader || 'vanilla',
            loader_version: save.loader_version,
            game_version: save.game_version,
            instance_type: save.instance_type || 'unknown',
            launcher: save.launcher || 'unknown',
            mod_count: 0,
            save_count: 0,
            saves: []
          });
        }
        const instance = instanceMap.get(folderId)!;
        instance.save_count += 1;
        instance.saves.push(save);
      });

      return Array.from(instanceMap.values());
    },

    instance: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const folderId = args.folder_id;

      // Get folder info
      const folderQuery = 'SELECT * FROM save_folders WHERE id = ? AND user_uuid = ?';
      const folderResult = await pool.query(folderQuery, [folderId, req.user.uuid]);
      const folder = folderResult.rows?.[0];

      // Get saves for this instance
      const savesQuery = 'SELECT * FROM saves WHERE folder_id = ? AND user_uuid = ? AND deleted_at IS NULL';
      const savesResult = await pool.query(savesQuery, [folderId, req.user.uuid]);
      const saves = savesResult.rows || [];

      if (!folder && saves.length === 0) return null;

      const firstSave = saves[0];
      return {
        folder_id: folderId,
        display_name: folder?.display_name || folderId,
        instance_name: firstSave?.instance_name,
        mod_loader: firstSave?.mod_loader || 'vanilla',
        loader_version: firstSave?.loader_version,
        game_version: firstSave?.game_version,
        instance_type: firstSave?.instance_type || 'unknown',
        launcher: firstSave?.launcher || 'unknown',
        mod_count: 0,
        save_count: saves.length,
        saves
      };
    },

    saves: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const limit = Math.min(args.limit || 20, 100);
      const offset = args.offset || 0;

      const query = `
        SELECT * FROM saves
        WHERE user_uuid = ? AND deleted_at IS NULL
        ORDER BY last_played DESC
        LIMIT ? OFFSET ?
      `;
      const result = await pool.query(query, [req.user.uuid, limit, offset]);
      const saves = result.rows || [];

      const countQuery = 'SELECT COUNT(*) as count FROM saves WHERE user_uuid = ? AND deleted_at IS NULL';
      const countResult = await pool.query(countQuery, [req.user.uuid]);
      const total = (countResult.rows?.[0]?.count as number) || 0;

      return {
        saves,
        total,
        limit,
        offset
      };
    },

    save: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const query = 'SELECT * FROM saves WHERE id = ? AND user_uuid = ?';
      const result = await pool.query(query, [args.id, req.user.uuid]);
      return result.rows?.[0] || null;
    },

    savesByInstance: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const query = 'SELECT * FROM saves WHERE folder_id = ? AND user_uuid = ? AND deleted_at IS NULL';
      const result = await pool.query(query, [args.folder_id, req.user.uuid]);
      return result.rows || [];
    },

    folders: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const query = 'SELECT * FROM save_folders WHERE user_uuid = ?';
      const result = await pool.query(query, [req.user.uuid]);
      return result.rows || [];
    },

    folder: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const query = 'SELECT * FROM save_folders WHERE id = ? AND user_uuid = ?';
      const result = await pool.query(query, [args.id, req.user.uuid]);
      return result.rows?.[0] || null;
    },

    tags: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const query = 'SELECT * FROM tags WHERE user_uuid = ? ORDER BY name';
      const result = await pool.query(query, [req.user.uuid]);
      return result.rows || [];
    },

    notes: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { saveId } = args;

      // Verify save ownership
      const saveQuery = 'SELECT * FROM saves WHERE id = ? AND user_uuid = ?';
      const saveResult = await pool.query(saveQuery, [saveId, req.user.uuid]);
      if (!saveResult.rows?.[0]) throw new Error('Save not found');

      const query = `
        SELECT * FROM notes
        WHERE save_id = ? AND deleted_at IS NULL
        ORDER BY timestamp DESC
      `;
      const result = await pool.query(query, [saveId]);

      const notes = [];
      for (const note of result.rows || []) {
        const withTags = await getNoteWithTags(note.id);
        if (withTags) notes.push(withTags);
      }

      return notes;
    },

    note: async (parent: any, args: any, context: any) => {
      const { id } = args;
      return await getNoteWithTags(id);
    },

    milestones: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { saveId } = args;

      // Verify save ownership
      const saveQuery = 'SELECT * FROM saves WHERE id = ? AND user_uuid = ?';
      const saveResult = await pool.query(saveQuery, [saveId, req.user.uuid]);
      if (!saveResult.rows?.[0]) throw new Error('Save not found');

      const query = `
        SELECT * FROM milestones
        WHERE save_id = ?
        ORDER BY position ASC
      `;
      const result = await pool.query(query, [saveId]);
      return result.rows || [];
    },

    milestone: async (parent: any, args: any, context: any) => {
      const { id } = args;
      const query = 'SELECT * FROM milestones WHERE id = ?';
      const result = await pool.query(query, [id]);
      return result.rows?.[0] || null;
    },

    metadata: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      console.log('🔍 [metadata resolver] req.user:', req.user, 'args:', args);
      if (!req.user) throw new Error('Not authenticated');

      const { saveId } = args;

      // Verify save ownership
      const saveQuery = 'SELECT * FROM saves WHERE id = ? AND user_uuid = ?';
      const saveResult = await pool.query(saveQuery, [saveId, req.user.uuid]);
      console.log('🔍 [metadata resolver] saveQuery result rows:', saveResult.rows?.length, 'saveId:', saveId, 'user_uuid:', req.user.uuid);
      if (!saveResult.rows?.[0]) throw new Error('Save not found');

      const query = 'SELECT * FROM world_metadata WHERE save_id = ?';
      const result = await pool.query(query, [saveId]);
      return result.rows?.[0] || null;
    },

    getFavorites: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const query = 'SELECT instance_folder_id FROM favorites WHERE user_uuid = ?';
      const result = await pool.query(query, [req.user.uuid]);
      return (result.rows || []).map((r: any) => r.instance_folder_id);
    },

    myStats: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      // Get user info
      const userQuery = 'SELECT username FROM users WHERE minecraft_uuid = ?';
      const userResult = await pool.query(userQuery, [req.user.uuid]);
      const username = userResult.rows?.[0]?.username || 'Unknown';

      // Get all saves for current user
      const savesQuery = 'SELECT * FROM saves WHERE user_uuid = ? AND deleted_at IS NULL';
      const savesResult = await pool.query(savesQuery, [req.user.uuid]);
      const saves = savesResult.rows || [];

      if (saves.length === 0) {
        return {
          user_uuid: req.user.uuid,
          username,
          saves_count: 0,
          total_playtime_ticks: 0,
          total_playtime_hours: 0,
          highest_level: 0,
          total_mobs_killed: 0,
          total_blocks_mined: 0,
          total_blocks_placed: 0,
          total_deaths: 0,
          total_damage_taken: 0,
          total_food_eaten: 0,
          total_beds_slept_in: 0,
          total_items_crafted: 0,
          worlds_visited: 0,
          average_playtime_per_world: 0,
          updated_at: new Date().toISOString(),
        };
      }

      // Aggregate stats across all saves
      const aggregated = saves.reduce((acc: any, save: any) => ({
        total_playtime_ticks: (acc.total_playtime_ticks || 0) + (save.play_time_ticks || 0),
        highest_level: Math.max(acc.highest_level || 0, save.level || 0),
        total_mobs_killed: (acc.total_mobs_killed || 0) + (save.mobs_killed || 0),
        total_blocks_mined: (acc.total_blocks_mined || 0) + (save.blocks_mined || 0),
        total_blocks_placed: (acc.total_blocks_placed || 0) + (save.blocks_placed || 0),
        total_deaths: (acc.total_deaths || 0) + (save.deaths || 0),
        total_damage_taken: (acc.total_damage_taken || 0) + (save.damage_taken || 0),
        total_food_eaten: (acc.total_food_eaten || 0) + (save.food_eaten || 0),
        total_beds_slept_in: (acc.total_beds_slept_in || 0) + (save.beds_slept_in || 0),
        total_items_crafted: (acc.total_items_crafted || 0) + (save.items_crafted || 0),
      }), {});

      const playtimeHours = aggregated.total_playtime_ticks / 72000; // 20 ticks per second, 3600 seconds per hour
      const avgPlaytimePerWorld = saves.length > 0 ? playtimeHours / saves.length : 0;

      return {
        user_uuid: req.user.uuid,
        username,
        saves_count: saves.length,
        total_playtime_ticks: aggregated.total_playtime_ticks,
        total_playtime_hours: parseFloat(playtimeHours.toFixed(2)),
        highest_level: aggregated.highest_level,
        total_mobs_killed: aggregated.total_mobs_killed,
        total_blocks_mined: aggregated.total_blocks_mined,
        total_blocks_placed: aggregated.total_blocks_placed,
        total_deaths: aggregated.total_deaths,
        total_damage_taken: aggregated.total_damage_taken,
        total_food_eaten: aggregated.total_food_eaten,
        total_beds_slept_in: aggregated.total_beds_slept_in,
        total_items_crafted: aggregated.total_items_crafted,
        worlds_visited: saves.length,
        average_playtime_per_world: parseFloat(avgPlaytimePerWorld.toFixed(2)),
        updated_at: new Date().toISOString(),
      };
    },

    leaderboard: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { metric = 'total_playtime_hours', limit = 10 } = args;

      // Get all unique users' saves
      const usersQuery = 'SELECT DISTINCT user_uuid FROM saves WHERE deleted_at IS NULL';
      const usersResult = await pool.query(usersQuery);
      const users = usersResult.rows || [];

      const leaderboardData: any[] = [];

      // Aggregate stats for each user
      for (const userRow of users) {
        const userId = userRow.user_uuid;
        const userSavesQuery = 'SELECT * FROM saves WHERE user_uuid = ? AND deleted_at IS NULL';
        const userSavesResult = await pool.query(userSavesQuery, [userId]);
        const saves = userSavesResult.rows || [];

        if (saves.length === 0) continue;

        const aggregated = saves.reduce((acc: any, save: any) => ({
          total_playtime_ticks: (acc.total_playtime_ticks || 0) + (save.play_time_ticks || 0),
          total_mobs_killed: (acc.total_mobs_killed || 0) + (save.mobs_killed || 0),
          total_blocks_mined: (acc.total_blocks_mined || 0) + (save.blocks_mined || 0),
          total_blocks_placed: (acc.total_blocks_placed || 0) + (save.blocks_placed || 0),
          total_deaths: (acc.total_deaths || 0) + (save.deaths || 0),
        }), {});

        const playtimeHours = aggregated.total_playtime_ticks / 72000;

        // Get user info
        const userQuery = 'SELECT username FROM users WHERE minecraft_uuid = ?';
        const userInfoResult = await pool.query(userQuery, [userId]);
        const username = userInfoResult.rows?.[0]?.username || 'Unknown';

        let value = 0;
        switch (metric) {
          case 'total_playtime_hours':
            value = playtimeHours;
            break;
          case 'total_mobs_killed':
            value = aggregated.total_mobs_killed;
            break;
          case 'total_blocks_mined':
            value = aggregated.total_blocks_mined;
            break;
          case 'total_blocks_placed':
            value = aggregated.total_blocks_placed;
            break;
          case 'total_deaths':
            value = aggregated.total_deaths;
            break;
          default:
            value = playtimeHours;
        }

        leaderboardData.push({
          username,
          user_uuid: userId,
          saves_count: saves.length,
          value,
          metric,
        });
      }

      // Sort and rank
      leaderboardData.sort((a, b) => b.value - a.value);
      return leaderboardData.slice(0, limit).map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));
    }
  },

  Mutation: {
    batchUpsertSaves: async (parent: any, args: any, context: any) => {
      console.log('🔍 [batchUpsertSaves] Called with:', { argsKeys: Object.keys(args), argsValues: args });

      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { saves } = args;
      console.log('💾 [batchUpsertSaves] saves variable:', saves);

      if (!Array.isArray(saves) || saves.length === 0) {
        console.error('❌ [batchUpsertSaves] Invalid saves:', { isArray: Array.isArray(saves), length: saves?.length });
        throw new Error('saves array required');
      }

      console.log(`📤 [batchUpsertSaves] Received ${saves.length} saves for user ${req.user.uuid}`);

      let inserted = 0;
      let updated = 0;

      for (const save of saves) {
        // Always use authenticated user's UUID for security
        const userUuid = req.user.uuid;
        const filePath = save.file_path || '';

        const checkQuery = 'SELECT id FROM saves WHERE id = ? AND user_uuid = ?';
        const existing = await pool.query(checkQuery, [save.id, userUuid]);

        if (existing.rows && existing.rows.length > 0) {
          const updateQuery = `
            UPDATE saves SET
              world_name = ?, version = ?, game_mode = ?, difficulty = ?,
              seed = ?, play_time_ticks = ?, spawn_x = ?, spawn_y = ?, spawn_z = ?,
              health = ?, hunger = ?, level = ?, xp = ?, food_eaten = ?,
              beds_slept_in = ?, deaths = ?, blocks_mined = ?, blocks_placed = ?,
              items_crafted = ?, mobs_killed = ?, damage_taken = ?,
              last_played = ?, instance_name = ?, mod_loader = ?, loader_version = ?,
              game_version = ?, instance_type = ?, launcher = ?, updated_at = NOW()
            WHERE id = ? AND user_uuid = ?
          `;
          await pool.query(updateQuery, [
            save.world_name, save.version, save.game_mode, save.difficulty,
            save.seed, save.play_time_ticks, save.spawn_x, save.spawn_y, save.spawn_z,
            save.health || null, save.hunger || null, save.level || null, save.xp || null,
            save.food_eaten || null, save.beds_slept_in || null, save.deaths || null,
            save.blocks_mined || null, save.blocks_placed || null, save.items_crafted || null,
            save.mobs_killed || null, save.damage_taken || null,
            save.last_played || null, save.instance_name || null, save.mod_loader || null,
            save.loader_version || null, save.game_version || null, save.instance_type || null,
            save.launcher || null, save.id, userUuid
          ]);
          console.log(`  ✏️ Updated save: ${save.id}`);
          updated++;
        } else {
          const insertQuery = `
            INSERT INTO saves (
              id, user_uuid, folder_id, world_name, file_path, version, game_mode,
              difficulty, seed, play_time_ticks, spawn_x, spawn_y, spawn_z,
              health, hunger, level, xp, food_eaten, beds_slept_in, deaths,
              blocks_mined, blocks_placed, items_crafted, mobs_killed, damage_taken,
              last_played, instance_name, mod_loader, loader_version, game_version,
              instance_type, launcher
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          await pool.query(insertQuery, [
            save.id, userUuid, save.folder_id || null, save.world_name, filePath,
            save.version, save.game_mode, save.difficulty || null, save.seed || null,
            save.play_time_ticks || 0, save.spawn_x || null, save.spawn_y || null, save.spawn_z || null,
            save.health || null, save.hunger || null, save.level || null, save.xp || null,
            save.food_eaten || null, save.beds_slept_in || null, save.deaths || null,
            save.blocks_mined || null, save.blocks_placed || null, save.items_crafted || null,
            save.mobs_killed || null, save.damage_taken || null,
            save.last_played || null, save.instance_name || null, save.mod_loader || null,
            save.loader_version || null, save.game_version || null, save.instance_type || null,
            save.launcher || null
          ]);
          console.log(`  ✨ Inserted new save: ${save.id}`);
          inserted++;
        }
      }

      console.log(`✅ [batchUpsertSaves] Complete: ${inserted} inserted, ${updated} updated`);
      return {
        inserted,
        updated,
        message: `Synced ${inserted + updated} saves (${inserted} new, ${updated} updated)`
      };
    },

    createFolder: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { folder_path, display_name } = args;
      console.log(`📂 createFolder resolver - args:`, args);
      const id = require('crypto').randomUUID();

      const query = `
        INSERT INTO save_folders (id, user_uuid, folder_path, display_name)
        VALUES (?, ?, ?, ?)
      `;
      await pool.query(query, [id, req.user.uuid, folder_path, display_name]);

      return {
        id,
        user_uuid: req.user.uuid,
        folder_path,
        display_name,
        created_at: new Date().toISOString()
      };
    },

    deleteFolder: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const query = 'DELETE FROM save_folders WHERE id = ? AND user_uuid = ?';
      await pool.query(query, [args.id, req.user.uuid]);
      return true;
    },

    addFavorite: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const query = `
        INSERT OR IGNORE INTO favorites (user_uuid, instance_folder_id)
        VALUES (?, ?)
      `;
      await pool.query(query, [req.user.uuid, args.instanceFolderId]);
      return true;
    },

    removeFavorite: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const query = 'DELETE FROM favorites WHERE user_uuid = ? AND instance_folder_id = ?';
      await pool.query(query, [req.user.uuid, args.instanceFolderId]);
      return true;
    },

    createTag: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { name, color } = args;
      const id = randomUUID();

      const query = `
        INSERT INTO tags (id, user_uuid, name, color)
        VALUES (?, ?, ?, ?)
      `;
      await pool.query(query, [id, req.user.uuid, name, color || null]);

      const selectQuery = 'SELECT * FROM tags WHERE id = ?';
      const result = await pool.query(selectQuery, [id]);
      return result.rows?.[0];
    },

    updateTag: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { id, name, color } = args;

      // Verify ownership
      const checkQuery = 'SELECT * FROM tags WHERE id = ? AND user_uuid = ?';
      const checkResult = await pool.query(checkQuery, [id, req.user.uuid]);
      if (!checkResult.rows?.[0]) throw new Error('Tag not found');

      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (color !== undefined) {
        updates.push('color = ?');
        values.push(color);
      }

      if (updates.length === 0) throw new Error('No fields to update');

      values.push(id);
      const query = `UPDATE tags SET ${updates.join(', ')} WHERE id = ?`;
      await pool.query(query, values);

      const selectQuery = 'SELECT * FROM tags WHERE id = ?';
      const result = await pool.query(selectQuery, [id]);
      return result.rows?.[0];
    },

    deleteTag: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { id } = args;

      // Verify ownership
      const checkQuery = 'SELECT * FROM tags WHERE id = ? AND user_uuid = ?';
      const checkResult = await pool.query(checkQuery, [id, req.user.uuid]);
      if (!checkResult.rows?.[0]) throw new Error('Tag not found');

      const query = 'DELETE FROM tags WHERE id = ?';
      await pool.query(query, [id]);

      return true;
    },

    createNote: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { saveId, data } = args;
      const { title, content, note_type, timestamp, tag_ids } = data;

      if (!content) throw new Error('Note content required');

      // Verify save ownership
      const saveQuery = 'SELECT * FROM saves WHERE id = ? AND user_uuid = ?';
      const saveResult = await pool.query(saveQuery, [saveId, req.user.uuid]);
      if (!saveResult.rows?.[0]) throw new Error('Save not found');

      const noteId = randomUUID();
      const noteTimestamp = timestamp ? new Date(timestamp) : new Date();

      const insertQuery = `
        INSERT INTO notes (id, save_id, title, content, note_type, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      await pool.query(insertQuery, [
        noteId,
        saveId,
        title || null,
        content,
        note_type || 'general',
        noteTimestamp,
      ]);

      // Add tags
      if (Array.isArray(tag_ids) && tag_ids.length > 0) {
        for (const tagId of tag_ids) {
          const tagQuery = 'INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)';
          await pool.query(tagQuery, [noteId, tagId]);
        }
      }

      return await getNoteWithTags(noteId);
    },

    updateNote: async (parent: any, args: any, context: any) => {
      const { id, data } = args;
      const { title, content, note_type, timestamp, tag_ids } = data;

      const note = await getNoteWithTags(id);
      if (!note) throw new Error('Note not found');

      const updates: string[] = [];
      const values: any[] = [];

      if (title !== undefined) {
        updates.push('title = ?');
        values.push(title);
      }
      if (content !== undefined) {
        updates.push('content = ?');
        values.push(content);
      }
      if (note_type !== undefined) {
        updates.push('note_type = ?');
        values.push(note_type);
      }
      if (timestamp !== undefined) {
        updates.push('timestamp = ?');
        values.push(new Date(timestamp));
      }

      if (updates.length > 0) {
        updates.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);
        const query = `UPDATE notes SET ${updates.join(', ')} WHERE id = ?`;
        await pool.query(query, values);
      }

      // Update tags
      if (Array.isArray(tag_ids)) {
        const removeQuery = 'DELETE FROM note_tags WHERE note_id = ?';
        await pool.query(removeQuery, [id]);

        for (const tagId of tag_ids) {
          const addQuery = 'INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)';
          await pool.query(addQuery, [id, tagId]);
        }
      }

      return await getNoteWithTags(id);
    },

    deleteNote: async (parent: any, args: any, context: any) => {
      const { id } = args;

      const note = await getNoteWithTags(id);
      if (!note) throw new Error('Note not found');

      const query = 'UPDATE notes SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?';
      await pool.query(query, [id]);

      return true;
    },

    addNoteTag: async (parent: any, args: any, context: any) => {
      const { noteId, tagId } = args;

      const noteQuery = 'SELECT * FROM notes WHERE id = ?';
      const noteResult = await pool.query(noteQuery, [noteId]);
      if (!noteResult.rows?.[0]) throw new Error('Note not found');

      const query = 'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)';
      await pool.query(query, [noteId, tagId]);

      return true;
    },

    removeNoteTag: async (parent: any, args: any, context: any) => {
      const { noteId, tagId } = args;

      const query = 'DELETE FROM note_tags WHERE note_id = ? AND tag_id = ?';
      await pool.query(query, [noteId, tagId]);

      return true;
    },

    createMilestone: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { saveId, data } = args;
      const { name, description, target_play_time_ticks, position } = data;

      // Verify save ownership
      const saveQuery = 'SELECT * FROM saves WHERE id = ? AND user_uuid = ?';
      const saveResult = await pool.query(saveQuery, [saveId, req.user.uuid]);
      if (!saveResult.rows?.[0]) throw new Error('Save not found');

      const id = randomUUID();
      const query = `
        INSERT INTO milestones (id, save_id, name, description, target_play_time_ticks, position)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      await pool.query(query, [
        id,
        saveId,
        name,
        description || null,
        target_play_time_ticks || null,
        position || 0,
      ]);

      const selectQuery = 'SELECT * FROM milestones WHERE id = ?';
      const result = await pool.query(selectQuery, [id]);
      return result.rows?.[0];
    },

    updateMilestone: async (parent: any, args: any, context: any) => {
      const { id, data } = args;
      const { name, description, target_play_time_ticks, position, achieved_at } = data;

      const checkQuery = 'SELECT * FROM milestones WHERE id = ?';
      const checkResult = await pool.query(checkQuery, [id]);
      if (!checkResult.rows?.[0]) throw new Error('Milestone not found');

      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (target_play_time_ticks !== undefined) {
        updates.push('target_play_time_ticks = ?');
        values.push(target_play_time_ticks);
      }
      if (position !== undefined) {
        updates.push('position = ?');
        values.push(position);
      }
      if (achieved_at !== undefined) {
        updates.push('achieved_at = ?');
        values.push(achieved_at ? new Date(achieved_at) : null);
      }

      if (updates.length === 0) throw new Error('No fields to update');

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      const query = `UPDATE milestones SET ${updates.join(', ')} WHERE id = ?`;
      await pool.query(query, values);

      const selectQuery = 'SELECT * FROM milestones WHERE id = ?';
      const result = await pool.query(selectQuery, [id]);
      return result.rows?.[0];
    },

    deleteMilestone: async (parent: any, args: any, context: any) => {
      const { id } = args;

      const checkQuery = 'SELECT * FROM milestones WHERE id = ?';
      const checkResult = await pool.query(checkQuery, [id]);
      if (!checkResult.rows?.[0]) throw new Error('Milestone not found');

      const query = 'DELETE FROM milestones WHERE id = ?';
      await pool.query(query, [id]);

      return true;
    },

    createMetadata: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { saveId, data } = args;

      // Verify save ownership
      const saveQuery = 'SELECT * FROM saves WHERE id = ? AND user_uuid = ?';
      const saveResult = await pool.query(saveQuery, [saveId, req.user.uuid]);
      if (!saveResult.rows?.[0]) throw new Error('Save not found');

      const {
        description,
        is_favorite,
        theme_color,
        world_type,
        modpack_name,
        modpack_version,
        project_id,
      } = data;

      const query = `
        INSERT INTO world_metadata (
          save_id, description, is_favorite, theme_color, world_type,
          modpack_name, modpack_version, project_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await pool.query(query, [
        saveId,
        description || null,
        is_favorite || false,
        theme_color || '#64748b',
        world_type || 'survival',
        modpack_name || null,
        modpack_version || null,
        project_id || null,
      ]);

      const selectQuery = 'SELECT * FROM world_metadata WHERE save_id = ?';
      const result = await pool.query(selectQuery, [saveId]);
      return result.rows?.[0];
    },

    updateMetadata: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { saveId, data } = args;

      // Verify save ownership
      const saveQuery = 'SELECT * FROM saves WHERE id = ? AND user_uuid = ?';
      const saveResult = await pool.query(saveQuery, [saveId, req.user.uuid]);
      if (!saveResult.rows?.[0]) throw new Error('Save not found');

      const {
        description,
        is_favorite,
        theme_color,
        world_type,
        modpack_name,
        modpack_version,
        project_id,
      } = data;

      const updates: string[] = [];
      const values: any[] = [];

      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (is_favorite !== undefined) {
        updates.push('is_favorite = ?');
        values.push(is_favorite);
      }
      if (theme_color !== undefined) {
        updates.push('theme_color = ?');
        values.push(theme_color);
      }
      if (world_type !== undefined) {
        updates.push('world_type = ?');
        values.push(world_type);
      }
      if (modpack_name !== undefined) {
        updates.push('modpack_name = ?');
        values.push(modpack_name);
      }
      if (modpack_version !== undefined) {
        updates.push('modpack_version = ?');
        values.push(modpack_version);
      }
      if (project_id !== undefined) {
        updates.push('project_id = ?');
        values.push(project_id);
      }

      if (updates.length === 0) {
        const selectQuery = 'SELECT * FROM world_metadata WHERE save_id = ?';
        const result = await pool.query(selectQuery, [saveId]);
        return result.rows?.[0];
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(saveId);
      const query = `UPDATE world_metadata SET ${updates.join(', ')} WHERE save_id = ?`;
      await pool.query(query, values);

      const selectQuery = 'SELECT * FROM world_metadata WHERE save_id = ?';
      const result = await pool.query(selectQuery, [saveId]);
      return result.rows?.[0];
    }
  }
};
