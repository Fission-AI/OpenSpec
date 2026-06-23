/**
 * Plugin resolution.
 *
 * Discovers plugin manifests from three sources and resolves the active set,
 * mirroring the precedence model of the schema resolver:
 *
 *   1. Project   — ids enabled in openspec/config.yaml, resolved from node_modules
 *   2. User      — manifests in the user/global plugins directory
 *   3. Auto-detect — installed packages that declare a manifest (gated by config)
 *
 * Resolution reads and validates manifests only; it never imports plugin code.
 * Results are memoized per project root for the life of the process.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createRequire } from 'node:module';
import fg from 'fast-glob';
import { getGlobalConfig, getGlobalDataDir } from '../global-config.js';
import { loadManifestFromRoot, packageDeclaresPlugin, RESERVED_NAMESPACES } from './manifest.js';
import { satisfies } from './semver.js';
import { readProjectPluginConfig, isAutoDetectEnabled } from './config.js';
import type {
  PluginCollision,
  PluginLoadError,
  PluginResolution,
  PluginSourceTier,
  ResolvedPlugin,
} from './types.js';

const require = createRequire(import.meta.url);

let cachedVersion: string | undefined;

/** The running OpenSpec version, read from the package manifest. */
export function getOpenSpecVersion(): string {
  if (cachedVersion) return cachedVersion;
  try {
    const pkg = require('../../../package.json') as { version: string };
    cachedVersion = pkg.version;
  } catch {
    cachedVersion = '0.0.0';
  }
  return cachedVersion;
}

/** Path to the user/global plugins directory. */
export function getUserPluginsDir(): string {
  return path.join(getGlobalDataDir(), 'plugins');
}

interface Candidate {
  root: string;
  /** 'node_modules' candidates may become 'project' or 'auto-detect'; 'user' is fixed. */
  origin: 'node_modules' | 'user';
}

function discoverNodeModulesCandidates(projectRoot: string): Candidate[] {
  const nodeModules = path.join(projectRoot, 'node_modules');
  if (!fs.existsSync(nodeModules)) return [];

  // Top-level and single-level scoped package manifests only — plugins are direct deps.
  const matches = fg.sync(['*/package.json', '@*/*/package.json'], {
    cwd: nodeModules,
    absolute: true,
    dot: false,
    suppressErrors: true,
  });

  const candidates: Candidate[] = [];
  for (const pkgJsonPath of matches) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
      if (packageDeclaresPlugin(pkg)) {
        candidates.push({ root: path.dirname(pkgJsonPath), origin: 'node_modules' });
      }
    } catch {
      // Ignore unreadable package.json files during discovery.
    }
  }
  return candidates;
}

function discoverUserCandidates(): Candidate[] {
  const dir = getUserPluginsDir();
  if (!fs.existsSync(dir)) return [];
  const candidates: Candidate[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() || entry.isSymbolicLink()) {
      candidates.push({ root: path.join(dir, entry.name), origin: 'user' });
    }
  }
  return candidates;
}

const cache = new Map<string, PluginResolution>();

/** Clear the resolution cache (test support). */
export function clearPluginResolutionCache(): void {
  cache.clear();
}

/**
 * Resolve the active plugin set for a project. Reads manifests only.
 */
export function resolvePlugins(projectRoot: string = process.cwd()): PluginResolution {
  const key = path.resolve(projectRoot);
  const cached = cache.get(key);
  if (cached) return cached;

  const version = getOpenSpecVersion();
  const projectEnabled = new Set(readProjectPluginConfig(projectRoot).enabled);
  const globalEnabled = new Set(getGlobalConfig().plugins?.enabled ?? []);
  const autoDetect = isAutoDetectEnabled(projectRoot);

  const errors: PluginLoadError[] = [];
  // Best resolved plugin per id, keyed by id with tier precedence applied.
  const byId = new Map<string, ResolvedPlugin>();

  const candidates = [...discoverNodeModulesCandidates(projectRoot), ...discoverUserCandidates()];

  for (const candidate of candidates) {
    let loaded;
    try {
      loaded = loadManifestFromRoot(candidate.root, RESERVED_NAMESPACES);
    } catch (error) {
      errors.push({
        id: path.basename(candidate.root),
        packageRoot: candidate.root,
        source: candidate.origin === 'user' ? 'user' : 'auto-detect',
        error: (error as Error).message,
      });
      continue;
    }
    if (!loaded) continue;

    const { manifest, version: pkgVersion } = loaded;
    const id = manifest.id;

    let source: PluginSourceTier;
    let enabled: boolean;
    if (candidate.origin === 'user') {
      source = 'user';
      enabled = true;
    } else if (projectEnabled.has(id)) {
      source = 'project';
      enabled = true;
    } else {
      source = 'auto-detect';
      enabled = autoDetect || globalEnabled.has(id);
    }

    const resolved: ResolvedPlugin = {
      id,
      namespace: manifest.namespace,
      manifest,
      packageRoot: candidate.root,
      source,
      version: pkgVersion,
      compatible: satisfies(version, manifest.openspecCompat),
      enabled,
    };

    const existing = byId.get(id);
    if (!existing || tierRank(resolved.source) > tierRank(existing.source)) {
      byId.set(id, resolved);
    }
  }

  const plugins = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
  const collisions = detectCollisions(plugins);

  const resolution: PluginResolution = { plugins, errors, collisions };
  cache.set(key, resolution);
  return resolution;
}

function tierRank(source: PluginSourceTier): number {
  return source === 'project' ? 3 : source === 'user' ? 2 : 1;
}

function detectCollisions(plugins: ResolvedPlugin[]): PluginCollision[] {
  const collisions: PluginCollision[] = [];
  const active = plugins.filter((p) => p.enabled && p.compatible);

  const byNamespace = new Map<string, ResolvedPlugin[]>();
  for (const plugin of active) {
    const list = byNamespace.get(plugin.namespace) ?? [];
    list.push(plugin);
    byNamespace.set(plugin.namespace, list);
  }
  for (const [namespace, group] of byNamespace) {
    if (group.length > 1) {
      collisions.push({ kind: 'namespace', value: namespace, pluginRoots: group.map((p) => p.packageRoot) });
    }
  }
  return collisions;
}

/** Namespaces involved in a collision should not be registered. */
export function collidingNamespaces(resolution: PluginResolution): Set<string> {
  return new Set(resolution.collisions.filter((c) => c.kind === 'namespace').map((c) => c.value));
}

/** Plugins that should be surfaced as runnable commands: enabled, compatible, non-colliding. */
export function activePlugins(resolution: PluginResolution): ResolvedPlugin[] {
  const colliding = collidingNamespaces(resolution);
  return resolution.plugins.filter(
    (p) => p.enabled && p.compatible && !colliding.has(p.namespace)
  );
}
