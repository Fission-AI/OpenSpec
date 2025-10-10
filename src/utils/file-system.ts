import { promises as fs } from 'fs';
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

  static async canWriteFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) {
        return true;
      }

      return (stats.mode & 0o222) !== 0;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return true;
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
      
      const testFile = path.join(dirPath, '.openspec-test-' + Date.now());
      await fs.writeFile(testFile, '');
      await fs.unlink(testFile);
      return true;
    } catch (error: any) {
      console.debug(`Insufficient permissions to write to ${dirPath}: ${error.message}`);
      return false;
    }
  }
}
