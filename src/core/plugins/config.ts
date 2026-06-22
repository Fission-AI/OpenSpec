/**
 * Reading and writing plugin enablement.
 *
 * Project-tier enablement lives in the project `openspec/config.yaml` under a
 * `plugins` block and is committed/shared by the team. Because the project config
 * schema is not passthrough and OpenSpec's loader drops unknown keys, writes here
 * go through the YAML Document API so unrelated and unknown keys (for example the
 * `openlore` metadata block) are preserved.
 *
 * User-level preferences (auto-detect default, registry, user-tier plugins) live
 * in the global config and are read from there.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseDocument, isMap } from 'yaml';
import { getGlobalConfig } from '../global-config.js';

export interface ProjectPluginConfig {
  enabled: string[];
  autoDetect?: boolean;
}

function projectConfigPath(projectRoot: string): string | null {
  const yamlPath = path.join(projectRoot, 'openspec', 'config.yaml');
  if (fs.existsSync(yamlPath)) return yamlPath;
  const ymlPath = path.join(projectRoot, 'openspec', 'config.yml');
  if (fs.existsSync(ymlPath)) return ymlPath;
  return null;
}

/**
 * Read the project `plugins` block from openspec/config.yaml.
 * Returns enabled ids and the project-level autoDetect override (if any).
 */
export function readProjectPluginConfig(projectRoot: string): ProjectPluginConfig {
  const configPath = projectConfigPath(projectRoot);
  if (!configPath) return { enabled: [] };

  try {
    const doc = parseDocument(fs.readFileSync(configPath, 'utf-8'));
    const plugins = doc.get('plugins');
    if (!plugins || typeof plugins !== 'object') return { enabled: [] };

    const json = doc.toJS() as { plugins?: { enabled?: unknown; autoDetect?: unknown } };
    const block = json.plugins ?? {};
    const enabled = Array.isArray(block.enabled)
      ? block.enabled.filter((v): v is string => typeof v === 'string')
      : [];
    const autoDetect = typeof block.autoDetect === 'boolean' ? block.autoDetect : undefined;
    return { enabled, autoDetect };
  } catch {
    // Malformed config is surfaced elsewhere (readProjectConfig); treat as none here.
    return { enabled: [] };
  }
}

/**
 * Set the project `plugins.enabled` list, preserving every other key in the file.
 *
 * @returns true if the file was written, false if there was no config file to edit.
 */
export function writeProjectPluginEnabled(projectRoot: string, enabled: string[]): boolean {
  const configPath = projectConfigPath(projectRoot);
  if (!configPath) return false;

  const doc = parseDocument(fs.readFileSync(configPath, 'utf-8'));

  let plugins = doc.get('plugins');
  if (!isMap(plugins)) {
    doc.set('plugins', { enabled });
  } else {
    plugins.set('enabled', enabled);
  }

  fs.writeFileSync(configPath, doc.toString(), 'utf-8');
  return true;
}

/** Add a plugin id to the project enabled list (idempotent). Returns true if written. */
export function enableProjectPlugin(projectRoot: string, id: string): boolean {
  const { enabled } = readProjectPluginConfig(projectRoot);
  if (enabled.includes(id)) return writeProjectPluginEnabled(projectRoot, enabled);
  return writeProjectPluginEnabled(projectRoot, [...enabled, id]);
}

/** Remove a plugin id from the project enabled list. Returns true if written. */
export function disableProjectPlugin(projectRoot: string, id: string): boolean {
  const { enabled } = readProjectPluginConfig(projectRoot);
  return writeProjectPluginEnabled(
    projectRoot,
    enabled.filter((e) => e !== id)
  );
}

/** Whether auto-detect is effectively enabled (project override wins over global; default true). */
export function isAutoDetectEnabled(projectRoot: string): boolean {
  const project = readProjectPluginConfig(projectRoot);
  if (typeof project.autoDetect === 'boolean') return project.autoDetect;
  const global = getGlobalConfig();
  if (typeof global.plugins?.autoDetect === 'boolean') return global.plugins.autoDetect;
  return true;
}
