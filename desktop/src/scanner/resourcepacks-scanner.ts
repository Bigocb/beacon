import fs from 'fs';
import path from 'path';

export interface Resourcepack {
  id: string;
  name: string;
  filename: string;
  filePath: string;
  size: number;
  sizeFormatted: string;
  extension: string;
  type: 'zip' | 'directory';
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
 * Get directory size recursively
 */
function getDirectorySize(dirPath: string): number {
  let size = 0;
  try {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        size += getDirectorySize(filePath);
      } else {
        size += stat.size;
      }
    }
  } catch (error) {
    console.error(`Error calculating directory size: ${dirPath}`, error);
  }
  return size;
}

/**
 * Scan resourcepacks folder and return list of resourcepacks
 */
export function scanResourcepacksInFolder(resourcepacksPath: string): Resourcepack[] {
  const resourcepacks: Resourcepack[] = [];

  try {
    if (!fs.existsSync(resourcepacksPath)) {
      console.warn(`Resourcepacks folder not found: ${resourcepacksPath}`);
      return resourcepacks;
    }

    const files = fs.readdirSync(resourcepacksPath);

    for (const filename of files) {
      try {
        const filePath = path.join(resourcepacksPath, filename);
        const stat = fs.statSync(filePath);

        let size = 0;
        let extension: 'zip' | 'directory' = 'directory';

        // Handle zip files
        if (filename.endsWith('.zip')) {
          size = stat.size;
          extension = 'zip';
        }
        // Handle directories
        else if (stat.isDirectory()) {
          size = getDirectorySize(filePath);
          extension = 'directory';
        }
        // Skip other files
        else {
          continue;
        }

        const resourcepack: Resourcepack = {
          id: `${filename}-${stat.mtimeMs}`,
          name: filename.replace(/\.zip$/i, ''),
          filename: filename,
          filePath: filePath,
          size: size,
          sizeFormatted: formatBytes(size),
          extension: extension,
          type: extension,
        };

        resourcepacks.push(resourcepack);
      } catch (error) {
        console.error(`Error processing resourcepack ${filename}:`, error);
      }
    }

    // Sort by name
    resourcepacks.sort((a, b) => a.name.localeCompare(b.name));

    return resourcepacks;
  } catch (error) {
    console.error(`Error scanning resourcepacks folder: ${resourcepacksPath}`, error);
    return resourcepacks;
  }
}

/**
 * Get resourcepacks for a specific instance
 */
export function getInstanceResourcepacks(instancePath: string): Resourcepack[] {
  const resourcepacksPath = path.join(instancePath, 'resourcepacks');
  return scanResourcepacksInFolder(resourcepacksPath);
}

export default {
  scanResourcepacksInFolder,
  getInstanceResourcepacks,
};
