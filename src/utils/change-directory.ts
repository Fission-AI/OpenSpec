import fs from 'node:fs';
import path from 'node:path';
import { FileSystemUtils } from './file-system.js';

const CHANGE_STAGES = ['proposed', 'approved'];

const CHANGE_ROOT_MARKERS = ['.openspec.yaml', 'proposal.md', 'tasks.md', 'design.md'];

function hasRootMarker(dir: string): boolean {
  return CHANGE_ROOT_MARKERS.some(file => fs.existsSync(path.join(dir, file)));
}

function hasFileUnder(dir: string): boolean {
  try {
    return fs.readdirSync(dir, { recursive: true, withFileTypes: true }).some(entry => entry.isFile());
  } catch {
    return false;
  }
}

// Older projects can have a change with the same name as a new container.
// Like nested-change detection, delta specs alone make a change; a staged
// change that happens to be named `specs` carries its own root marker.
function isChange(dir: string): boolean {
  if (hasRootMarker(dir)) return true;
  const specs = path.join(dir, 'specs');
  return !hasRootMarker(specs) && hasFileUnder(specs);
}

/**
 * The project that owns a change, read from the path as given. Symlinks are
 * not resolved: a linked `openspec/changes` still belongs to the project
 * that links it, not to the directory it points at.
 */
export function changeProjectRoot(changeDir: string): string {
  const parent = path.dirname(path.resolve(changeDir));
  const changesDir =
    CHANGE_STAGES.includes(path.basename(parent)) && path.basename(path.dirname(parent)) === 'changes'
      ? path.dirname(parent)
      : parent;
  return path.resolve(changesDir, '../..');
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
