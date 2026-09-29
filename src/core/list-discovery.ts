import { promises as fs } from 'node:fs';
import path from 'node:path';
import { resolveOpenSpecRoot, findQualifyingRootSync, emitStoreRootBanner, type StoreSelectorOptions, type ResolvedOpenSpecRoot } from './root-selection.js';
import { classifyOpenSpecDir } from './project-config.js';

const excluded = new Set([
  '.git', 'node_modules', '.venv', 'venv', 'env', '.env', '.worktrees', 'worktrees',
  'vendor', 'dist', 'build', 'target', 'coverage', '__pycache__', '.cache',
  '.next', '.nuxt', '.turbo', '.tox', '.pytest_cache', '.mypy_cache',
  '.pnpm', '.yarn', '.ruff_cache', '.gradle', '.parcel-cache', '.svelte-kit',
]);

export interface ListLibrary {
  path: string;
  library: string;
  diagnostic?: string;
}

/** Discover local libraries only; never traverse a library's planning contents. */
export async function discoverListLibraries(start: string): Promise<ListLibrary[]> {
  const base = path.resolve(start);
  const libraries: ListLibrary[] = [];
  const seen = new Set<string>();
  async function walk(dir: string): Promise<void> {
    const physical = await fs.realpath(dir);
    if (seen.has(physical)) return;
    seen.add(physical);
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const candidate = entries.find(entry => entry.name === 'openspec' && !entry.isSymbolicLink());
    if (candidate) {
      const library = path.relative(base, path.join(dir, 'openspec')).split(path.sep).join('/') + '/';
      const classification = classifyOpenSpecDir(dir);
      let diagnostic: string | undefined;
      try {
        if (!candidate.isDirectory()) throw new Error('openspec is not a directory');
        await fs.readdir(path.join(dir, 'openspec'));
        for (const name of ['changes', 'specs']) {
          try {
            const stat = await fs.lstat(path.join(dir, 'openspec', name));
            if (!stat.isDirectory()) throw new Error(`${name} is not a directory`);
            await fs.readdir(path.join(dir, 'openspec', name));
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
          }
        }
        if (classification.pointer.malformed) throw new Error('invalid config.yaml/config.yml');
      } catch (error) {
        diagnostic = `${(error as Error).message}. Check this library's layout and read permissions.`;
      }
      // project.md is the supported pre-config layout. Config-only store pointers
      // are selections, not descendant local libraries.
      if (diagnostic || classification.hasPlanningShape ||
          (classification.pointer.filePath && classification.pointer.value === undefined) ||
          await fs.access(path.join(dir, 'openspec', 'project.md')).then(() => true, () => false)) {
        libraries.push({ path: physical, library, ...(diagnostic ? { diagnostic } : {}) });
      }
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || entry.name === 'openspec' || excluded.has(entry.name)) continue;
      await walk(path.join(dir, entry.name));
    }
  }
  await walk(base);
  return libraries;
}

/** Listing alone may browse descendants when no local selection exists. */
export async function resolveListRoot(selector: StoreSelectorOptions, output: {
  json?: boolean; allowImplicitRoot?: boolean;
}): Promise<ResolvedOpenSpecRoot> {
  if (selector.store === undefined && selector.storePath === undefined &&
      !findQualifyingRootSync(process.cwd()) && (await discoverListLibraries(process.cwd())).length) {
    const cwd = await fs.realpath(process.cwd());
    return {
      path: cwd,
      changesDir: path.join(cwd, 'openspec', 'changes'),
      specsDir: path.join(cwd, 'openspec', 'specs'),
      archiveDir: path.join(cwd, 'openspec', 'changes', 'archive'),
      defaultSchema: 'spec-driven',
      source: 'implicit',
    };
  }
  const root = await resolveOpenSpecRoot({ ...selector, allowImplicitRoot: output.allowImplicitRoot });
  if (!output.json) emitStoreRootBanner(root);
  return root;
}
