import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { getGlobalDataDir } from '../global-config.js';
import { PluginManifestSchema } from './types.js';
import type { PluginManifest, LoadedPlugin } from './types.js';

/**
 * Error thrown when loading a plugin fails.
 */
export class PluginLoadError extends Error {
  constructor(
    message: string,
    public readonly pluginName: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PluginLoadError';
  }
}

/**
 * Gets the project-local plugins directory path.
 * @param projectRoot - The project root directory
 */
export function getProjectPluginsDir(projectRoot: string): string {
  return path.join(projectRoot, 'openspec', 'plugins');
}

/**
 * Gets the user's global plugins directory path.
 * Follows XDG Base Directory Specification via getGlobalDataDir().
 */
export function getUserPluginsDir(): string {
  return path.join(getGlobalDataDir(), 'plugins');
}

/**
 * Gets the package's built-in plugins directory path.
 * Uses import.meta.url to resolve relative to the current module.
 */
export function getPackagePluginsDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  // Navigate from dist/core/plugin/ to package root's plugins/
  return path.join(path.dirname(currentFile), '..', '..', '..', 'plugins');
}

/**
 * Resolves a plugin name to its directory path.
 *
 * Resolution order (when projectRoot is provided):
 * 1. Project-local: <projectRoot>/openspec/plugins/<name>/plugin.yaml
 * 2. User global:   ${XDG_DATA_HOME}/openspec/plugins/<name>/plugin.yaml
 * 3. Package built-in: <package>/plugins/<name>/plugin.yaml
 *
 * @param name - Plugin name (e.g., "odoo-sdd")
 * @param projectRoot - Optional project root directory
 * @returns Object with dir and source, or null if not found
 */
export function resolvePluginDir(
  name: string,
  projectRoot?: string
): { dir: string; source: 'project' | 'user' | 'package' } | null {
  // 1. Check project-local directory (if projectRoot provided)
  if (projectRoot) {
    const projectDir = path.join(getProjectPluginsDir(projectRoot), name);
    if (fs.existsSync(path.join(projectDir, 'plugin.yaml'))) {
      return { dir: projectDir, source: 'project' };
    }
  }

  // 2. Check user global directory
  const userDir = path.join(getUserPluginsDir(), name);
  if (fs.existsSync(path.join(userDir, 'plugin.yaml'))) {
    return { dir: userDir, source: 'user' };
  }

  // 3. Check package built-in directory
  const packageDir = path.join(getPackagePluginsDir(), name);
  if (fs.existsSync(path.join(packageDir, 'plugin.yaml'))) {
    return { dir: packageDir, source: 'package' };
  }

  return null;
}

/**
 * Parses and validates a plugin.yaml manifest file.
 *
 * @param pluginDir - Directory containing plugin.yaml
 * @returns Parsed and validated PluginManifest
 * @throws PluginLoadError if file is missing, unparseable, or invalid
 */
export function parsePluginManifest(pluginDir: string): PluginManifest {
  const manifestPath = path.join(pluginDir, 'plugin.yaml');

  let content: string;
  try {
    content = fs.readFileSync(manifestPath, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new PluginLoadError(
      `Failed to read plugin manifest at '${manifestPath}': ${ioError.message}`,
      path.basename(pluginDir),
      ioError
    );
  }

  let raw: unknown;
  try {
    raw = parseYaml(content);
  } catch (err) {
    const parseError = err instanceof Error ? err : new Error(String(err));
    throw new PluginLoadError(
      `Failed to parse YAML at '${manifestPath}': ${parseError.message}`,
      path.basename(pluginDir),
      parseError
    );
  }

  const result = PluginManifestSchema.safeParse(raw);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new PluginLoadError(
      `Invalid plugin manifest at '${manifestPath}':\n${details}`,
      path.basename(pluginDir)
    );
  }

  return result.data;
}

/**
 * Minimal semver range checker.
 * Supports two patterns (the only ones we need):
 *   - ">=X.Y.Z"
 *   - ">=X.Y.Z <A.B.C"
 */
function parseSemver(version: string): [number, number, number] | null {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)];
}

