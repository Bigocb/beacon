import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { parseNBT, extractPlayerDataFromSave, extractAllPlayerData } from './nbt-parser';
import { getMinecraftSavesPath } from './profiles';
import { detectLauncherAndGetSavesPath } from './instance-metadata';

// Generate deterministic ID from user_uuid, folder_id, and world_name
function generateSaveId(userUuid: string, folderId: string | undefined, worldName: string): string {
  const combined = `${userUuid}:${folderId || 'default'}:${worldName}`;
  return crypto.createHash('md5').update(combined).digest('hex');
}

// Read and extract statistics from stats/*.json file
function extractStatsFromSave(savePath: string): Partial<Save> {
  try {
    const statsDir = path.join(savePath, 'stats');
    if (!fs.existsSync(statsDir)) {
      return {};
    }

    // Find the first (and usually only) stats JSON file
    const files = fs.readdirSync(statsDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
      return {};
    }

    const statsPath = path.join(statsDir, files[0]);
    const statsContent = fs.readFileSync(statsPath, 'utf-8');
    const stats = JSON.parse(statsContent);

    // Extract relevant statistics
    const custom = stats['minecraft:custom'] || {};
    const mined = stats['minecraft:mined'] || {};
    const placed = stats['minecraft:placed'] || {};
    const crafted = stats['minecraft:crafted'] || {};
    const killed = stats['minecraft:killed'] || {};

    return {
      food_eaten: custom['minecraft:eat_cake_slice'] || custom['minecraft:food_eaten'] || 0,
      beds_slept_in: custom['minecraft:sleep_in_bed'] || 0,
      deaths: custom['minecraft:deaths'] || 0,
      damage_taken: (custom['minecraft:damage_taken'] || 0) / 10, // Convert to half-hearts
      blocks_mined: Object.values(mined).reduce((sum: number, count: any) => sum + (count as number), 0) || 0,
      blocks_placed: Object.values(placed).reduce((sum: number, count: any) => sum + (count as number), 0) || 0,
      items_crafted: Object.values(crafted).reduce((sum: number, count: any) => sum + (count as number), 0) || 0,
      mobs_killed: Object.values(killed).reduce((sum: number, count: any) => sum + (count as number), 0) || 0,
    };
  } catch (error) {
    console.error(`Error extracting stats from ${savePath}:`, error);
    return {};
  }
}

export interface PlayerStats {
  uuid: string;
  name?: string;
  health?: number;
  hunger?: number;
  level?: number;
  xp?: number;
}

export interface Save {
  id: string;
  user_uuid: string;
  folder_id?: string;
  world_name: string;
  file_path: string;
  version: string;
  game_mode: string;
  difficulty?: number;
  seed?: number;
  play_time_ticks?: number;
  spawn_x?: number;
  spawn_y?: number;
  spawn_z?: number;
  last_played: Date;
  created_at: Date;
  updated_at: Date;
  notes?: string;
  status?: string;
  // Player Status (deprecated - use players array)
  health?: number;
  hunger?: number;
  level?: number;
  xp?: number;
  // Player Statistics
  food_eaten?: number;
  beds_slept_in?: number;
  deaths?: number;
  blocks_mined?: number;
  blocks_placed?: number;
  items_crafted?: number;
  mobs_killed?: number;
  damage_taken?: number;
  // Multiple player support
  players?: PlayerStats[];
  player_count?: number;
}

export async function scanMinecraftSaves(minecraftUuid: string): Promise<Save[]> {
  const savesPath = getMinecraftSavesPath();

  if (!fs.existsSync(savesPath)) {
    console.warn(`Minecraft saves directory not found: ${savesPath}`);
    return [];
  }

  return scanFolder(savesPath, minecraftUuid);
}

export async function scanMinecraftSavesFromFolders(minecraftUuid: string, folders: Array<{ id: string; path: string }>): Promise<Save[]> {
  const saves: Save[] = [];

  for (const folder of folders) {
    if (fs.existsSync(folder.path)) {
      // Detect launcher type and get the correct saves path
      const { savesPath } = detectLauncherAndGetSavesPath(folder.path);

      if (fs.existsSync(savesPath)) {
        const folderSaves = await scanFolder(savesPath, minecraftUuid, folder.id);
        saves.push(...folderSaves);
      } else {
        console.warn(`Save folder does not exist at: ${savesPath}`);
      }
    } else {
      console.warn(`Configured instance folder does not exist: ${folder.path}`);
    }
  }

  return saves;
}

