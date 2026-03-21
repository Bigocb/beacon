/**
 * Utility functions to extract Minecraft save data from NBT files
 * This bridges between raw Minecraft files and our SaveAnalyticsData interface
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as nbt from 'prismarine-nbt';
import { parsePlayerData, PlayerData, parseInventory, parseArmorItems, parseEffects } from '../scanner/player-parser';

/**
 * Map Minecraft dimension IDs to readable names
 */
function getDimensionName(dimensionId: string): string {
  if (!dimensionId) return 'Unknown';

  const dimensionMap: Record<string, string> = {
    'minecraft:overworld': 'Overworld',
    'minecraft:the_nether': 'Nether',
    'minecraft:the_end': 'End',
    'minecraft:nether': 'Nether', // Alternative format
    'minecraft:end': 'End', // Alternative format
    '0': 'Overworld', // Numeric IDs
    '1': 'End',
    '-1': 'Nether',
  };

  return dimensionMap[dimensionId.toLowerCase()] || dimensionId;
}

export interface RawSaveData {
  id: string;
  name: string;
  folderName: string;
  path: string;
}

/**
 * Parse level.dat (NBT format) - this is a simplified version
 * In production, you'd use a proper NBT parser library
 */
export async function extractWorldData(savePath: string): Promise<any> {
  try {
    // Read level.dat
    const levelDatPath = path.join(savePath, 'level.dat');

    // This would require an NBT parser - for now, return placeholder structure
    // In real implementation, use a library like 'prismarine-nbt' or 'minecraft-nbt'
    return {
      gameMode: 0, // 0=survival, 1=creative, 2=adventure, 3=spectator
      difficulty: 2,
      seed: '0',
      spawnX: 0,
      spawnY: 64,
      spawnZ: 0,
      dayTime: 0,
      raining: false,
      thundering: false,
      cheatsAllowed: false,
      difficultyLocked: false,
      datapacks: [],
    };
  } catch (error) {
    console.error('Error extracting world data:', error);
    return null;
  }
}

/**
 * Extract player data from level.dat (contains active player data)
 */
async function extractPlayerDataFromLevelDat(savePath: string, uuid: string): Promise<PlayerData | null> {
  try {
    const levelDatPath = path.join(savePath, 'level.dat');
    console.log(`📂 Attempting to read player data from level.dat: ${levelDatPath}`);

    // Check if level.dat exists
    await fs.access(levelDatPath);

    // Read and parse level.dat
    const buffer = await fs.readFile(levelDatPath);
    const nbtResult = await nbt.parse(buffer);
    const data = nbt.simplify(nbtResult.parsed) as any;

    // Check for singleplayer_uuid (MC 26.1+) or Player compound (MC < 26.1)
    console.log('🔍 Checking level.dat structure...');
    console.log('📋 Top-level Data keys:', Object.keys(data.Data || {}).slice(0, 10));

    let playerData = data.Data?.Player;
    if (!playerData) {
      console.warn('⚠️ No Player compound found (may be MC 26.1+)');
      console.log('🎮 Checking for singleplayer_uuid:', data.Data?.singleplayer_uuid);
      console.warn('❌ Cannot extract player data - no Player compound in level.dat');
      return null;
    }

    console.log(`✅ Successfully read player data from level.dat`);
    console.log('🔍 Player data keys:', Object.keys(playerData).slice(0, 20));
    console.log('📦 Inventory:', playerData.Inventory);
    console.log('🛡️ ArmorItems:', playerData.ArmorItems);
    console.log('✨ ActiveEffects:', playerData.ActiveEffects);
    console.log('📊 Full inventory array:', JSON.stringify(playerData.Inventory));

    // Extract player info (same structure as playerdata files)
    const health = playerData.Health ?? 20;
    const hunger = playerData.foodLevel ?? 20;
    const saturation = playerData.foodSaturationLevel ?? 0;
    const xpLevel = playerData.XpLevel ?? 0;
    const xpProgress = playerData.XpP ?? 0;

    // Position
    const posArray = playerData.Pos ?? [0, 64, 0];
    const position = {
      x: typeof posArray[0] === 'object' ? posArray[0].value || 0 : posArray[0],
      y: typeof posArray[1] === 'object' ? posArray[1].value || 64 : posArray[1],
      z: typeof posArray[2] === 'object' ? posArray[2].value || 0 : posArray[2],
    };

    // Rotation (Yaw, Pitch)
    const rotArray = playerData.Rotation ?? [0, 0];
    const rotation = {
      yaw: typeof rotArray[0] === 'object' ? rotArray[0].value || 0 : rotArray[0],
      pitch: typeof rotArray[1] === 'object' ? rotArray[1].value || 0 : rotArray[1],
    };

    // Game mode
    const gamemode = playerData.playerGameType ?? 0;

    // Dimension (extract from player data or level data)
    const dimensionId = playerData.Dimension ?? data.Data?.WorldGenSettings?.dimensions?.[0] ?? 'minecraft:overworld';
    const dimension = getDimensionName(dimensionId);

    // Inventory and armor
    const inventory = parseInventory(playerData.Inventory || []);
    const armor = parseArmorItems(playerData.ArmorItems || []);
    const effects = parseEffects(playerData.ActiveEffects || []);

    console.log(`🌍 Extracted dimension: ${dimension} (${dimensionId})`);

    return {
      uuid,
      health,
      hunger,
      saturation,
      xpLevel,
      xpProgress,
      position,
      rotation,
      inventory,
      armor,
      effects,
      gamemode,
      alwaysShowName: playerData.CustomNameVisible ?? false,
      dimension,
    };
  } catch (error: any) {
    console.warn(`⚠️ Could not read from level.dat:`, error?.message || error);
    return null;
  }
}

