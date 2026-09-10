import fs from 'node:fs';
import path from 'node:path';
import { FileSystemUtils } from './file-system.js';

const CHANGE_STAGES = ['proposed', 'approved'];

// Older projects can have a change with the same name as a new container.
function isChange(dir: string): boolean {
  return ['.openspec.yaml', 'proposal.md'].some(file => fs.existsSync(path.join(dir, file)));
}

export function proposedChangesDir(changesDir: string): string {
  const dir = path.join(changesDir, 'proposed');
  if (isChange(dir)) throw new Error(`Rename the existing change at ${dir} before using it as a change container.`);
  FileSystemUtils.assertPathWithin(changesDir, dir);
  return dir;
}

/** Enumerate active names, including pre-approval-layout changes. */
export function activeChangeNames(changesDir: string): string[] {
  const names: string[] = [];
  for (const stage of ['', ...CHANGE_STAGES]) {
    const dir = path.join(changesDir, stage);
    if (stage && isChange(dir)) continue;
    if (stage) FileSystemUtils.assertPathWithin(changesDir, dir);
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'archive') continue;
      if (!stage && CHANGE_STAGES.includes(entry.name) && !isChange(path.join(dir, entry.name))) continue;
      names.push(entry.name);
    }
  }
  return [...new Set(names)].sort();
}

/** Resolve a bare name; keep the old missing-path behavior for callers. */
export function resolveChangeDir(changesDir: string, name: string): string {
  if (!name || name === '.' || name === '..' || /[/\\\0]/.test(name)) {
    throw new Error(`Invalid change name '${name}'`);
  }
  const matches = ['', ...CHANGE_STAGES].flatMap(stage => {
    const parent = path.join(changesDir, stage);
    if (stage && isChange(parent)) return [];
    const dir = path.join(parent, name);
    if (!stage && CHANGE_STAGES.includes(name) && !isChange(dir)) return [];
    return fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory() ? [dir] : [];
  });
  if (new Set(matches.map(dir => fs.realpathSync(dir))).size > 1) {
    throw new Error(`Ambiguous change '${name}': ${matches.join(', ')}`);
  }
  const dir = matches[0] ?? path.join(changesDir, name);
  if (!matches.length && CHANGE_STAGES.includes(name)) {
    throw new Error(`Change '${name}' not found: '${name}' is a change container.`);
  }
  if (matches.length && path.dirname(dir) !== changesDir) {
    FileSystemUtils.assertPathWithin(changesDir, path.dirname(dir));
  }
  return dir;
}
