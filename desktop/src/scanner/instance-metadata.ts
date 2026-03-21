import fs from 'fs';
import path from 'path';

export interface InstanceMetadata {
  folder_id: string;
  mod_loader: 'vanilla' | 'fabric' | 'forge' | 'quilt';
  loader_version?: string;
  game_version?: string;
  mod_count: number;
  icon_path?: string;
  instance_type: 'vanilla' | 'modded' | 'pvp' | 'unknown';
  launcher?: 'curseforge' | 'multimc' | 'prismlauncher' | 'atlauncher' | 'direct' | 'unknown';
  instance_name?: string;
  folder_size_mb?: number;
  mods_folder_size_mb?: number;
}

export type LauncherType = 'curseforge' | 'multimc' | 'prismlauncher' | 'atlauncher' | 'direct' | 'unknown';

/**
 * Detect the launcher type and return the correct saves folder path
 * Different launchers store saves in different locations:
 * - CurseForge: instance_folder/saves/
 * - MultiMC/Prism: instance_folder/../../saves/ (or instance_folder/.minecraft/saves)
 * - Direct: direct saves folder
 */
export function detectLauncherAndGetSavesPath(folderPath: string): { launcher: LauncherType; savesPath: string } {
  try {
    // Check for CurseForge manifest
    if (fs.existsSync(path.join(folderPath, 'manifest.json'))) {
      return { launcher: 'curseforge', savesPath: path.join(folderPath, 'saves') };
    }

    // Check for CurseForge metadata
    if (fs.existsSync(path.join(folderPath, '.metadata/instance.json'))) {
      return { launcher: 'curseforge', savesPath: path.join(folderPath, 'saves') };
    }

    // Check for Prism Launcher
    if (fs.existsSync(path.join(folderPath, 'mmc-pack.json'))) {
      // Prism/MultiMC can have saves in multiple places, check common ones
      const savesInInstance = path.join(folderPath, '.minecraft', 'saves');
      const savesInRoot = path.join(folderPath, 'saves');

      if (fs.existsSync(savesInInstance)) {
        return { launcher: 'prismlauncher', savesPath: savesInInstance };
      }
      if (fs.existsSync(savesInRoot)) {
        return { launcher: 'prismlauncher', savesPath: savesInRoot };
      }

      // Default to .minecraft/saves for Prism
      return { launcher: 'prismlauncher', savesPath: savesInInstance };
    }

    // Check for MultiMC (older format)
    if (fs.existsSync(path.join(folderPath, 'instance.cfg'))) {
      const savesInInstance = path.join(folderPath, '.minecraft', 'saves');
      const savesInRoot = path.join(folderPath, 'saves');

      if (fs.existsSync(savesInInstance)) {
        return { launcher: 'multimc', savesPath: savesInInstance };
      }
      if (fs.existsSync(savesInRoot)) {
        return { launcher: 'multimc', savesPath: savesInRoot };
      }

      return { launcher: 'multimc', savesPath: savesInInstance };
    }

    // Check for ATLauncher
    if (fs.existsSync(path.join(folderPath, 'modpack.json')) ||
        fs.existsSync(path.join(folderPath, 'ATLauncher')) ||
        fs.existsSync(path.join(folderPath, 'configs'))) {
      const savesInInstance = path.join(folderPath, 'saves');
      return { launcher: 'atlauncher', savesPath: savesInInstance };
    }

    // If it has a .minecraft folder, it's likely a Prism/MultiMC instance
    const minecraftPath = path.join(folderPath, '.minecraft');
    if (fs.existsSync(minecraftPath)) {
      const savesPath = path.join(minecraftPath, 'saves');
      if (fs.existsSync(savesPath)) {
        return { launcher: 'multimc', savesPath };
      }
    }

    // Check if the folder itself contains saves (direct saves folder)
    const directSaves = fs.readdirSync(folderPath).some((item) => {
      try {
        const itemPath = path.join(folderPath, item);
        return fs.statSync(itemPath).isDirectory() &&
               fs.existsSync(path.join(itemPath, 'level.dat'));
      } catch {
        return false;
      }
    });

    if (directSaves) {
      return { launcher: 'direct', savesPath: folderPath };
    }

    // Fallback to checking for saves subdirectory
    const savesSubdir = path.join(folderPath, 'saves');
    if (fs.existsSync(savesSubdir)) {
      return { launcher: 'unknown', savesPath: savesSubdir };
    }

    // Default: assume it's a direct folder
    return { launcher: 'unknown', savesPath: folderPath };
  } catch (error) {
    console.error(`Error detecting launcher for ${folderPath}:`, error);
    // Fallback to direct folder
    return { launcher: 'unknown', savesPath: folderPath };
  }
}

