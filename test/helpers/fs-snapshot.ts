import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Relpath→content map of a directory tree. Directories are recorded too
 * (as `<relpath>/` entries) so a command deleting an empty subdirectory
 * cannot pass a byte-identity check.
 */
export function snapshotDirectory(root: string): Map<string, string> {
  const snapshot = new Map<string, string>();

  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        snapshot.set(`${path.relative(root, fullPath)}/`, '');
        walk(fullPath);
      } else if (entry.isFile()) {
        snapshot.set(path.relative(root, fullPath), fs.readFileSync(fullPath, 'utf-8'));
      }
    }
  };

  walk(root);
  return snapshot;
}