/**
 * Extract player data (inventory, stats, advancements)
 * Uses HYBRID approach:
 * - Level.dat for POSITION & HEALTH (current)
 * - Playerdata/*.dat for INVENTORY & EFFECTS (modded MC doesn't include these in level.dat)
 */
export async function extractPlayerData(savePath: string, uuid: string): Promise<PlayerData | null> {
  try {
    // Step 1: Try to get current position/health from level.dat
    const levelDatData = await extractPlayerDataFromLevelDat(savePath, uuid);

    if (!levelDatData) {
      // If level.dat doesn't work, try playerdata/*.dat
      console.log('⚠️ Level.dat failed, trying playerdata directory...');
      const playerDataPath = path.join(savePath, 'playerdata', `${uuid}.dat`);
      return await parsePlayerData(playerDataPath, uuid);
    }

    // Step 2: Try to get inventory/armor/effects from playerdata/*.dat
    console.log('📂 Attempting to enrich level.dat data with playerdata inventory...');
    try {
      const playerDataPath = path.join(savePath, 'playerdata', `${uuid}.dat`);
      const playerDatData = await parsePlayerData(playerDataPath, uuid);

      if (playerDatData && (playerDatData.inventory.length > 0 || playerDatData.armor.length > 0 || playerDatData.effects.length > 0)) {
        // Merge: use position/health from level.dat (current) + inventory from playerdata (complete)
        console.log('✅ Merged: Using position/health from level.dat + inventory from playerdata');
        return {
          ...levelDatData,
          inventory: playerDatData.inventory,
          armor: playerDatData.armor,
          effects: playerDatData.effects,
        };
      }
    } catch (playerDatError) {
      console.warn('⚠️ Could not read playerdata/*.dat, using level.dat only:', playerDatError instanceof Error ? playerDatError.message : playerDatError);
    }

    // If playerdata doesn't have inventory either, just use level.dat
    console.log('✅ Using level.dat data (no playerdata inventory found)');
    return levelDatData;
  } catch (error) {
    console.error('Error extracting player data:', error);
    return null;
  }
}

/**
 * Get list of all players in a save (by UUID)
 */
