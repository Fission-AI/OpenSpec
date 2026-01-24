import { promises as fs, constants as fsConstants } from 'fs';
import path from 'path';

function isMarkerOnOwnLine(content: string, markerIndex: number, markerLength: number): boolean {
  let leftIndex = markerIndex - 1;
  while (leftIndex >= 0 && content[leftIndex] !== '\n') {
    const char = content[leftIndex];
    if (char !== ' ' && char !== '\t' && char !== '\r') {
      return false;
    }
    leftIndex--;
  }

  let rightIndex = markerIndex + markerLength;
  while (rightIndex < content.length && content[rightIndex] !== '\n') {
    const char = content[rightIndex];
    if (char !== ' ' && char !== '\t' && char !== '\r') {
      return false;
    }
    rightIndex++;
  }

  return true;
}

function findMarkerIndex(
  content: string,
  marker: string,
  fromIndex = 0
): number {
  let currentIndex = content.indexOf(marker, fromIndex);

  while (currentIndex !== -1) {
    if (isMarkerOnOwnLine(content, currentIndex, marker.length)) {
      return currentIndex;
    }

    currentIndex = content.indexOf(marker, currentIndex + marker.length);
  }

  return -1;
}

export class FileSystemUtils {
  /**
   * Converts a path to use forward slashes (POSIX style).
   * Essential for cross-platform compatibility with glob libraries like fast-glob.
   */
  static toPosixPath(p: string): string {
    return p.replace(/\\/g, '/');
  }

  private static isWindowsBasePath(basePath: string): boolean {
    return /^[A-Za-z]:[\\/]/.test(basePath) || basePath.startsWith('\\');
  }

  private static normalizeSegments(segments: string[]): string[] {
    return segments
      .flatMap((segment) => segment.split(/[\\/]+/u))
      .filter((part) => part.length > 0);
  }

  static joinPath(basePath: string, ...segments: string[]): string {
    const normalizedSegments = this.normalizeSegments(segments);

    if (this.isWindowsBasePath(basePath)) {
      const normalizedBasePath = path.win32.normalize(basePath);
      return normalizedSegments.length
        ? path.win32.join(normalizedBasePath, ...normalizedSegments)
        : normalizedBasePath;
    }

    const posixBasePath = basePath.replace(/\\/g, '/');

    return normalizedSegments.length
      ? path.posix.join(posixBasePath, ...normalizedSegments)
      : path.posix.normalize(posixBasePath);
  }

  static async createDirectory(dirPath: string): Promise<void> {
    await fs.mkdir(dirPath, { recursive: true });
  }

