import fs from 'fs';
import path from 'path';

export interface Screenshot {
  id: string;
  name: string;
  filename: string;
  filePath: string;
  size: number;
  sizeFormatted: string;
  extension: string;
  taken: number; // timestamp in milliseconds
  takenFormatted: string;
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
 * Format date for display
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

/**
 * Check if file is an image
 */
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
  return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
}

/**
 * Scan screenshots folder and return list of screenshots
 */
export function scanScreenshotsInFolder(screenshotsPath: string): Screenshot[] {
  const screenshots: Screenshot[] = [];

  try {
    if (!fs.existsSync(screenshotsPath)) {
      console.warn(`Screenshots folder not found: ${screenshotsPath}`);
      return screenshots;
    }

    const files = fs.readdirSync(screenshotsPath);

    for (const filename of files) {
      try {
        const filePath = path.join(screenshotsPath, filename);
        const stat = fs.statSync(filePath);

        // Skip directories
        if (stat.isDirectory()) continue;

        // Skip non-image files
        if (!isImageFile(filename)) continue;

        const ext = path.extname(filename).substring(1).toLowerCase();
        const baseName = path.basename(filename, path.extname(filename));

        const screenshot: Screenshot = {
          id: `${filename}-${stat.mtimeMs}`,
          name: baseName,
          filename: filename,
          filePath: filePath,
          size: stat.size,
          sizeFormatted: formatBytes(stat.size),
          extension: ext,
          taken: stat.mtimeMs,
          takenFormatted: formatDate(stat.mtimeMs),
        };

        screenshots.push(screenshot);
      } catch (error) {
        console.error(`Error processing screenshot ${filename}:`, error);
      }
    }

    // Sort by date taken (newest first)
    screenshots.sort((a, b) => b.taken - a.taken);

    return screenshots;
  } catch (error) {
    console.error(`Error scanning screenshots folder: ${screenshotsPath}`, error);
    return screenshots;
  }
}

/**
 * Get screenshots for a specific instance
 */
export function getInstanceScreenshots(instancePath: string): Screenshot[] {
  const screenshotsPath = path.join(instancePath, 'screenshots');
  return scanScreenshotsInFolder(screenshotsPath);
}

export default {
  scanScreenshotsInFolder,
  getInstanceScreenshots,
};