function compareSemver(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function satisfiesRange(version: string, range: string): boolean {
  const current = parseSemver(version);
  if (!current) return false;

  // Pattern: ">=X.Y.Z <A.B.C"
  const dualMatch = range.match(/^>=\s*(\S+)\s+<\s*(\S+)$/);
  if (dualMatch) {
    const lower = parseSemver(dualMatch[1]);
    const upper = parseSemver(dualMatch[2]);
    if (!lower || !upper) return false;
    return compareSemver(current, lower) >= 0 && compareSemver(current, upper) < 0;
  }

  // Pattern: ">=X.Y.Z"
  const gteMatch = range.match(/^>=\s*(\S+)$/);
  if (gteMatch) {
    const lower = parseSemver(gteMatch[1]);
    if (!lower) return false;
    return compareSemver(current, lower) >= 0;
  }

  // Unsupported range format
  return false;
}

/**
 * Checks if the current OpenSpec version satisfies a plugin's required range.
 *
 * @param pluginName - Plugin name (for warning messages)
 * @param requiredRange - Semver range from plugin manifest (e.g., ">=1.0.0")
 * @returns true if compatible, false otherwise
 */
export function checkVersionCompatibility(
  pluginName: string,
  requiredRange: string | undefined
): boolean {
  // Read current version from package.json
  const currentFile = fileURLToPath(import.meta.url);
  const packageJsonPath = path.join(
    path.dirname(currentFile), '..', '..', '..', 'package.json'
  );

  let currentVersion: string;
  try {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    currentVersion = pkg.version;
  } catch {
    console.warn(`[plugin:${pluginName}] Could not read package.json version, skipping check`);
    return true;
  }

  if (!requiredRange) {
    console.warn(
      `[plugin:${pluginName}] No 'openspec' version range specified, assuming compatible`
    );
    return true;
  }

  return satisfiesRange(currentVersion, requiredRange);
}

/**
 * Lists all available plugin names across all tiers.
 *
 * @param projectRoot - Optional project root directory
 * @returns Array of unique plugin names
 */
function listAvailablePlugins(projectRoot?: string): string[] {
  const plugins = new Set<string>();

  const dirs = [getPackagePluginsDir(), getUserPluginsDir()];
  if (projectRoot) {
    dirs.push(getProjectPluginsDir(projectRoot));
  }

  for (const dir of dirs) {
    if (fs.existsSync(dir)) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (fs.existsSync(path.join(dir, entry.name, 'plugin.yaml'))) {
            plugins.add(entry.name);
          }
        }
      }
    }
  }

  return Array.from(plugins).sort();
}

/**
 * Loads plugins by name from a whitelist, resolving each through the three-tier system.
 *
 * This function resolves and parses plugins but does NOT validate plugin config
 * (that's config-validator's job).
 *
 * @param projectRoot - Project root directory
 * @param whitelist - Ordered list of plugin names to load
 * @returns Array of LoadedPlugin objects (preserving whitelist order)
 * @throws PluginLoadError if a plugin is not found or has an invalid manifest
 */
export function loadPlugins(
  projectRoot: string,
  whitelist: string[]
): LoadedPlugin[] {
  const loaded: LoadedPlugin[] = [];

  for (const name of whitelist) {
    // a. Resolve plugin dir
    const resolved = resolvePluginDir(name, projectRoot);

    // b. If not found, throw with available plugins list
    if (!resolved) {
      const available = listAvailablePlugins(projectRoot);
      throw new PluginLoadError(
        `Plugin '${name}' not found. Available plugins: ${available.length > 0 ? available.join(', ') : '(none)'}`,
        name
      );
    }

    // c. Parse manifest
    const manifest = parsePluginManifest(resolved.dir);

    // d. Check version compatibility
    const compatible = checkVersionCompatibility(name, manifest.openspec);
    if (!compatible) {
      throw new PluginLoadError(
        `Plugin '${name}' requires OpenSpec ${manifest.openspec}, which is not satisfied by the current version`,
        name
      );
    }

    // e. Build LoadedPlugin (config starts empty, populated by config-validator)
    loaded.push({
      manifest,
      dir: resolved.dir,
      source: resolved.source,
      config: {},
    });
  }

  return loaded;
}

/**
 * Resolves overlay file paths for a loaded plugin.
 * Returns a map of workflow ID → absolute file path.
 */
export function resolveOverlayPaths(
  plugin: LoadedPlugin
): Map<string, string> {
  const result = new Map<string, string>();
  const overlays = plugin.manifest.skill_overlays;
  if (!overlays) return result;

  for (const [workflowId, overlay] of Object.entries(overlays)) {
    result.set(workflowId, path.join(plugin.dir, overlay.append));
  }
  return result;
}

/**
 * Collects overlay content for a specific workflow from all active plugins.
 * Returns overlay contents in plugin whitelist order.
 * Warns (but continues) if a declared overlay file doesn't exist.
 */
export function getPluginOverlays(
  plugins: LoadedPlugin[],
  workflowId: string
): string[] {
  const contents: string[] = [];

  for (const plugin of plugins) {
    const paths = resolveOverlayPaths(plugin);
    const overlayPath = paths.get(workflowId);
    if (!overlayPath) continue;

    try {
      const content = fs.readFileSync(overlayPath, 'utf-8');
      contents.push(content);
    } catch {
      console.warn(
        `[plugin:${plugin.manifest.name}] Overlay file not found: ${overlayPath}`
      );
    }
  }

  return contents;
}
