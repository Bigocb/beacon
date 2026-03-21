import { execFile, spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { promisify } from 'util';
import os from 'os';

const execFileAsync = promisify(execFile);

export type LauncherType = 'curseforge' | 'multimc' | 'prismlauncher' | 'atlauncher' | 'direct' | 'unknown';

interface LauncherPaths {
  curseforge: string[];
  multimc: string[];
  prismlauncher: string[];
  atlauncher: string[];
}

/**
 * Get common launcher installation paths by OS
 */
function getCommonLauncherPaths(): LauncherPaths {
  const home = os.homedir();
  const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
  const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

  return {
    curseforge: [
      path.join(programFiles, 'CurseForge', 'CurseForge.exe'),
      path.join(programFilesX86, 'CurseForge', 'CurseForge.exe'),
      path.join(home, 'AppData', 'Local', 'CurseForge', 'CurseForge.exe'),
    ],
    multimc: [
      path.join(programFiles, 'MultiMC', 'MultiMC.exe'),
      path.join(programFilesX86, 'MultiMC', 'MultiMC.exe'),
      path.join(home, 'AppData', 'Local', 'MultiMC', 'MultiMC.exe'),
      path.join(home, 'AppData', 'Roaming', 'MultiMC', 'MultiMC.exe'),
    ],
    prismlauncher: [
      path.join(programFiles, 'PrismLauncher', 'PrismLauncher.exe'),
      path.join(programFilesX86, 'PrismLauncher', 'PrismLauncher.exe'),
      path.join(home, 'AppData', 'Local', 'PrismLauncher', 'PrismLauncher.exe'),
      path.join(home, 'AppData', 'Roaming', 'PrismLauncher', 'PrismLauncher.exe'),
    ],
    atlauncher: [
      path.join(programFiles, 'ATLauncher', 'ATLauncher.exe'),
      path.join(programFilesX86, 'ATLauncher', 'ATLauncher.exe'),
      path.join(home, 'AppData', 'Local', 'ATLauncher', 'ATLauncher.exe'),
      path.join(home, 'AppData', 'Roaming', 'ATLauncher', 'ATLauncher.exe'),
    ],
  };
}

/**
 * Find the executable path for a given launcher
 */
export function findLauncherExecutable(launcherType: LauncherType): string | null {
  if (launcherType === 'direct' || launcherType === 'unknown') {
    return null; // Direct/Unknown types don't have a launcher to execute
  }

  const paths = getCommonLauncherPaths();
  const candidates = paths[launcherType] || [];

  for (const exePath of candidates) {
    if (existsSync(exePath)) {
      console.log(`✅ Found ${launcherType} launcher at: ${exePath}`);
      return exePath;
    }
  }

  console.warn(`⚠️ Could not find ${launcherType} launcher executable`);
  return null;
}

/**
 * Launch a Minecraft instance using the appropriate launcher
 */
export async function launchInstance(
  launcherType: LauncherType,
  instancePath: string,
  instanceName: string
): Promise<{ success: boolean; message: string }> {
  try {
    console.log(`🚀 Launching ${launcherType} instance: ${instanceName}`);
    console.log(`   Path: ${instancePath}`);

    // Normalize the path for the launcher
    const normalizedPath = path.resolve(instancePath);

    switch (launcherType) {
      case 'curseforge':
        return await launchCurseForge(normalizedPath, instanceName);

      case 'multimc':
        return await launchMultiMC(normalizedPath, instanceName);

      case 'prismlauncher':
        return await launchPrismLauncher(normalizedPath, instanceName);

      case 'atlauncher':
        return await launchATLauncher(normalizedPath, instanceName);

      case 'direct':
        // For direct instances, we could try to launch Minecraft directly
        // But this is complex and requires launcher profiles
        return {
          success: false,
          message: 'Direct instance launching is not yet supported. Please launch through the Minecraft launcher.',
        };

      case 'unknown':
      default:
        return {
          success: false,
          message: 'Unknown launcher type. Cannot launch instance.',
        };
    }
  } catch (error: any) {
    console.error('Error launching instance:', error);
    return {
      success: false,
      message: `Failed to launch instance: ${error.message}`,
    };
  }
}

/**
 * Launch a CurseForge instance
 * Note: CurseForge doesn't have a direct command-line API for launching specific instances
 * We'll open the CurseForge launcher which the user can use to launch from there
 */
async function launchCurseForge(instancePath: string, instanceName: string): Promise<{ success: boolean; message: string }> {
  const exePath = findLauncherExecutable('curseforge');
  if (!exePath) {
    return {
      success: false,
      message: 'CurseForge launcher not found. Please install CurseForge from https://www.curseforge.com/download',
    };
  }

  try {
    // CurseForge doesn't support direct instance launching via CLI
    // We'll just open the launcher
    spawn(exePath, [], { detached: true });
    console.log(`✅ Opened CurseForge launcher`);
    console.log(`   Please launch "${instanceName}" from the CurseForge interface`);

    return {
      success: true,
      message: `CurseForge launcher opened. Please select and launch "${instanceName}" from the launcher.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to open CurseForge: ${error.message}`,
    };
  }
}

/**
 * Launch a MultiMC instance
 * MultiMC supports -l flag to launch an instance
 */
async function launchMultiMC(instancePath: string, instanceName: string): Promise<{ success: boolean; message: string }> {
  const exePath = findLauncherExecutable('multimc');
  if (!exePath) {
    return {
      success: false,
      message: 'MultiMC launcher not found. Please install MultiMC.',
    };
  }

  try {
    // MultiMC takes the parent directory (where the instance is located)
    const parentDir = path.dirname(instancePath);

    // Try to launch with instance flag
    spawn(exePath, ['-l', instanceName], {
      cwd: parentDir,
      detached: true,
    });

    console.log(`✅ Launched MultiMC with instance: ${instanceName}`);

    return {
      success: true,
      message: `MultiMC launcher started for "${instanceName}".`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to launch MultiMC: ${error.message}`,
    };
  }
}

/**
 * Launch a Prism Launcher instance
 * Prism Launcher is a MultiMC fork with similar command-line interface
 */
async function launchPrismLauncher(instancePath: string, instanceName: string): Promise<{ success: boolean; message: string }> {
  const exePath = findLauncherExecutable('prismlauncher');
  if (!exePath) {
    return {
      success: false,
      message: 'Prism Launcher not found. Please install Prism Launcher from https://prismlauncher.org',
    };
  }

  try {
    const parentDir = path.dirname(instancePath);

    // Prism Launcher supports launching instances similarly to MultiMC
    spawn(exePath, ['-l', instanceName], {
      cwd: parentDir,
      detached: true,
    });

    console.log(`✅ Launched Prism Launcher with instance: ${instanceName}`);

    return {
      success: true,
      message: `Prism Launcher started for "${instanceName}".`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to launch Prism Launcher: ${error.message}`,
    };
  }
}

/**
 * Launch an ATLauncher instance
 */
async function launchATLauncher(instancePath: string, instanceName: string): Promise<{ success: boolean; message: string }> {
  const exePath = findLauncherExecutable('atlauncher');
  if (!exePath) {
    return {
      success: false,
      message: 'ATLauncher not found. Please install ATLauncher from https://atlauncher.com',
    };
  }

  try {
    // ATLauncher needs to be opened from its directory
    const launcherDir = path.dirname(exePath);

    // Open ATLauncher
    spawn(exePath, [], {
      cwd: launcherDir,
      detached: true,
    });

    console.log(`✅ Opened ATLauncher`);
    console.log(`   Please launch "${instanceName}" from the ATLauncher interface`);

    return {
      success: true,
      message: `ATLauncher opened. Please select and launch "${instanceName}" from the launcher.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Failed to open ATLauncher: ${error.message}`,
    };
  }
}

export default {
  launchInstance,
  findLauncherExecutable,
};