export async function scanFolder(savesPath: string, minecraftUuid: string, folderId?: string): Promise<Save[]> {
  if (!fs.existsSync(savesPath)) {
    console.warn(`Minecraft saves directory not found: ${savesPath}`);
    return [];
  }

  const folders = fs
    .readdirSync(savesPath)
    .filter((f) => {
      const fullPath = path.join(savesPath, f);
      try {
        return fs.statSync(fullPath).isDirectory();
      } catch {
        return false;
      }
    });

  const saves: Save[] = [];

  for (const folder of folders) {
    try {
      const levelDatPath = path.join(savesPath, folder, 'level.dat');

      if (!fs.existsSync(levelDatPath)) {
        console.warn(`No level.dat found in ${folder}, skipping`);
        continue;
      }

      const metadata = parseNBT(levelDatPath);
      const stats = fs.statSync(levelDatPath);
      const savePath = path.join(savesPath, folder);
      const statsData = extractStatsFromSave(savePath);

      // Extract data from all players in the save
      const allPlayersData = extractAllPlayerData(savePath);
      console.log(`🎮 Save "${folder}" - Found ${allPlayersData.length} player(s)`);

      // Use main player for legacy fields, but store all players
      const mainPlayerData = allPlayersData.length > 0 ? allPlayersData[0].data : {};

      const save: Save = {
        id: generateSaveId(minecraftUuid, folderId, folder),
        user_uuid: minecraftUuid,
        folder_id: folderId,
        world_name: folder,
        file_path: savePath,
        version: metadata.version || 'unknown',
        game_mode: metadata.gameType || 'unknown',
        difficulty: metadata.difficulty,
        seed: metadata.seed,
        play_time_ticks: metadata.dayTime,
        spawn_x: metadata.spawnX,
        spawn_y: metadata.spawnY,
        spawn_z: metadata.spawnZ,
        last_played: stats.mtime,
        created_at: new Date(),
        updated_at: new Date(),
        // Player Status (from main player in playerdata/{uuid}.dat)
        health: mainPlayerData.health ?? 20,
        hunger: mainPlayerData.hunger ?? 20,
        level: mainPlayerData.level ?? 0,
        xp: mainPlayerData.xp ?? 0,
        // Player Statistics (from stats/{uuid}.json)
        food_eaten: statsData.food_eaten ?? 0,
        beds_slept_in: statsData.beds_slept_in ?? 0,
        deaths: statsData.deaths ?? 0,
        blocks_mined: statsData.blocks_mined ?? 0,
        blocks_placed: statsData.blocks_placed ?? 0,
        items_crafted: statsData.items_crafted ?? 0,
        mobs_killed: statsData.mobs_killed ?? 0,
        damage_taken: statsData.damage_taken ?? 0,
        // Multiple player support
        players: allPlayersData.map(p => ({
          uuid: p.uuid,
          name: p.name,
          health: p.data.health,
          hunger: p.data.hunger,
          level: p.data.level,
          xp: p.data.xp,
        })),
        player_count: allPlayersData.length,
      };

      saves.push(save);
    } catch (error) {
      console.error(`Error scanning save folder ${folder}:`, error);
      // Continue with next folder
    }
  }

  return saves;
}

export async function getSaveDetails(
  savePath: string
): Promise<Partial<Save> | null> {
  try {
    const levelDatPath = path.join(savePath, 'level.dat');

    if (!fs.existsSync(levelDatPath)) {
      return null;
    }

    const metadata = parseNBT(levelDatPath);
    const stats = fs.statSync(levelDatPath);

    return {
      version: metadata.version || 'unknown',
      game_mode: metadata.gameType || 'unknown',
      difficulty: metadata.difficulty,
      seed: metadata.seed,
      play_time_ticks: metadata.dayTime,
      spawn_x: metadata.spawnX,
      spawn_y: metadata.spawnY,
      spawn_z: metadata.spawnZ,
      last_played: stats.mtime,
      updated_at: new Date(),
    };
  } catch (error) {
    console.error(`Error getting save details for ${savePath}:`, error);
    return null;
  }
}
