import fs from 'fs';
import zlib from 'zlib';

interface NBTData {
  version?: string;
  gameType?: string;
  difficulty?: number;
  seed?: number;
  spawnX?: number;
  spawnY?: number;
  spawnZ?: number;
  dayTime?: number;
  // Player Status
  health?: number;
  hunger?: number;
  level?: number;
  xp?: number;
  // Player Statistics
  foodEaten?: number;
  bedsSleptIn?: number;
  deaths?: number;
  blocksMined?: number;
  blocksPlaced?: number;
  itemsCrafted?: number;
  mobsKilled?: number;
  damageTaken?: number;
  [key: string]: any;
}

export interface PlayerDataEntry {
  uuid: string;
  name?: string;
  data: Partial<NBTData>;
}

/**
 * Extract player data from playerdata/ directory
 * Returns the first player's data (most common case for single-player)
 * For per-player display, the frontend can access all player files
 */
export function extractPlayerDataFromSave(savePath: string): Partial<NBTData> {
  try {
    console.log(`🎮 Extracting player data from save: ${savePath}`);

    const playerDataEntries = extractAllPlayerData(savePath);

    if (playerDataEntries.length === 0) {
      console.log('⚠️ No player data extracted');
      return {};
    }

    // Return the first player's data for now
    // The frontend can request specific player data later
    const mainPlayer = playerDataEntries[0];
    console.log(`✅ Using main player data: ${mainPlayer.uuid}`);
    return mainPlayer.data;
  } catch (error) {
    console.error(`❌ Error extracting player data from ${savePath}:`, error);
    return {};
  }
}

/**
 * Extract data from ALL players in a save
 * Returns array of player data entries for per-player display
 */
export function extractAllPlayerData(savePath: string): PlayerDataEntry[] {
  const playerEntries: PlayerDataEntry[] = [];

  try {
    const allItems = fs.readdirSync(savePath);
    const playerdataDir = allItems.find(item => item.toLowerCase() === 'playerdata');

    if (!playerdataDir) {
      console.log('⚠️ No playerdata directory found in save');
      return [];
    }

    const playerdataPath = `${savePath}/${playerdataDir}`;
    const playerFiles = fs.readdirSync(playerdataPath).filter(f => f.endsWith('.dat'));

    console.log(`📁 Found ${playerFiles.length} player data files`);

    for (const playerFile of playerFiles) {
      const playerUuid = playerFile.replace('.dat', '');
      const playerDataPath = `${playerdataPath}/${playerFile}`;

      try {
        const data = fs.readFileSync(playerDataPath);
        const decompressed = zlib.gunzipSync(data);
        const context = { offset: 0 };
        const parsedData = parseNBTBuffer(decompressed, context);

        const playerDataRoot = parsedData[''] || parsedData;

        const extracted = {
          health: playerDataRoot.Health ?? 20,
          hunger: playerDataRoot.foodLevel ?? 20,
          level: playerDataRoot.XpLevel ?? 0,
          xp: playerDataRoot.XpTotal ?? 0,
        };

        playerEntries.push({
          uuid: playerUuid,
          name: playerDataRoot.Name, // Player's username if available
          data: extracted,
        });

        console.log(`  ✅ Player ${playerUuid.substring(0, 8)}... - Health: ${extracted.health}, Hunger: ${extracted.hunger}`);
      } catch (error) {
        console.error(`  ⚠️ Error parsing player ${playerUuid}:`, error);
      }
    }

    console.log(`📊 Successfully extracted data from ${playerEntries.length} player(s)`);
    return playerEntries;
  } catch (error) {
    console.error(`❌ Error reading playerdata directory:`, error);
    return [];
  }
}

export function parseNBT(filePath: string): NBTData {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`NBT file not found: ${filePath}`);
      return {};
    }

    const data = fs.readFileSync(filePath);

    // level.dat is gzip compressed
    const decompressed = zlib.gunzipSync(data);

    // Parse the NBT data
    const context = { offset: 0 };
    const parsed = parseNBTBuffer(decompressed, context);

    // Extract metadata
    return extractMetadata(parsed);
  } catch (error) {
    console.error(`Error parsing NBT file ${filePath}:`, error);
    return {};
  }
}

function parseNBTBuffer(buffer: Buffer, context: { offset: number }): any {
  const tagType = buffer[context.offset++];

  if (tagType === 0x00) return null;

  // Read tag name
  const nameLen = buffer.readUInt16BE(context.offset);
  context.offset += 2;
  const tagName = buffer.toString('utf-8', context.offset, context.offset + nameLen);
  context.offset += nameLen;

  // Read tag value
  const tagValue = readTagValue(buffer, context, tagType);

  return { [tagName]: tagValue };
}

