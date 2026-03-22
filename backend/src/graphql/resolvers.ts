import pool from '../db/connection';
import { AuthenticatedRequest } from '../middleware/auth';

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
    }
  },

  Mutation: {
    batchUpsertSaves: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const { saves } = args;
      if (!Array.isArray(saves) || saves.length === 0) {
        throw new Error('saves array required');
      }

      let inserted = 0;
      let updated = 0;

      for (const save of saves) {
        const checkQuery = 'SELECT id FROM saves WHERE id = ? AND user_uuid = ?';
        const existing = await pool.query(checkQuery, [save.id, req.user.uuid]);

        if (existing.rows && existing.rows.length > 0) {
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
            save.mobs_killed || null, save.damage_taken || null, save.id, req.user.uuid
          ]);
          updated++;
        } else {
          const insertQuery = `
            INSERT INTO saves (
              id, user_uuid, folder_id, world_name, file_path, version, game_mode,
              difficulty, seed, play_time_ticks, spawn_x, spawn_y, spawn_z,
              health, hunger, level, xp, food_eaten, beds_slept_in, deaths,
              blocks_mined, blocks_placed, items_crafted, mobs_killed, damage_taken
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          await pool.query(insertQuery, [
            save.id, req.user.uuid, save.folder_id || null, save.world_name, save.file_path || '',
            save.version, save.game_mode, save.difficulty || null, save.seed || null,
            save.play_time_ticks || 0, save.spawn_x || null, save.spawn_y || null, save.spawn_z || null,
            save.health || null, save.hunger || null, save.level || null, save.xp || null,
            save.food_eaten || null, save.beds_slept_in || null, save.deaths || null,
            save.blocks_mined || null, save.blocks_placed || null, save.items_crafted || null,
            save.mobs_killed || null, save.damage_taken || null
          ]);
          inserted++;
        }
      }

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

    getFavorites: async (parent: any, args: any, context: any) => {
      const req = context.req as AuthenticatedRequest;
      if (!req.user) throw new Error('Not authenticated');

      const query = 'SELECT instance_folder_id FROM favorites WHERE user_uuid = ?';
      const result = await pool.query(query, [req.user.uuid]);
      return (result.rows || []).map((r: any) => r.instance_folder_id);
    }
  }
};
