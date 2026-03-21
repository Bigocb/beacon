/**
 * Parser for Minecraft player NBT data files
 * Extracts player stats, inventory, position, and effects
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as zlib from 'zlib';
import * as nbt from 'prismarine-nbt';

export interface InventoryItem {
  slot: number;
  id: string;
  count: number;
  tag?: any;
}

export interface ArmorItem {
  slot: 'head' | 'chest' | 'legs' | 'feet';
  id: string;
  count: number;
  tag?: any;
}

export interface Effect {
  id: number;
  name: string;
  amplifier: number;
  duration: number;
}

export interface PlayerData {
  uuid: string;
  health: number;
  hunger: number;
  saturation: number;
  xpLevel: number;
  xpProgress: number;
  playtimeTicks?: number; // Total time played in ticks (1200 ticks = 1 game day)
  position: {
    x: number;
    y: number;
    z: number;
  };
  rotation: {
    yaw: number;
    pitch: number;
  };
  inventory: InventoryItem[];
  armor: ArmorItem[];
  effects: Effect[];
  gamemode: number;
  alwaysShowName: boolean;
  dimension?: string; // e.g., "Overworld", "Nether", "End"
}

const EFFECT_NAMES: Record<number, string> = {
  1: 'Speed',
  2: 'Slowness',
  3: 'Haste',
  4: 'Mining Fatigue',
  5: 'Strength',
  6: 'Instant Health',
  7: 'Instant Damage',
  8: 'Jump Boost',
  9: 'Nausea',
  10: 'Regeneration',
  11: 'Resistance',
  12: 'Fire Resistance',
  13: 'Water Breathing',
  14: 'Invisibility',
  15: 'Blindness',
  16: 'Night Vision',
  17: 'Hunger',
  18: 'Weakness',
  19: 'Poison',
  20: 'Wither',
  21: 'Health Boost',
  22: 'Absorption',
  23: 'Saturation',
  24: 'Glowing',
  25: 'Levitation',
  26: 'Luck',
  27: 'Bad Luck',
  28: 'Slow Falling',
  29: 'Conduit Power',
  30: 'Dolphins Grace',
  31: 'Bad Omen',
  32: 'Hero Of The Village',
};

/**
 * Parse a player data file (.dat format)
 */
export async function parsePlayerData(filePath: string, uuid: string): Promise<PlayerData> {
  try {
    console.log(`🎮 Parsing player data from: ${filePath}`);
    const buffer = await fs.readFile(filePath);
    console.log(`📦 Read ${buffer.length} bytes from player file`);

    // Parse NBT data (prismarine-nbt handles decompression)
    // parse() returns { parsed: NBT, type: NBTFormat, metadata: Metadata }
    const result = await nbt.parse(buffer);
    const rawData = result.parsed as any;

    // Simplify the NBT structure to plain JavaScript objects
    const data = nbt.simplify(rawData) as any;
    console.log(`✅ NBT parsed successfully, keys:`, Object.keys(data).slice(0, 10));

    // Extract player info
    const health = data.Health ?? 20;
    const hunger = data.foodLevel ?? 20;
    const saturation = data.foodSaturationLevel ?? 0;
    const xpLevel = data.XpLevel ?? 0;
    const xpProgress = data.XpP ?? 0;
    const playtimeTicks = data.PlayTime ?? 0; // Total time played in ticks

    console.log(`📊 Extracted base stats - Health: ${health}, Hunger: ${hunger}, XP: ${xpLevel}, PlayTime: ${playtimeTicks} ticks`);

    // Position
    const posArray = data.Pos ?? [0, 64, 0];
    const position = {
      x: typeof posArray[0] === 'object' ? posArray[0].value || 0 : posArray[0],
      y: typeof posArray[1] === 'object' ? posArray[1].value || 64 : posArray[1],
      z: typeof posArray[2] === 'object' ? posArray[2].value || 0 : posArray[2],
    };

    // Rotation (Yaw, Pitch)
    const rotArray = data.Rotation ?? [0, 0];
    const rotation = {
      yaw: typeof rotArray[0] === 'object' ? rotArray[0].value || 0 : rotArray[0],
      pitch: typeof rotArray[1] === 'object' ? rotArray[1].value || 0 : rotArray[1],
    };

    // Game mode
    const gamemode = data.playerGameType ?? 0;
    const alwaysShowName = data.CustomNameVisible ?? false;

    // Inventory (slots 0-35 are main inventory)
    const inventory = parseInventory(data.Inventory || []);

    // Armor items
    const armor = parseArmorItems(data.ArmorItems || []);

    // Active effects
    const effects = parseEffects(data.ActiveEffects || []);

    return {
      uuid,
      health,
      hunger,
      saturation,
      xpLevel,
      xpProgress,
      playtimeTicks,
      position,
      rotation,
      inventory,
      armor,
      effects,
      gamemode,
      alwaysShowName,
    };
  } catch (error: any) {
    console.error(`❌ Error parsing player data from ${filePath}:`, error?.message || error);
    console.error('Stack:', error?.stack);
    throw error;
  }
}

export function parseInventory(items: any[]): InventoryItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => item.id)
    .map((item) => ({
      slot: item.Slot ?? -1,
      id: item.id ?? 'minecraft:air',
      count: item.Count ?? 0,
      tag: item.tag,
    }));
}

export function parseArmorItems(items: any[]): ArmorItem[] {
  if (!Array.isArray(items)) return [];
  const slots: ('feet' | 'legs' | 'chest' | 'head')[] = ['feet', 'legs', 'chest', 'head'];
  return items
    .map((item, index) => ({
      slot: slots[index] || 'feet',
      id: item.id ?? 'minecraft:air',
      count: item.Count ?? 0,
      tag: item.tag,
    }))
    .filter((item) => item.id !== 'minecraft:air');
}

export function parseEffects(effects: any[]): Effect[] {
  if (!Array.isArray(effects)) return [];
  return effects.map((effect) => ({
    id: effect.Id ?? 0,
    name: EFFECT_NAMES[effect.Id ?? 0] || `Effect ${effect.Id ?? 0}`,
    amplifier: effect.Amplifier ?? 0,
    duration: effect.Duration ?? 0,
  }));
}

/**
 * Get formatted item name from Minecraft item ID
 */
export function getItemDisplayName(itemId: string): string {
  // Convert minecraft:diamond_pickaxe to Diamond Pickaxe
  const name = itemId.replace('minecraft:', '').replace(/_/g, ' ');
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get item rarity color
 */
export function getItemRarityColor(itemId: string): string {
  if (itemId.includes('enchanted')) return '#ff55ff'; // Legendary
  if (itemId.includes('diamond')) return '#55ff55'; // Rare
  if (itemId.includes('gold')) return '#ffaa00'; // Uncommon
  if (itemId.includes('iron')) return '#cccccc'; // Common
  return '#aaaaaa'; // Common
}
