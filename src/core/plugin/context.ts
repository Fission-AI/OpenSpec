import { readProjectConfig } from '../project-config.js';
import { loadPlugins } from './loader.js';
import { validateAllPluginConfigs } from './config-validator.js';
import type { LoadedPlugin } from './types.js';

let cachedPlugins: LoadedPlugin[] | null = null;
let cachedProjectRoot: string | null = null;

/**
 * Lazily load and cache plugins for the current project.
 * Returns empty array if no plugins configured.
 *
 * This avoids requiring every call site to manually load plugins.
 * Cache is invalidated if projectRoot changes.
 */
export function getLoadedPlugins(projectRoot: string): LoadedPlugin[] {
  if (cachedPlugins !== null && cachedProjectRoot === projectRoot) {
    return cachedPlugins;
  }

  const config = readProjectConfig(projectRoot);
  if (!config?.plugins || config.plugins.length === 0) {
    cachedPlugins = [];
    cachedProjectRoot = projectRoot;
    return cachedPlugins;
  }

  try {
    const loaded = loadPlugins(projectRoot, config.plugins);
    const validated = validateAllPluginConfigs(
      loaded,
      config.plugin_config as Record<string, unknown> | undefined
    );

    if (validated.errors.length > 0) {
      for (const err of validated.errors) {
        console.warn(`Plugin config: ${err}`);
      }
    }

    cachedPlugins = validated.plugins;
    cachedProjectRoot = projectRoot;
    return cachedPlugins;
  } catch (err) {
    console.warn(`Plugin loading failed: ${(err as Error).message}`);
    cachedPlugins = [];
    cachedProjectRoot = projectRoot;
    return cachedPlugins;
  }
}

/**
 * Clear plugin cache (useful for testing).
 */
export function clearPluginCache(): void {
  cachedPlugins = null;
  cachedProjectRoot = null;
}