export function analyzeInstanceMetadata(folderPath: string, folderId: string): InstanceMetadata {
  let analyzePath = folderPath;

  // Check if the current folder is a "saves" folder
  // If so, go up one level to analyze the actual instance
  const parts = folderPath.split(/[\\\/]/);
  const lastPart = parts[parts.length - 1].toLowerCase();

  if (lastPart === 'saves') {
    console.log(`📁 Detected 'saves' folder, going up one level to analyze instance`);
    parts.pop(); // Remove 'saves' from path
    analyzePath = parts.join(path.sep);
  }

  const metadata: InstanceMetadata = {
    folder_id: folderId,
    mod_loader: 'vanilla',
    mod_count: 0,
    instance_type: 'vanilla',
  };

  try {
    // Extract instance name from folder path
    const nameParts = analyzePath.split(/[\\\/]/);
    metadata.instance_name = nameParts[nameParts.length - 1];

    // Detect launcher type
    const launcherInfo = detectLauncherAndGetSavesPath(analyzePath);
    metadata.launcher = launcherInfo.launcher;

    // Detect mod loader
    const modsPath = path.join(analyzePath, 'mods');
    const modCount = countMods(modsPath);
    metadata.mod_count = modCount;

    console.log(`📊 Analyzing instance: ${metadata.instance_name}`, {
      folderPath: analyzePath,
      launcher: metadata.launcher,
      modsCount: modCount,
      modsPathExists: fs.existsSync(modsPath),
    });

    // Try to extract game version from minecraftinstance.json (CurseForge)
    const minecraftInstancePath = path.join(analyzePath, 'minecraftinstance.json');
    if (fs.existsSync(minecraftInstancePath)) {
      try {
        const instanceData = JSON.parse(fs.readFileSync(minecraftInstancePath, 'utf-8'));
        if (instanceData.gameVersion) {
          metadata.game_version = instanceData.gameVersion;
          console.log(`  ✅ Set game_version from minecraftinstance.json: "${instanceData.gameVersion}"`);
        }
      } catch (e) {
        console.log(`  Error reading game version from minecraftinstance.json: ${e}`);
      }
    }

    // Check for mod loaders
    const fabricMeta = detectFabric(analyzePath);
    const forgeMeta = detectForge(analyzePath);
    const quilMeta = detectQuilt(analyzePath);

    console.log(`🔍 Loader detection results:`, {
      fabric: fabricMeta ? 'FOUND' : 'not found',
      forge: forgeMeta ? 'FOUND' : 'not found',
      quilt: quilMeta ? 'FOUND' : 'not found',
    });

    if (fabricMeta) {
      metadata.mod_loader = 'fabric';
      metadata.loader_version = fabricMeta.version;
      metadata.instance_type = modCount > 0 ? 'modded' : 'vanilla';
      console.log(`  ✅ Set Fabric loader_version: "${fabricMeta.version}"`);
    } else if (forgeMeta) {
      metadata.mod_loader = 'forge';
      metadata.loader_version = forgeMeta.version;
      metadata.instance_type = modCount > 0 ? 'modded' : 'vanilla';
      console.log(`  ✅ Set Forge loader_version: "${forgeMeta.version}"`);
    } else if (quilMeta) {
      metadata.mod_loader = 'quilt';
      metadata.loader_version = quilMeta.version;
      metadata.instance_type = modCount > 0 ? 'modded' : 'vanilla';
      console.log(`  ✅ Set Quilt loader_version: "${quilMeta.version}"`);
    } else if (modCount > 0) {
      metadata.instance_type = 'modded';
      console.log(`  ⚠️ No loader detected but has ${modCount} mods`);
    }

    // Calculate folder size
    metadata.folder_size_mb = calculateFolderSize(analyzePath);

    // Calculate mods folder size
    if (fs.existsSync(modsPath)) {
      metadata.mods_folder_size_mb = calculateFolderSize(modsPath);
    }

    // Look for instance icon
    const iconPath = findInstanceIcon(analyzePath);
    if (iconPath) {
      metadata.icon_path = iconPath;
    }
  } catch (error) {
    console.error(`Error analyzing instance metadata for ${folderPath}:`, error);
  }

  return metadata;
}

