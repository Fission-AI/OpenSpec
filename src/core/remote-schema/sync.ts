import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { validateRemoteSchemaDirectory } from '../artifact-graph/schema-directory.js';
import { getGlobalDataDir } from '../global-config.js';
import { readProjectConfig } from '../project-config.js';
import { installRemoteSchemaCache, verifyRemoteSchemaCache } from './cache.js';
import { fetchSchemaBundleFromGit } from './git.js';
import { getSchemaLockPath, readSchemaLock, writeSchemaLock } from './lockfile.js';
import { assertNoProjectSchemaConflict } from './authority.js';
import { withSchemaSyncLock } from './sync-lock.js';
import type {
  GitSchemaSource,
  RemoteSchemaLock,
  RemoteSchemaLockEntry,
} from './types.js';

export interface SyncRemoteSchemasOptions {
  name?: string;
  locked?: boolean;
  globalDataDir?: string;
}

export interface SyncedRemoteSchema {
  name: string;
  git: string;
  requestedRef: string;
  resolvedCommit: string;
  bundlePath: string;
  integrity: string;
  cachePath: string;
  restored: boolean;
}

export interface SyncRemoteSchemasResult {
  mode: 'update' | 'locked';
  lockfile: string;
  locked: boolean;
  schemas: SyncedRemoteSchema[];
  status: Array<{
    level: 'error' | 'warning';
    code: string;
    message: string;
  }>;
}

function sourceMatchesLock(
  source: GitSchemaSource,
  entry: RemoteSchemaLockEntry
): boolean {
  return (
    source.git === entry.git &&
    source.ref === entry.requestedRef &&
    source.path === entry.bundlePath
  );
}

function selectedSources(
  sources: Record<string, GitSchemaSource>,
  name: string | undefined
): Array<[string, GitSchemaSource]> {
  if (name !== undefined) {
    const source = sources[name];
    if (!source) {
      throw new Error(`Remote schema '${name}' is not declared in openspec/config.yaml`);
    }
    return [[name, source]];
  }
  return Object.entries(sources).sort(([left], [right]) => left.localeCompare(right));
}

export async function syncRemoteSchemas(
  projectRoot: string,
  options: SyncRemoteSchemasOptions = {}
): Promise<SyncRemoteSchemasResult> {
  return withSchemaSyncLock(projectRoot, () =>
    syncRemoteSchemasUnlocked(projectRoot, options)
  );
}

async function syncRemoteSchemasUnlocked(
  projectRoot: string,
  options: SyncRemoteSchemasOptions
): Promise<SyncRemoteSchemasResult> {
  const config = readProjectConfig(projectRoot);
  const sources = config?.schemaSources;
  if (!sources || Object.keys(sources).length === 0) {
    throw new Error('No remote schema sources are declared in openspec/config.yaml');
  }

  const selected = selectedSources(sources, options.name);
  for (const [name] of selected) {
    assertNoProjectSchemaConflict(projectRoot, name);
  }
  let currentLock: RemoteSchemaLock | null;
  try {
    currentLock = readSchemaLock(projectRoot);
  } catch (error) {
    if (options.locked || options.name !== undefined) {
      throw new Error(
        `${
          error instanceof Error ? error.message : String(error)
        }; run 'openspec schema sync' without a schema name to rebuild it`
      );
    }
    currentLock = null;
  }
  if (options.locked && !currentLock) {
    throw new Error(
      "Remote schema lockfile is missing; run 'openspec schema sync' to create it"
    );
  }

  const globalDataDir = options.globalDataDir ?? getGlobalDataDir();
  const nextEntries: Record<string, RemoteSchemaLockEntry> =
    options.name === undefined
      ? {}
      : { ...(currentLock?.schemas ?? {}) };
  const results: SyncedRemoteSchema[] = [];

  for (const [name, source] of selected) {
    const lockedEntry = currentLock?.schemas[name];
    if (options.locked) {
      if (!lockedEntry) {
        throw new Error(`Remote schema '${name}' is missing from the lockfile`);
      }
      if (!sourceMatchesLock(source, lockedEntry)) {
        throw new Error(
          `Remote schema '${name}' lock does not match the configured source; run 'openspec schema sync' to update it`
        );
      }
      try {
        const cacheDir = verifyRemoteSchemaCache(lockedEntry.integrity, globalDataDir);
        validateRemoteSchemaDirectory(cacheDir, name);
        results.push({
          name,
          git: source.git,
          requestedRef: source.ref,
          resolvedCommit: lockedEntry.resolvedCommit,
          bundlePath: source.path,
          integrity: lockedEntry.integrity,
          cachePath: cacheDir,
          restored: false,
        });
        continue;
      } catch {
        // Explicit --locked sync restores a missing or corrupt entry from the exact commit.
      }
    }

    const extractionDir = fs.mkdtempSync(
      path.join(os.tmpdir(), `openspec-schema-${name}-`)
    );
    try {
      const fetched = await fetchSchemaBundleFromGit({
        git: source.git,
        requestedRef: source.ref,
        lockedCommit: options.locked ? lockedEntry?.resolvedCommit : undefined,
        bundlePath: source.path,
        destinationDir: extractionDir,
      });
      validateRemoteSchemaDirectory(extractionDir, name);
      if (options.locked && fetched.integrity !== lockedEntry?.integrity) {
        throw new Error(
          `Remote schema '${name}' content does not match the lockfile integrity`
        );
      }
      const cacheDir = installRemoteSchemaCache(
        extractionDir,
        fetched.integrity,
        globalDataDir
      );
      results.push({
        name,
        git: source.git,
        requestedRef: source.ref,
        resolvedCommit: fetched.resolvedCommit,
        bundlePath: source.path,
        integrity: fetched.integrity,
        cachePath: cacheDir,
        restored: Boolean(options.locked),
      });
      if (!options.locked) {
        nextEntries[name] = {
          git: source.git,
          requestedRef: source.ref,
          resolvedCommit: fetched.resolvedCommit,
          bundlePath: source.path,
          integrity: fetched.integrity,
        };
      }
    } finally {
      fs.rmSync(extractionDir, { recursive: true, force: true });
    }
  }

  if (!options.locked) {
    const nextLock: RemoteSchemaLock = { version: 1, schemas: nextEntries };
    writeSchemaLock(projectRoot, nextLock);
  }

  return {
    mode: options.locked ? 'locked' : 'update',
    lockfile: getSchemaLockPath(projectRoot),
    locked: Boolean(options.locked),
    schemas: results,
    status: [],
  };
}
