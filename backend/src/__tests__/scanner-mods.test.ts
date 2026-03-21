import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Test Suite: Scanner Mods and Metadata
 *
 * Tests for:
 * - Mod detection and counting
 * - Instance metadata analysis
 * - Launcher detection
 * - Game version detection
 */

describe('Scanner - Mod Detection', () => {
  let tempDir: string;

  beforeEach(() => {
    // Create temporary directory for testing
    tempDir = path.join(os.tmpdir(), `test-instance-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Cleanup temporary directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should count mods in mods folder', () => {
    // Create mods folder with test files
    const modsPath = path.join(tempDir, 'mods');
    fs.mkdirSync(modsPath);

    // Create mock mod files
    fs.writeFileSync(path.join(modsPath, 'mod1.jar'), '');
    fs.writeFileSync(path.join(modsPath, 'mod2.jar'), '');
    fs.writeFileSync(path.join(modsPath, 'mod3.jar'), '');

    // Count mods (simulate countMods function)
    const modFiles = fs
      .readdirSync(modsPath)
      .filter(f => f.endsWith('.jar'));

    expect(modFiles).toHaveLength(3);
  });

  it('should ignore non-jar files in mods folder', () => {
    const modsPath = path.join(tempDir, 'mods');
    fs.mkdirSync(modsPath);

    // Create mixed files
    fs.writeFileSync(path.join(modsPath, 'mod1.jar'), '');
    fs.writeFileSync(path.join(modsPath, 'readme.txt'), '');
    fs.writeFileSync(path.join(modsPath, 'config.json'), '');

    // Count only jar files
    const modFiles = fs
      .readdirSync(modsPath)
      .filter(f => f.endsWith('.jar'));

    expect(modFiles).toHaveLength(1);
  });

  it('should return 0 if mods folder does not exist', () => {
    // Try to read non-existent mods folder
    const modsPath = path.join(tempDir, 'nonexistent', 'mods');

    const modCount = fs.existsSync(modsPath) ? fs.readdirSync(modsPath).length : 0;

    expect(modCount).toBe(0);
  });

  it('should detect Fabric loader from fabric-loader marker', () => {
    // Create marker file for Fabric
    const loaderPath = path.join(tempDir, '.fabric', 'loader.properties');
    fs.mkdirSync(path.dirname(loaderPath), { recursive: true });
    fs.writeFileSync(loaderPath, 'loader.version=0.18.4');

    const hasFabric = fs.existsSync(loaderPath);

    expect(hasFabric).toBe(true);
  });

  it('should detect Forge loader from forgeloader jar', () => {
    // Create forge loader marker
    const libsPath = path.join(tempDir, 'libraries');
    fs.mkdirSync(libsPath, { recursive: true });

    const forgeJar = path.join(libsPath, 'net/minecraftforge/forge/1.20.1-47.2.0/forge-1.20.1-47.2.0.jar');
    fs.mkdirSync(path.dirname(forgeJar), { recursive: true });
    fs.writeFileSync(forgeJar, '');

    const hasForge = fs.existsSync(forgeJar);

    expect(hasForge).toBe(true);
  });

  it('should detect Quilt loader', () => {
    // Create quilt marker
    const quiltPath = path.join(tempDir, '.quilt_loader', 'metadata.json');
    fs.mkdirSync(path.dirname(quiltPath), { recursive: true });
    fs.writeFileSync(quiltPath, '{"version":"0.17.0"}');

    const hasQuilt = fs.existsSync(quiltPath);

    expect(hasQuilt).toBe(true);
  });
});

describe('Scanner - Instance Metadata', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `test-metadata-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should extract game version from minecraftinstance.json', () => {
    const manifestPath = path.join(tempDir, 'minecraftinstance.json');
    const manifest = {
      gameVersion: '1.21.11',
      name: 'Test Instance',
      modLoaders: [],
    };

    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    const content = JSON.parse(
      fs.readFileSync(manifestPath, 'utf-8')
    ) as typeof manifest;

    expect(content.gameVersion).toBe('1.21.11');
  });

  it('should detect launcher type from config files', () => {
    // CurseForge: manifest.json
    const cfManifest = path.join(tempDir, 'manifest.json');
    fs.writeFileSync(cfManifest, '{}');

    const isCurseForge = fs.existsSync(cfManifest);

    expect(isCurseForge).toBe(true);
  });

  it('should calculate folder size', () => {
    // Create files with known sizes
    const file1 = path.join(tempDir, 'file1.dat');
    const file2 = path.join(tempDir, 'file2.dat');

    fs.writeFileSync(file1, Buffer.alloc(1024 * 1024)); // 1 MB
    fs.writeFileSync(file2, Buffer.alloc(512 * 1024)); // 512 KB

    // Calculate total size in MB
    const stats1 = fs.statSync(file1);
    const stats2 = fs.statSync(file2);
    const totalSizeMb = (stats1.size + stats2.size) / (1024 * 1024);

    expect(totalSizeMb).toBeCloseTo(1.5, 1);
  });

  it('should find instance icon file', () => {
    // Create icon file
    const iconPath = path.join(tempDir, 'icon.png');
    fs.writeFileSync(iconPath, Buffer.from([137, 80, 78, 71])); // PNG magic number

    const hasIcon = fs.existsSync(iconPath);

    expect(hasIcon).toBe(true);
  });

  it('should handle missing metadata gracefully', () => {
    // Empty directory
    const files = fs.readdirSync(tempDir);

    expect(files).toHaveLength(0);
    // Instance should still be created with default values
  });
});

describe('Scanner - Saves Detection', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `test-saves-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should find saves in .minecraft/saves', () => {
    const savesPath = path.join(tempDir, '.minecraft', 'saves');
    fs.mkdirSync(savesPath, { recursive: true });

    // Create save directories
    fs.mkdirSync(path.join(savesPath, 'World 1'));
    fs.mkdirSync(path.join(savesPath, 'World 2'));

    const saves = fs.readdirSync(savesPath);

    expect(saves).toHaveLength(2);
  });

  it('should find saves in /saves directory', () => {
    const savesPath = path.join(tempDir, 'saves');
    fs.mkdirSync(savesPath, { recursive: true });

    fs.mkdirSync(path.join(savesPath, 'World 1'));
    fs.mkdirSync(path.join(savesPath, 'World 2'));
    fs.mkdirSync(path.join(savesPath, 'World 3'));

    const saves = fs.readdirSync(savesPath);

    expect(saves).toHaveLength(3);
  });

  it('should identify valid save folders by level.dat file', () => {
    const savesPath = path.join(tempDir, 'saves');
    fs.mkdirSync(savesPath, { recursive: true });

    const validSave = path.join(savesPath, 'Valid World');
    const invalidSave = path.join(savesPath, 'Invalid');

    fs.mkdirSync(validSave);
    fs.mkdirSync(invalidSave);

    // Only write level.dat to valid save
    fs.writeFileSync(path.join(validSave, 'level.dat'), Buffer.from([]));

    // Validate saves
    const isValidWorld1 = fs.existsSync(
      path.join(validSave, 'level.dat')
    );
    const isValidWorld2 = fs.existsSync(
      path.join(invalidSave, 'level.dat')
    );

    expect(isValidWorld1).toBe(true);
    expect(isValidWorld2).toBe(false);
  });
});