function countMods(modsPath: string): number {
  if (!fs.existsSync(modsPath)) {
    return 0;
  }

  try {
    const files = fs.readdirSync(modsPath);
    return files.filter((f) => f.endsWith('.jar') || f.endsWith('.mod.jar')).length;
  } catch {
    return 0;
  }
}

function detectFabric(folderPath: string): { version: string } | null {
  try {
    // First check minecraftinstance.json (CurseForge stores Fabric version there)
    const minecraftInstancePath = path.join(folderPath, 'minecraftinstance.json');
    if (fs.existsSync(minecraftInstancePath)) {
      try {
        const instanceData = JSON.parse(fs.readFileSync(minecraftInstancePath, 'utf-8'));
        if (instanceData.baseModLoader) {
          const baseModLoader = instanceData.baseModLoader;
          // CurseForge stores Fabric version in forgeVersion field (confusingly named)
          if (baseModLoader.forgeVersion && baseModLoader.name && baseModLoader.name.includes('fabric')) {
            console.log(`  ✓ Found Fabric version in minecraftinstance.json: ${baseModLoader.forgeVersion}`);
            return { version: baseModLoader.forgeVersion };
          }
        }
      } catch (e) {
        console.log(`  Error reading minecraftinstance.json: ${e}`);
      }
    }

    // Check for .fabric folder (CurseForge Fabric instances)
    const fabricDirPath = path.join(folderPath, '.fabric');
    if (fs.existsSync(fabricDirPath)) {
      try {
        const fabricFiles = fs.readdirSync(fabricDirPath);
        // Check for mods.json in .fabric
        const modsJsonPath = path.join(fabricDirPath, 'mods.json');
        if (fs.existsSync(modsJsonPath)) {
          try {
            const modsJson = JSON.parse(fs.readFileSync(modsJsonPath, 'utf-8'));
            if (modsJson.version) {
              return { version: modsJson.version };
            }
          } catch (e) {
            // Silent fail
          }
        }
      } catch (e) {
        // Silent fail
      }
      return { version: 'detected' };
    }

    // Check for fabric-loader.properties
    const fabricPropsPath = path.join(folderPath, 'fabric-loader.properties');
    if (fs.existsSync(fabricPropsPath)) {
      const content = fs.readFileSync(fabricPropsPath, 'utf-8');
      const versionMatch = content.match(/loader=(.+)/);
      if (versionMatch) {
        return { version: versionMatch[1].trim() };
      }
    }

    // Check for fabric.json (older format)
    const fabricJsonPath = path.join(folderPath, 'fabric.json');
    if (fs.existsSync(fabricJsonPath)) {
      const content = JSON.parse(fs.readFileSync(fabricJsonPath, 'utf-8'));
      if (content.loader) {
        return { version: content.loader };
      }
    }

    // Check mods folder for fabric mod metadata
    const modsPath = path.join(folderPath, 'mods');
    if (fs.existsSync(modsPath)) {
      const files = fs.readdirSync(modsPath);
      // If there are mods and we haven't ruled out Fabric, it's likely Fabric
      if (files.length > 0 && files.some((f) => f.includes('fabric'))) {
        return { version: 'detected' };
      }
    }
  } catch (e) {
    console.error(`Error detecting Fabric: ${e}`);
  }
  return null;
}

