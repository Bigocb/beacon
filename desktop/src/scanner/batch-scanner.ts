import fs from 'fs';
import path from 'path';

export interface InstanceFolder {
  path: string;
  name: string;
  isInstance: boolean;
  reason?: string;
}

/**
 * Detect if a folder is a Minecraft instance
 * An instance folder contains a "saves" subfolder OR launcher-specific files
 */
function isMinecraftInstance(folderPath: string): boolean {
  try {
    // Check for saves folder
    const savesPath = path.join(folderPath, 'saves');
    if (fs.existsSync(savesPath)) {
      const savesStats = fs.statSync(savesPath);
      if (savesStats.isDirectory()) {
        return true;
      }
    }

    // Check for launcher-specific files
    const instanceMarkers = [
      'manifest.json', // CurseForge
      '.metadata', // CurseForge alternative
      'instance.cfg', // MultiMC
      'mmc-pack.json', // Prism Launcher
      'modpack.json', // ATLauncher
      '.fabric', // Fabric loader marker
      '.forge', // Forge loader marker
    ];

    for (const marker of instanceMarkers) {
      const markerPath = path.join(folderPath, marker);
      if (fs.existsSync(markerPath)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Scan a parent folder and find all Minecraft instances
 * Useful for scanning Instances/ folders or similar parent directories
 */
export function discoverInstancesInFolder(parentFolderPath: string): InstanceFolder[] {
  const instances: InstanceFolder[] = [];

  try {
    console.log(`\n🔍 Scanning for instances in: ${parentFolderPath}`);

    if (!fs.existsSync(parentFolderPath)) {
      console.warn(`❌ Folder does not exist: ${parentFolderPath}`);
      return instances;
    }

    const entries = fs.readdirSync(parentFolderPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const fullPath = path.join(parentFolderPath, entry.name);

        // Skip hidden folders and common non-instance folders
        if (entry.name.startsWith('.') || ['node_modules', '.git', 'backup'].includes(entry.name)) {
          continue;
        }

        const isInstance = isMinecraftInstance(fullPath);

        if (isInstance) {
          console.log(`  ✓ Found instance: ${entry.name}`);
          instances.push({
            path: fullPath,
            name: entry.name,
            isInstance: true,
          });
        }
      }
    }

    console.log(`📊 Discovered ${instances.length} instance(s)\n`);
    return instances;
  } catch (error) {
    console.error(`Error discovering instances: ${error}`);
    return instances;
  }
}

/**
 * Detect launcher type by analyzing the folder path and contents
 */
export function detectLauncherByPath(folderPath: string): string {
  const lowerPath = folderPath.toLowerCase();

  // Check path patterns first (most reliable)
  if (lowerPath.includes('curseforge')) {
    return 'curseforge';
  }
  if (lowerPath.includes('.multimc') || lowerPath.includes('multimc')) {
    return 'multimc';
  }
  if (lowerPath.includes('prism')) {
    return 'prismlauncher';
  }
  if (lowerPath.includes('atlauncher')) {
    return 'atlauncher';
  }

  // Check for launcher-specific files
  if (fs.existsSync(path.join(folderPath, 'manifest.json')) ||
      fs.existsSync(path.join(folderPath, '.metadata/instance.json'))) {
    return 'curseforge';
  }
  if (fs.existsSync(path.join(folderPath, 'instance.cfg'))) {
    return 'multimc';
  }
  if (fs.existsSync(path.join(folderPath, 'mmc-pack.json'))) {
    return 'prismlauncher';
  }
  if (fs.existsSync(path.join(folderPath, 'modpack.json'))) {
    return 'atlauncher';
  }

  return 'direct';
}

export default {
  discoverInstancesInFolder,
  detectLauncherByPath,
  isMinecraftInstance,
};