function readTagValue(buffer: Buffer, context: { offset: number }, tagType: number): any {
  switch (tagType) {
    case 0x01: { // TAG_Byte (signed)
      const val = buffer.readInt8(context.offset);
      context.offset++;
      return val;
    }

    case 0x02: { // TAG_Short
      const val = buffer.readInt16BE(context.offset);
      context.offset += 2;
      return val;
    }

    case 0x03: { // TAG_Int
      const val = buffer.readInt32BE(context.offset);
      context.offset += 4;
      return val;
    }

    case 0x04: { // TAG_Long
      const val = buffer.readBigInt64BE(context.offset);
      context.offset += 8;
      return val;
    }

    case 0x05: { // TAG_Float
      const val = buffer.readFloatBE(context.offset);
      context.offset += 4;
      return val;
    }

    case 0x06: { // TAG_Double
      const val = buffer.readDoubleBE(context.offset);
      context.offset += 8;
      return val;
    }

    case 0x08: { // TAG_String
      const strLen = buffer.readUInt16BE(context.offset);
      context.offset += 2;
      const str = buffer.toString('utf-8', context.offset, context.offset + strLen);
      context.offset += strLen;
      return str;
    }

    case 0x09: { // TAG_List
      const elementType = buffer[context.offset++];
      const listLen = buffer.readInt32BE(context.offset);
      context.offset += 4;
      const list: any[] = [];
      for (let i = 0; i < listLen; i++) {
        list.push(readTagValue(buffer, context, elementType));
      }
      return list;
    }

    case 0x0a: { // TAG_Compound
      const compound: any = {};
      let fieldCount = 0;
      while (context.offset < buffer.length) {
        const nextType = buffer[context.offset++];
        if (nextType === 0x00) break;

        const nameLen = buffer.readUInt16BE(context.offset);
        context.offset += 2;
        const compoundTagName = buffer.toString('utf-8', context.offset, context.offset + nameLen);
        context.offset += nameLen;

        const value = readTagValue(buffer, context, nextType);
        compound[compoundTagName] = value;
        fieldCount++;

        // Log first few fields for debugging
        if (fieldCount <= 5) {
          console.log(`  📍 Compound field #${fieldCount}: "${compoundTagName}" (type 0x${nextType.toString(16).padStart(2, '0')}) = ${typeof value === 'object' ? '{...}' : value}`);
        }
      }
      console.log(`  📊 Total compound fields parsed: ${fieldCount}`);
      return compound;
    }

    case 0x0b: { // TAG_Byte_Array
      const byteArrLen = buffer.readInt32BE(context.offset);
      context.offset += 4;
      const bytes = buffer.slice(context.offset, context.offset + byteArrLen);
      context.offset += byteArrLen;
      return bytes;
    }

    case 0x0c: { // TAG_Int_Array
      const intArrLen = buffer.readInt32BE(context.offset);
      context.offset += 4;
      const ints: number[] = [];
      for (let i = 0; i < intArrLen; i++) {
        ints.push(buffer.readInt32BE(context.offset));
        context.offset += 4;
      }
      return ints;
    }

    default:
      return null;
  }
}

function extractMetadata(data: any): NBTData {
  const root = Object.values(data)[0] as any;

  if (!root) {
    console.warn('No root element in parsed NBT');
    return {};
  }

  const nbtData = root.Data || root;

  // Extract seed - modern worlds (1.16+) store it in WorldGenSettings
  const seed = nbtData.RandomSeed || nbtData.WorldGenSettings?.seed;

  // Debug logging for version extraction
  console.log('🔍 NBT Data structure - available keys:', Object.keys(nbtData).slice(0, 20));
  console.log('🔍 Version field:', JSON.stringify(nbtData.Version, null, 2));
  console.log('🔍 version field (lowercase):', JSON.stringify(nbtData.version, null, 2));

  // Try multiple ways to extract version (case-insensitive)
  let version = 'unknown';

  // Try Version (uppercase) - newer format
  if (nbtData.Version?.Name) {
    version = nbtData.Version.Name;
  } else if (nbtData.Version?.name) {
    version = nbtData.Version.name;
  } else if (nbtData.Version?.Id) {
    version = String(nbtData.Version.Id);
  } else if (nbtData.Version?.id) {
    version = String(nbtData.Version.id);
  } else if (typeof nbtData.Version === 'string') {
    version = nbtData.Version;
  }
  // Try version (lowercase) - older format
  else if (nbtData.version?.Name) {
    version = nbtData.version.Name;
  } else if (nbtData.version?.name) {
    version = nbtData.version.name;
  } else if (nbtData.version?.Id) {
    version = String(nbtData.version.Id);
  } else if (nbtData.version?.id) {
    version = String(nbtData.version.id);
  } else if (typeof nbtData.version === 'string') {
    version = nbtData.version;
  }

  console.log('✅ Extracted version:', version);

  // Extract player data
  const player = nbtData.Player || {};
  const playerStats = nbtData.PlayerStats || {};

  return {
    version: version,
    gameType: getGameMode(nbtData.GameType),
    difficulty: nbtData.Difficulty,
    seed: seed ? (typeof seed === 'string' ? parseInt(seed) : seed) : undefined,
    spawnX: nbtData.SpawnX,
    spawnY: nbtData.SpawnY,
    spawnZ: nbtData.SpawnZ,
    dayTime: nbtData.Time ? (typeof nbtData.Time === 'string' ? parseInt(nbtData.Time) : nbtData.Time) : undefined,
    // Player Status
    health: player.Health || player.health || 20,
    hunger: player.foodLevel || player.FoodLevel || 20,
    level: player.XpLevel || player.xpLevel || 0,
    xp: player.XpTotal || player.xpTotal || 0,
    // Player Statistics
    foodEaten: playerStats.FoodEaten || playerStats.foodEaten || 0,
    bedsSleptIn: playerStats.BedsSleptIn || playerStats.bedsSleptIn || 0,
    deaths: playerStats.Deaths || playerStats.deaths || 0,
    blocksMined: playerStats.BlocksMined || playerStats.blocksMined || 0,
    blocksPlaced: playerStats.BlocksPlaced || playerStats.blocksPlaced || 0,
    itemsCrafted: playerStats.ItemsCrafted || playerStats.itemsCrafted || 0,
    mobsKilled: playerStats.MobsKilled || playerStats.mobsKilled || 0,
    damageTaken: playerStats.DamageTaken || playerStats.damageTaken || 0,
  };
}

function getGameMode(gameTypeId?: number): string {
  switch (gameTypeId) {
    case 0:
      return 'survival';
    case 1:
      return 'creative';
    case 2:
      return 'adventure';
    case 3:
      return 'spectator';
    default:
      return 'unknown';
  }
}
