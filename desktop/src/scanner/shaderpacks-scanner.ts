import fs from 'fs';
import path from 'path';

export interface Shaderpack {
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
 * Scan shaderpacks folder and return list of shaderpacks
 */
export function scanShaderpacksInFolder(shaderpacksPath: string): Shaderpack[] {
  const shaderpacks: Shaderpack[] = [];

  try {
    if (!fs.existsSync(shaderpacksPath)) {
      console.warn(`Shaderpacks folder not found: ${shaderpacksPath}`);
      return shaderpacks;
    }

    const files = fs.readdirSync(shaderpacksPath);

    for (const filename of files) {
      try {
        const filePath = path.join(shaderpacksPath, filename);
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

        const shaderpack: Shaderpack = {
          id: `${filename}-${stat.mtimeMs}`,
          name: filename.replace(/\.zip$/i, ''),
          filename: filename,
          filePath: filePath,
          size: size,
          sizeFormatted: formatBytes(size),
          extension: extension,
          type: extension,
        };

        shaderpacks.push(shaderpack);
      } catch (error) {
        console.error(`Error processing shaderpack ${filename}:`, error);
      }
    }

    // Sort by name
    shaderpacks.sort((a, b) => a.name.localeCompare(b.name));

    return shaderpacks;
  } catch (error) {
    console.error(`Error scanning shaderpacks folder: ${shaderpacksPath}`, error);
    return shaderpacks;
  }
}

/**
 * Get shaderpacks for a specific instance
 */
export function getInstanceShaderpacks(instancePath: string): Shaderpack[] {
  const shaderpacksPath = path.join(instancePath, 'shaderpacks');
  return scanShaderpacksInFolder(shaderpacksPath);
}

export default {
  scanShaderpacksInFolder,
  getInstanceShaderpacks,
};