export async function getPlayerList(savePath: string): Promise<string[]> {
  try {
    const playerDataPath = path.join(savePath, 'playerdata');
    console.log(`📂 Checking playerdata at: ${playerDataPath}`);

    // Check if playerdata directory exists
    const exists = await fs
      .access(playerDataPath)
      .then(() => true)
      .catch(() => false);

    if (!exists) {
      console.warn(`❌ No playerdata directory found at ${playerDataPath}`);
      return [];
    }

    const entries = await fs.readdir(playerDataPath, { withFileTypes: true });
    console.log(`📄 Found ${entries.length} entries in playerdata`);

    // Extract UUIDs from .dat filenames
    const uuids = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.dat'))
      .map((entry) => entry.name.replace('.dat', ''));

    console.log(`✅ Extracted ${uuids.length} player UUIDs: ${uuids.slice(0, 3).join(', ')}${uuids.length > 3 ? '...' : ''}`);
    return uuids;
  } catch (error) {
    console.error('❌ Error getting player list:', error);
    return [];
  }
}

/**
 * Extract advancement data
 */
export async function extractAdvancementData(savePath: string, uuid: string): Promise<any> {
  try {
    const advancementsPath = path.join(savePath, 'advancements', `${uuid}.json`);
    const content = await fs.readFile(advancementsPath, 'utf-8');
    const data = JSON.parse(content);

    // Count completed advancements
    const completed = Object.entries(data).filter(
      ([_, value]: [string, any]) => value.done === true
    ).length;

    // Count recipes unlocked (advancements that are recipes)
    const recipesUnlocked = Object.entries(data).filter(
      ([key, value]: [string, any]) =>
        key.includes('recipes/') && value.done === true
    ).length;

    console.log(`📋 Recipes found in advancements: ${recipesUnlocked}`);

    return {
      completed,
      total: Object.keys(data).length,
      recipesUnlocked,
      advancements: data,
    };
  } catch (error) {
    console.error('❌ Error extracting advancement data:', error);
    return {
      completed: 0,
      total: 0,
      recipesUnlocked: 0,
      advancements: {},
    };
  }
}

/**
 * Extract statistics data
 */
export async function extractStatisticsData(savePath: string, uuid: string): Promise<any> {
  try {
    const statsPath = path.join(savePath, 'stats', `${uuid}.json`);
    console.log(`📊 Reading statistics from: ${statsPath}`);

    const content = await fs.readFile(statsPath, 'utf-8');
    console.log(`📄 Statistics file size: ${content.length} bytes`);

    const parsed = JSON.parse(content);
    console.log(`✅ Parsed stats, keys:`, Object.keys(parsed));

    // Minecraft stores stats in a nested 'stats' object
    const stats = parsed.stats || parsed;
    console.log(`🔍 Actual stats object keys:`, Object.keys(stats).slice(0, 10));

    // Map to our stat structure
    // PlayTime is in ticks (20 ticks = 1 second)
    const playtimeTicks = stats['minecraft:custom']?.['minecraft:play_time'] ?? 0;
    const playtimeSeconds = Math.round(playtimeTicks / 20);

    console.log(`⏱️ Playtime from stats - Ticks: ${playtimeTicks}, Seconds: ${playtimeSeconds}`);

    const result = {
      playtimeSeconds, // Add playtime to statistics
      totalDistance: (stats['minecraft:custom']?.['minecraft:walk_one_cm'] ?? 0) / 100,
      blocksMined: stats['minecraft:mined']
        ? Object.values(stats['minecraft:mined']).reduce((a: number, b: any) => a + b, 0)
        : 0,
      blocksPlaced: stats['minecraft:placed']
        ? Object.values(stats['minecraft:placed']).reduce((a: number, b: any) => a + b, 0)
        : 0,
      itemsCrafted: stats['minecraft:crafted']
        ? Object.values(stats['minecraft:crafted']).reduce((a: number, b: any) => a + b, 0)
        : 0,
      mobsKilled: stats['minecraft:killed']
        ? Object.values(stats['minecraft:killed']).reduce((a: number, b: any) => a + b, 0)
        : 0,
      deaths: stats['minecraft:custom']?.['minecraft:deaths'] ?? 0,
      damageTaken: (stats['minecraft:custom']?.['minecraft:damage_taken'] ?? 0) / 10, // In half-hearts
      foodEaten: stats['minecraft:custom']?.['minecraft:eat_cake_slice'] ?? 0,
      bedsSleptIn: stats['minecraft:custom']?.['minecraft:sleep_in_bed'] ?? 0,
      jumps: stats['minecraft:custom']?.['minecraft:jump'] ?? 0,
      swims: (stats['minecraft:custom']?.['minecraft:swim_one_cm'] ?? 0) / 100,
    };
    console.log(`📊 Extracted statistics:`, result);
    return result;
  } catch (error: any) {
    console.error(`❌ Error extracting statistics for ${uuid}:`, error?.message || error);
    console.error(`📍 Stats file location attempted: ${path.join(savePath, 'stats', `${uuid}.json`)}`);
    return {
      totalDistance: 0,
      blocksMined: 0,
      blocksPlaced: 0,
      itemsCrafted: 0,
      mobsKilled: 0,
      deaths: 0,
      damageTaken: 0,
      foodEaten: 0,
      bedsSleptIn: 0,
      jumps: 0,
      swims: 0,
    };
  }
}