function detectForge(folderPath: string): { version: string } | null {
  try {
    // First check minecraftinstance.json (CurseForge stores Forge version there)
    const minecraftInstancePath = path.join(folderPath, 'minecraftinstance.json');
    if (fs.existsSync(minecraftInstancePath)) {
      try {
        const instanceData = JSON.parse(fs.readFileSync(minecraftInstancePath, 'utf-8'));
        if (instanceData.baseModLoader) {
          const baseModLoader = instanceData.baseModLoader;
          // CurseForge stores Forge version in forgeVersion field
          if (baseModLoader.forgeVersion && baseModLoader.name && baseModLoader.name.includes('forge')) {
            console.log(`  ✓ Found Forge version in minecraftinstance.json: ${baseModLoader.forgeVersion}`);
            return { version: baseModLoader.forgeVersion };
          }
        }
      } catch (e) {
        console.log(`  Error reading minecraftinstance.json: ${e}`);
      }
    }

    // Check for .forge folder (similar to Fabric's .fabric)
    const forgeDirPath = path.join(folderPath, '.forge');
    if (fs.existsSync(forgeDirPath)) {
      return { version: 'detected' };
    }

    // Check for Forge version file
    const versionJsonPath = path.join(folderPath, 'version.json');
    if (fs.existsSync(versionJsonPath)) {
      const content = JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'));
      if (content.forgeVersion) {
        return { version: content.forgeVersion };
      }
    }

    // Check for forge-installer-info.json
    const forgeInfoPath = path.join(folderPath, 'forge-installer-info.json');
    if (fs.existsSync(forgeInfoPath)) {
      const content = JSON.parse(fs.readFileSync(forgeInfoPath, 'utf-8'));
      return { version: content.version || 'detected' };
    }

    // Check mods folder for Forge mod metadata
    const modsPath = path.join(folderPath, 'mods');
    if (fs.existsSync(modsPath)) {
      const files = fs.readdirSync(modsPath);
      if (files.length > 0 && files.some((f) => f.includes('forge'))) {
        return { version: 'detected' };
      }
    }
  } catch (e) {
    console.error(`Error detecting Forge: ${e}`);
  }
  return null;
}

function detectQuilt(folderPath: string): { version: string } | null {
  try {
    // First check minecraftinstance.json (CurseForge stores Quilt version there)
    const minecraftInstancePath = path.join(folderPath, 'minecraftinstance.json');
    if (fs.existsSync(minecraftInstancePath)) {
      try {
        const instanceData = JSON.parse(fs.readFileSync(minecraftInstancePath, 'utf-8'));
        if (instanceData.baseModLoader) {
          const baseModLoader = instanceData.baseModLoader;
          // CurseForge stores Quilt version in forgeVersion field
          if (baseModLoader.forgeVersion && baseModLoader.name && baseModLoader.name.includes('quilt')) {
            console.log(`  ✓ Found Quilt version in minecraftinstance.json: ${baseModLoader.forgeVersion}`);
            return { version: baseModLoader.forgeVersion };
          }
        }
      } catch (e) {
        console.log(`  Error reading minecraftinstance.json: ${e}`);
      }
    }

    // Check for quilt-loader.json
    const quiltLoaderPath = path.join(folderPath, 'quilt-loader.json');
    if (fs.existsSync(quiltLoaderPath)) {
      const content = JSON.parse(fs.readFileSync(quiltLoaderPath, 'utf-8'));
      if (content.loader_version) {
        return { version: content.loader_version };
      }
    }

    // Check mods folder for Quilt mod metadata
    const modsPath = path.join(folderPath, 'mods');
    if (fs.existsSync(modsPath)) {
      const files = fs.readdirSync(modsPath);
      if (files.length > 0 && files.some((f) => f.includes('quilt'))) {
        return { version: 'detected' };
      }
    }
  } catch {
    // Silent fail
  }

  return null;
}

function findInstanceIcon(folderPath: string): string | null {
  try {
    // Look for common icon files
    const iconNames = ['instance.png', 'icon.png', 'icon.jpg', 'icon.ico'];

    for (const name of iconNames) {
      const iconPath = path.join(folderPath, name);
      if (fs.existsSync(iconPath)) {
        return iconPath;
      }
    }

    // Look in .minecraft/icon.png
    const minecraftIconPath = path.join(folderPath, '.minecraft', 'icon.png');
    if (fs.existsSync(minecraftIconPath)) {
      return minecraftIconPath;
    }
  } catch {
    // Silent fail
  }

  return null;
}

function calculateFolderSize(folderPath: string): number {
  try {
    let totalSize = 0;

    function getSize(dirPath: string): void {
      try {
        const files = fs.readdirSync(dirPath);

        for (const file of files) {
          const filePath = path.join(dirPath, file);
          try {
            const stats = fs.statSync(filePath);
            if (stats.isFile()) {
              totalSize += stats.size;
            } else if (stats.isDirectory()) {
              getSize(filePath);
            }
          } catch {
            // Skip files/folders we can't read
          }
        }
      } catch {
        // Silent fail
      }
    }

    getSize(folderPath);
    return Math.round((totalSize / 1024 / 1024) * 100) / 100; // Convert to MB and round to 2 decimals
  } catch {
    return 0;
  }
}
