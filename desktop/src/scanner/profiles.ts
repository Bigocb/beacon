import fs from 'fs';
import path from 'path';
import os from 'os';

interface MinecraftAccount {
  uuid: string;
  username: string;
  email?: string;
}

export function getPrismLauncherPath(): string {
  const homeDir = os.homedir();

  if (process.platform === 'win32') {
    return path.join(homeDir, 'AppData', 'Roaming', 'PrismLauncher');
  } else if (process.platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'PrismLauncher');
  } else {
    return path.join(homeDir, '.local', 'share', 'PrismLauncher');
  }
}

export function getMinecraftSavesPath(): string {
  const homeDir = os.homedir();

  if (process.platform === 'win32') {
    return path.join(homeDir, 'AppData', 'Roaming', '.minecraft', 'saves');
  } else if (process.platform === 'darwin') {
    return path.join(homeDir, 'Library', 'Application Support', 'minecraft', 'saves');
  } else {
    return path.join(homeDir, '.minecraft', 'saves');
  }
}

export function detectPrismAccounts(): MinecraftAccount[] {
  const prismPath = getPrismLauncherPath();
  const accountsDir = path.join(prismPath, 'accounts');

  if (!fs.existsSync(accountsDir)) {
    console.warn('Prism Launcher accounts directory not found');
    return [];
  }

  try {
    const files = fs.readdirSync(accountsDir);
    const accounts: MinecraftAccount[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(accountsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        if (data.profile && data.profile.id) {
          accounts.push({
            uuid: data.profile.id,
            username: data.profile.name,
            email: data.profile.email,
          });
        }
      }
    }

    return accounts;
  } catch (error) {
    console.error('Error reading Prism accounts:', error);
    return [];
  }
}

export function detectMultiMCAccounts(): MinecraftAccount[] {
  const homeDir = os.homedir();
  let multiMCPath = '';

  if (process.platform === 'win32') {
    multiMCPath = path.join(homeDir, 'AppData', 'Roaming', '.MultiMC');
  } else if (process.platform === 'darwin') {
    multiMCPath = path.join(homeDir, 'Library', 'Application Support', '.MultiMC');
  } else {
    multiMCPath = path.join(homeDir, '.MultiMC');
  }

  const accountsFile = path.join(multiMCPath, 'accounts.json');

  if (!fs.existsSync(accountsFile)) {
    console.warn('MultiMC accounts file not found');
    return [];
  }

  try {
    const content = fs.readFileSync(accountsFile, 'utf-8');
    const data = JSON.parse(content);

    if (data.accounts && Array.isArray(data.accounts)) {
      return data.accounts.map((acc: any) => ({
        uuid: acc.profile_id,
        username: acc.profile_name,
        email: acc.username,
      }));
    }

    return [];
  } catch (error) {
    console.error('Error reading MultiMC accounts:', error);
    return [];
  }
}

export function getAllDetectedAccounts(): MinecraftAccount[] {
  const prismAccounts = detectPrismAccounts();
  const multiMCAccounts = detectMultiMCAccounts();

  // Merge and deduplicate by UUID
  const allAccounts = [...prismAccounts, ...multiMCAccounts];
  const seenUuids = new Set<string>();
  const unique: MinecraftAccount[] = [];

  for (const account of allAccounts) {
    if (!seenUuids.has(account.uuid)) {
      seenUuids.add(account.uuid);
      unique.push(account);
    }
  }

  return unique;
}