/**
 * Extract exploration data (dimensions visited, structures discovered)
 */
export async function extractExplorationData(savePath: string, uuid: string): Promise<any> {
  try {
    const advancementsPath = path.join(savePath, 'advancements', `${uuid}.json`);
    const content = await fs.readFile(advancementsPath, 'utf-8');
    const advancements = JSON.parse(content);

    // Track dimensions visited by looking for dimension-specific advancements
    const dimensionsVisited = new Set<string>();
    const structuresDiscovered = new Set<string>();

    Object.entries(advancements).forEach(([key, value]: [string, any]) => {
      if (value.done !== true) return;

      // Detect dimensions from advancement names
      if (key.includes('adventure/adventuring_time')) {
        // This advancement tracks biomes visited across dimensions
        if (value.criteria) {
          Object.keys(value.criteria).forEach(biome => {
            if (biome.includes('nether')) dimensionsVisited.add('Nether');
            if (biome.includes('end')) dimensionsVisited.add('End');
            if (!biome.includes('nether') && !biome.includes('end')) dimensionsVisited.add('Overworld');
          });
        }
      }

      // Detect structures from advancement names
      if (key.includes('husbandry/') || key.includes('adventure/') || key.includes('nether/')) {
        const structureName = key.split('/').pop() || '';

        // Map common structure advancements
        const structureMap: Record<string, string> = {
          'voluntary_exile': 'Pillager Outpost',
          'spiky_climb': 'Spikes (Cactus)',
          'summon_warden': 'Deep Dark',
          'root': 'Started',
          'kill_warden': 'Warden',
          'lightning_rod_with_red_candle': 'Lightning Rod Setup',
          'sneak_and_peek': 'Stronghold',
          'bullseye': 'Target Practice',
        };

        if (structureMap[structureName]) {
          structuresDiscovered.add(structureMap[structureName]);
        }
      }
    });

    // If no dimensions detected, assume Overworld at minimum
    if (dimensionsVisited.size === 0) {
      dimensionsVisited.add('Overworld');
    }

    // Calculate exploration percentage (simplified: based on advancements)
    const totalAdvancements = Object.keys(advancements).length;
    const completedAdvancements = Object.values(advancements).filter((a: any) => a.done === true).length;
    const exploredPercent = totalAdvancements > 0 ? Math.round((completedAdvancements / totalAdvancements) * 100) : 0;

    console.log(`🗺️ Exploration data extracted - Explored: ${exploredPercent}%, Dimensions: ${Array.from(dimensionsVisited).join(', ')}, Structures: ${structuresDiscovered.size}`);

    return {
      explored: exploredPercent,
      dimensionsVisited: Array.from(dimensionsVisited),
      structuresDiscovered: Array.from(structuresDiscovered),
    };
  } catch (error) {
    console.error('❌ Error extracting exploration data:', error);
    return {
      explored: 0,
      dimensionsVisited: ['Overworld'],
      structuresDiscovered: [],
    };
  }
}

