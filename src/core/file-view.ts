import * as fs from 'fs';
import path from 'path';

/**
 * How a check reads the files it inspects. Normally the disk. `update
 * --dry-run` passes the tree as it has planned it, so a step that reads what
 * an earlier step wrote sees the same thing it would in a real update.
 */
export interface FileView {
  exists(filePath: string): boolean;
  /** Throws, like `fs.readFileSync`, when the file is absent. */
  read(filePath: string): string;
  isDirectory(filePath: string): boolean;
  /**
   * The absolute folder a link at this path points to, or undefined when the
   * path is not a link. Optional: views that never hold links may omit it.
   */
  linkTarget?(filePath: string): string | undefined;
  /** Names of the entries directly in a folder. Optional, like linkTarget. */
  listDirectory?(dirPath: string): string[];
}

export const DISK_VIEW: FileView = {
  exists: (filePath) => fs.existsSync(filePath),
  read: (filePath) => fs.readFileSync(filePath, 'utf-8'),
  isDirectory: (filePath) => {
    try {
      return fs.statSync(filePath).isDirectory();
    } catch {
      return false;
    }
  },
  listDirectory: (dirPath) => fs.readdirSync(dirPath),
  linkTarget: (filePath) => {
    try {
      if (!fs.lstatSync(filePath).isSymbolicLink()) return undefined;
      return path.resolve(path.dirname(filePath), fs.readlinkSync(filePath));
    } catch {
      return undefined;
    }
  },
};
