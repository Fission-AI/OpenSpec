/**
 * The curated plugin marketplace registry.
 *
 * The registry is a versioned JSON document shipped with the package
 * (`schemas/plugins/registry.json`). It powers discovery (`plugin search`) and
 * `plugin add <id>` for listed plugins. There is no network dependency: a future
 * change can add a refreshable remote index behind the same interface.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGlobalConfig } from '../global-config.js';

export const SUPPORTED_REGISTRY_VERSION = 1;

export interface RegistryEntry {
  id: string;
  npm: string;
  namespace: string;
  openspecCompat: string;
  summary: string;
  homepage?: string;
}

interface RegistryDocument {
  registryVersion: number;
  plugins: RegistryEntry[];
}

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryError';
  }
}

/** Path to the built-in registry index shipped with the package. */
export function getPackageRegistryPath(): string {
  const currentFile = fileURLToPath(import.meta.url);
  // dist/core/plugins/ -> package root -> schemas/plugins/registry.json
  return path.join(path.dirname(currentFile), '..', '..', '..', 'schemas', 'plugins', 'registry.json');
}

/** Resolve the active registry path (global config override wins over the built-in). */
export function resolveRegistryPath(): string {
  const override = getGlobalConfig().plugins?.registry;
  if (override && override.trim() !== '') {
    return path.resolve(override);
  }
  return getPackageRegistryPath();
}

/**
 * Load the registry index. Throws RegistryError on an unsupported version or
 * unreadable/malformed document so callers can report it instead of guessing.
 */
export function loadRegistry(registryPath: string = resolveRegistryPath()): RegistryEntry[] {
  if (!fs.existsSync(registryPath)) {
    throw new RegistryError(`Plugin registry not found at ${registryPath}`);
  }

  let doc: RegistryDocument;
  try {
    doc = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  } catch (error) {
    throw new RegistryError(`Plugin registry is not valid JSON: ${(error as Error).message}`);
  }

  if (typeof doc.registryVersion !== 'number') {
    throw new RegistryError('Plugin registry is missing a numeric "registryVersion"');
  }
  if (doc.registryVersion > SUPPORTED_REGISTRY_VERSION) {
    throw new RegistryError(
      `Plugin registry version ${doc.registryVersion} is newer than supported version ${SUPPORTED_REGISTRY_VERSION}. Update OpenSpec to use it.`
    );
  }
  if (!Array.isArray(doc.plugins)) {
    throw new RegistryError('Plugin registry "plugins" must be an array');
  }

  return doc.plugins;
}

/** Find a single registry entry by id or npm package name. */
export function findRegistryEntry(idOrNpm: string, entries: RegistryEntry[] = loadRegistry()): RegistryEntry | undefined {
  return entries.find((e) => e.id === idOrNpm || e.npm === idOrNpm);
}

/** Filter registry entries by a free-text query over id, npm, summary, and namespace. */
export function searchRegistry(query: string | undefined, entries: RegistryEntry[] = loadRegistry()): RegistryEntry[] {
  if (!query || query.trim() === '') return entries;
  const q = query.toLowerCase();
  return entries.filter((e) =>
    [e.id, e.npm, e.namespace, e.summary].some((field) => field.toLowerCase().includes(q))
  );
}