/**
 * Main function to extract all save data
 */
export async function extractFullSaveData(
  savePath: string,
  saveName: string,
  folderName: string,
  uuid: string
): Promise<any> {
  try {
    // Get file stats for dates
    const stats = await fs.stat(savePath);

    // Extract data from various sources
    const [worldData, playerData, advancementData, statsData] = await Promise.all([
      extractWorldData(savePath),
      extractPlayerData(savePath, uuid),
      extractAdvancementData(savePath, uuid),
      extractStatisticsData(savePath, uuid),
    ]);

    // Combine into unified structure
    // Use playtime from statistics if available, otherwise fall back to player data
    const playtimeSeconds = statsData?.playtimeSeconds ?? (playerData?.playtimeTicks ? Math.round(playerData.playtimeTicks / 20) : 0);

    return {
      // Identity
      id: folderName,
      name: saveName,
      folderName,
      createdAt: stats.birthtimeMs,
      lastPlayed: stats.mtimeMs,
      playtime: playtimeSeconds, // in seconds

      // World
      gameMode: worldData?.gameMode ?? 0,
      difficulty: worldData?.difficulty ?? 2,
      seed: worldData?.seed ?? '0',
      gameVersion: '1.20.1', // Would need to extract from level.dat

      // Coordinates
      spawnX: worldData?.spawnX ?? 0,
      spawnY: worldData?.spawnY ?? 64,
      spawnZ: worldData?.spawnZ ?? 0,
      playerX: playerData?.position?.x ?? 0,
      playerY: playerData?.position?.y ?? 64,
      playerZ: playerData?.position?.z ?? 0,

      // Progress
      advancementsCompleted: advancementData?.completed ?? 0,
      advancementsTotal: advancementData?.total ?? 0,

      // Player
      health: playerData?.health ?? 20,
      hunger: playerData?.hunger ?? 20,
      xp: playerData?.xpProgress ?? 0,
      level: playerData?.xpLevel ?? 0,
      inventory: playerData?.inventory ?? [],
      armor: playerData?.armor ?? [],
      effects: playerData?.effects ?? [],

      // Statistics
      ...statsData,

      // World state
      weather: worldData?.thundering ? 'thundering' : worldData?.raining ? 'raining' : 'clear',
      cheatsAllowed: worldData?.cheatsAllowed ?? false,
      difficultyLocked: worldData?.difficultyLocked ?? false,
      datapacks: worldData?.datapacks ?? [],
    };
  } catch (error) {
    console.error('Error extracting full save data:', error);
    throw error;
  }
}

/**
 * Helper to calculate playtime from day/time ticks
 */
function calculatePlaytime(dayTime: number): number {
  // This is simplified - real calculation would need actual play time tracking
  return dayTime * 50; // Rough conversion to milliseconds
}

/**
 * Get all saves in an instance
 */
export async function getSavesInInstance(instancePath: string): Promise<RawSaveData[]> {
  try {
    const savesPath = path.join(instancePath, 'saves');
    const entries = await fs.readdir(savesPath, { withFileTypes: true });

    const saves: RawSaveData[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Try to read level.dat or level.dat_old to get save name
        const levelDatPath = path.join(savesPath, entry.name, 'level.dat');
        const levelDatOldPath = path.join(savesPath, entry.name, 'level.dat_old');

        const exists = await fs
          .access(levelDatPath)
          .then(() => true)
          .catch(() => false);

        if (exists || (await fs.access(levelDatOldPath).then(() => true).catch(() => false))) {
          saves.push({
            id: entry.name,
            name: entry.name, // Would parse from level.dat in real impl
            folderName: entry.name,
            path: path.join(savesPath, entry.name),
          });
        }
      }
    }

    return saves;
  } catch (error) {
    console.error('Error getting saves:', error);
    return [];
  }
}