  static async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.debug(`Unable to check if file exists at ${filePath}: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Finds the first existing parent directory by walking up the directory tree.
   * @param dirPath Starting directory path
   * @returns The first existing directory path, or null if root is reached without finding one
   */
  private static async findFirstExistingDirectory(dirPath: string): Promise<string | null> {
    let currentDir = dirPath;

    while (true) {
      try {
        const stats = await fs.stat(currentDir);
        if (stats.isDirectory()) {
          return currentDir;
        }
        // Path component exists but is not a directory (edge case)
        console.debug(`Path component ${currentDir} exists but is not a directory`);
        return null;
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          // Directory doesn't exist, move up one level
          const parentDir = path.dirname(currentDir);
          if (parentDir === currentDir) {
            // Reached filesystem root without finding existing directory
            return null;
          }
          currentDir = parentDir;
        } else {
          // Unexpected error (permissions, I/O error, etc.)
          console.debug(`Error checking directory ${currentDir}: ${error.message}`);
          return null;
        }
      }
    }
  }

  static async canWriteFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        return true;
      }

      // On Windows, stats.mode doesn't reliably indicate write permissions.
      // Use fs.access with W_OK to check actual write permissions cross-platform.
      try {
        await fs.access(filePath, fsConstants.W_OK);
        return true;
      } catch {
        return false;
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist - find first existing parent directory and check its permissions
        const parentDir = path.dirname(filePath);
        const existingDir = await this.findFirstExistingDirectory(parentDir);

        if (existingDir === null) {
          // No existing parent directory found (edge case)
          return false;
        }

        // Check if the existing parent directory is writable
        try {
          await fs.access(existingDir, fsConstants.W_OK);
          return true;
        } catch {
          return false;
        }
      }

      console.debug(`Unable to determine write permissions for ${filePath}: ${error.message}`);
      return false;
    }
  }

  static async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.debug(`Unable to check if directory exists at ${dirPath}: ${error.message}`);
      }
      return false;
    }
  }

  static async writeFile(filePath: string, content: string): Promise<void> {
    const dir = path.dirname(filePath);
    await this.createDirectory(dir);
    await fs.writeFile(filePath, content, 'utf-8');
  }

  static async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  static async updateFileWithMarkers(
    filePath: string,
    content: string,
    startMarker: string,
    endMarker: string
  ): Promise<void> {
    let existingContent = '';
    
    if (await this.fileExists(filePath)) {
      existingContent = await this.readFile(filePath);
      
      const startIndex = findMarkerIndex(existingContent, startMarker);
      const endIndex = startIndex !== -1
        ? findMarkerIndex(existingContent, endMarker, startIndex + startMarker.length)
        : findMarkerIndex(existingContent, endMarker);

      if (startIndex !== -1 && endIndex !== -1) {
        if (endIndex < startIndex) {
          throw new Error(
            `Invalid marker state in ${filePath}. End marker appears before start marker.`
          );
        }

        const before = existingContent.substring(0, startIndex);
        const after = existingContent.substring(endIndex + endMarker.length);
        existingContent = before + startMarker + '\n' + content + '\n' + endMarker + after;
      } else if (startIndex === -1 && endIndex === -1) {
        existingContent = startMarker + '\n' + content + '\n' + endMarker + '\n\n' + existingContent;
      } else {
        throw new Error(`Invalid marker state in ${filePath}. Found start: ${startIndex !== -1}, Found end: ${endIndex !== -1}`);
      }
    } else {
      existingContent = startMarker + '\n' + content + '\n' + endMarker;
    }
    
    await this.writeFile(filePath, existingContent);
  }

  static async ensureWritePermissions(dirPath: string): Promise<boolean> {
    try {
      // If directory doesn't exist, check parent directory permissions
      if (!await this.directoryExists(dirPath)) {
        const parentDir = path.dirname(dirPath);
        if (!await this.directoryExists(parentDir)) {
          await this.createDirectory(parentDir);
        }
        return await this.ensureWritePermissions(parentDir);
      }

      const testFile = path.join(dirPath, '.openspec-test-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      await fs.writeFile(testFile, '');

      // On Windows, file may be temporarily locked by antivirus or indexing services.
      // Retry unlink with a small delay if it fails.
      const maxRetries = 3;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          await fs.unlink(testFile);
          break;
        } catch (unlinkError: any) {
          if (attempt === maxRetries - 1) {
            // Last attempt failed, but we successfully wrote the file, so permissions are OK
            // Just log and continue - the temp file will be cleaned up eventually
            console.debug(`Could not clean up test file ${testFile}: ${unlinkError.message}`);
          } else {
            // Wait briefly before retrying (Windows file lock release)
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        }
      }
      return true;
    } catch (error: any) {
      console.debug(`Insufficient permissions to write to ${dirPath}: ${error.message}`);
      return false;
    }
  }
}

/**
 * Removes a marker block from file content.
 * Only removes markers that are on their own lines (ignores inline mentions).
 * Cleans up double blank lines that may result from removal.
 *
 * @param content - File content with markers
 * @param startMarker - The start marker string
 * @param endMarker - The end marker string
 * @returns Content with marker block removed, or original content if markers not found/invalid
 */
export function removeMarkerBlock(
  content: string,
  startMarker: string,
  endMarker: string
): string {
  const startIndex = findMarkerIndex(content, startMarker);
  const endIndex = startIndex !== -1
    ? findMarkerIndex(content, endMarker, startIndex + startMarker.length)
    : findMarkerIndex(content, endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return content;
  }

  // Find the start of the line containing the start marker
  let lineStart = startIndex;
  while (lineStart > 0 && content[lineStart - 1] !== '\n') {
    lineStart--;
  }

  // Find the end of the line containing the end marker
  let lineEnd = endIndex + endMarker.length;
  while (lineEnd < content.length && content[lineEnd] !== '\n') {
    lineEnd++;
  }
  // Include the trailing newline if present
  if (lineEnd < content.length && content[lineEnd] === '\n') {
    lineEnd++;
  }

  const before = content.substring(0, lineStart);
  const after = content.substring(lineEnd);

  // Clean up double blank lines (handle both Unix \n and Windows \r\n)
  let result = before + after;
  result = result.replace(/(\r?\n){3,}/g, '\n\n');

  // Trim trailing whitespace but preserve leading whitespace and original newline style
  if (result.trimEnd() === '') {
    return '';
  }
  const newline = content.includes('\r\n') ? '\r\n' : '\n';
  return result.trimEnd() + newline;
}
