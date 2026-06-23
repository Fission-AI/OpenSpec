/**
 * Shared types for the OpenSpec plugin system.
 *
 * A plugin is an npm package (or a manifest in the user plugins directory) that
 * declares an OpenSpec manifest. OpenSpec discovers plugins, surfaces each under
 * a reserved command namespace, and delegates execution to the plugin's own
 * executable as a child process. Plugin code is never imported into the OpenSpec
 * process; resolution reads manifests only.
 */

/** The tier a plugin was resolved from, in precedence order. */
export type PluginSourceTier = 'project' | 'user' | 'auto-detect';

/** A subcommand a plugin surfaces, used for help text and completion only. */
export interface PluginCommandDescriptor {
  name: string;
  summary?: string;
}

/** A skill a plugin contributes for installation into AI tool directories. */
export interface PluginSkillContribution {
  /** Directory name the skill is installed as (e.g. "openlore-orient"). */
  dir: string;
  /** Path to the skill source within the plugin package. */
  source: string;
}

/**
 * The declarative plugin manifest. Published either as the `"openspec"` key in a
 * package's package.json, or as a standalone `openspec.plugin.json` file.
 */
export interface PluginManifest {
  manifestVersion: number;
  id: string;
  namespace: string;
  /** Executable path relative to the package root (preferred). */
  bin?: string;
  /** Command + args to invoke instead of `bin` (e.g. ["npx", "openlore"]). */
  binArgs?: string[];
  /** Semver range of OpenSpec versions this plugin supports. */
  openspecCompat: string;
  displayName?: string;
  summary?: string;
  commands?: PluginCommandDescriptor[];
  skills?: PluginSkillContribution[];
  workflows?: string[];
  ownsConfigKeys?: string[];
  /** Unknown fields are preserved for forward compatibility. */
  [key: string]: unknown;
}

/** A plugin discovered on disk, with its manifest and provenance. */
export interface ResolvedPlugin {
  id: string;
  namespace: string;
  manifest: PluginManifest;
  /** Absolute path to the package/manifest root. */
  packageRoot: string;
  source: PluginSourceTier;
  /** Resolved package version, when available. */
  version?: string;
  /** True when the plugin's openspecCompat range includes the running version. */
  compatible: boolean;
  /** Whether the plugin is enabled (project/global config or user-tier presence). */
  enabled: boolean;
}

/** A plugin manifest that failed to load or validate. */
export interface PluginLoadError {
  /** Best-effort id (manifest id, or package name) for reporting. */
  id: string;
  packageRoot: string;
  source: PluginSourceTier;
  error: string;
}

/** A namespace/id collision between two resolved plugins. */
export interface PluginCollision {
  kind: 'id' | 'namespace';
  value: string;
  pluginRoots: string[];
}

/** The full result of resolving the active plugin set. */
export interface PluginResolution {
  plugins: ResolvedPlugin[];
  errors: PluginLoadError[];
  collisions: PluginCollision[];
}
