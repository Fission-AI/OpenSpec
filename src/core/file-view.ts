import * as fs from 'fs';

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
};
