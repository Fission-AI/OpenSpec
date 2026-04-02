import type { PluginManifest, LoadedPlugin, ConfigField } from './types.js';

/**
 * Validate a single plugin's config against its manifest declarations.
 *
 * Manifest config structure: { [category]: { [field]: ConfigField } }
 * User config structure: { [category]: { [field]: value } }
 */
export function validatePluginConfig(
  pluginName: string,
  manifest: PluginManifest,
  pluginConfig: Record<string, unknown> | undefined
): { resolved: Record<string, Record<string, unknown>>; errors: string[] } {
  const resolved: Record<string, Record<string, unknown>> = {};
  const errors: string[] = [];

  if (!manifest.config) {
    return { resolved, errors };
  }

  for (const [category, fields] of Object.entries(manifest.config)) {
    const categoryConfig =
      pluginConfig &&
      typeof pluginConfig[category] === 'object' &&
      pluginConfig[category] !== null
        ? (pluginConfig[category] as Record<string, unknown>)
        : undefined;

    resolved[category] = {};

    for (const [field, schema] of Object.entries(fields)) {
      const value = categoryConfig?.[field];

      if (value === undefined || value === null) {
        if (schema.required) {
          errors.push(
            `[${pluginName}] Missing required config: ${category}.${field}`
          );
          continue;
        }
        if (schema.default !== undefined) {
          resolved[category][field] = schema.default;
        }
        continue;
      }

      // Type check
      const actualType = typeof value;
      if (actualType !== schema.type) {
        errors.push(
          `[${pluginName}] Config ${category}.${field}: expected ${schema.type}, got ${actualType}`
        );
        continue;
      }

      resolved[category][field] = value;
    }
  }

  return { resolved, errors };
}

/**
 * Validate config for all loaded plugins.
 * Returns only plugins that pass validation.
 * Warns about config keys that don't match any loaded plugin.
 */
export function validateAllPluginConfigs(
  loadedPlugins: LoadedPlugin[],
  pluginConfigMap: Record<string, unknown> | undefined
): { plugins: LoadedPlugin[]; errors: string[] } {
  const validPlugins: LoadedPlugin[] = [];
  const allErrors: string[] = [];

  const pluginNames = new Set(loadedPlugins.map((p) => p.manifest.name));

  for (const plugin of loadedPlugins) {
    const name = plugin.manifest.name;
    const rawConfig =
      pluginConfigMap &&
      typeof pluginConfigMap[name] === 'object' &&
      pluginConfigMap[name] !== null
        ? (pluginConfigMap[name] as Record<string, unknown>)
        : undefined;

    const { resolved, errors } = validatePluginConfig(
      name,
      plugin.manifest,
      rawConfig
    );

    if (errors.length > 0) {
      allErrors.push(...errors);
    } else {
      plugin.config = resolved;
      validPlugins.push(plugin);
    }
  }

  // Warn about unknown plugin config keys
  if (pluginConfigMap && typeof pluginConfigMap === 'object') {
    for (const key of Object.keys(pluginConfigMap)) {
      if (!pluginNames.has(key)) {
        allErrors.push(
          `Config for unknown plugin: "${key}" (no matching loaded plugin)`
        );
      }
    }
  }

  return { plugins: validPlugins, errors: allErrors };
}

/**
 * Flatten nested plugin config to environment variables.
 *
 * Pattern: OPENSPEC_PLUGIN_CONFIG_{CATEGORY}_{FIELD} (uppercase, hyphens to underscores)
 * Example: category "obsidian", field "vault-path" -> OPENSPEC_PLUGIN_CONFIG_OBSIDIAN_VAULT_PATH
 */
export function flattenConfigToEnvVars(
  _pluginName: string,
  config: Record<string, Record<string, unknown>>
): Record<string, string> {
  const env: Record<string, string> = {};

  for (const [category, fields] of Object.entries(config)) {
    const categoryKey = category.toUpperCase().replace(/-/g, '_');

    for (const [field, value] of Object.entries(fields)) {
      const fieldKey = field.toUpperCase().replace(/-/g, '_');
      const envKey = `OPENSPEC_PLUGIN_CONFIG_${categoryKey}_${fieldKey}`;

      if (typeof value === 'boolean') {
        env[envKey] = value ? 'true' : 'false';
      } else {
        env[envKey] = String(value);
      }
    }
  }

  return env;
}
