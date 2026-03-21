import fs from 'fs';
import path from 'path';

export interface Mod {
  id: string;
  name: string;
  filename: string;
  filePath: string;
  size: number;
  sizeFormatted: string;
  extension: string;
  jarType: 'fabric' | 'forge' | 'unknown';
}

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Detect mod type from filename
 */
function detectModType(filename: string): 'fabric' | 'forge' | 'unknown' {
  const lower = filename.toLowerCase();
  if (lower.includes('fabric')) return 'fabric';
  if (lower.includes('forge')) return 'forge';
  return 'unknown';
}

/**
 * Scan mods folder and return list of mods
 */
export function scanModsInFolder(modsPath: string): Mod[] {
  const mods: Mod[] = [];

  try {
    if (!fs.existsSync(modsPath)) {
      console.warn(`Mods folder not found: ${modsPath}`);
      return mods;
    }

    const files = fs.readdirSync(modsPath);

    for (const filename of files) {
      try {
        const filePath = path.join(modsPath, filename);
        const stat = fs.statSync(filePath);

        // Skip directories and non-jar/zip files
        if (stat.isDirectory()) continue;
        if (!filename.endsWith('.jar') && !filename.endsWith('.zip')) continue;

        // Extract mod name (remove version and extension)
        const baseName = filename.replace(/\.(jar|zip)$/i, '');
        const extension = filename.endsWith('.jar') ? 'jar' : 'zip';
        const jarType = detectModType(filename);

        const mod: Mod = {
          id: `${baseName}-${stat.mtimeMs}`, // Use filename + mtime as unique ID
          name: baseName,
          filename: filename,
          filePath: filePath,
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
          extension: extension,
          jarType: jarType,
        };

        mods.push(mod);
      } catch (error) {
        console.error(`Error processing mod file ${filename}:`, error);
      }
    }

    // Sort by name
    mods.sort((a, b) => a.name.localeCompare(b.name));

    return mods;
  } catch (error) {
    console.error(`Error scanning mods folder: ${modsPath}`, error);
    return mods;
  }
}

/**
 * Get mods for a specific instance
 */
export function getInstanceMods(instancePath: string): Mod[] {
  const modsPath = path.join(instancePath, 'mods');
  return scanModsInFolder(modsPath);
}

export default {
  scanModsInFolder,
  getInstanceMods,
};
