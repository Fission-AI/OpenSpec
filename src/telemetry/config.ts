/**
 * Global configuration for telemetry state.
 * Stores anonymous ID and notice-seen flag in ~/.config/openspec/config.json
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

export interface TelemetryConfig {
  anonymousId?: string;
  noticeSeen?: boolean;
}

export interface GlobalConfig {
  telemetry?: TelemetryConfig;
  [key: string]: unknown; // Preserve other fields
}

/**
 * Get the path to the global config file.
 * Uses ~/.config/openspec/config.json on all platforms.
 */
export function getConfigPath(): string {
  const configDir = path.join(os.homedir(), '.config', 'openspec');
  return path.join(configDir, 'config.json');
}

/**
 * Read the global config file.
 * Returns an empty object if the file doesn't exist.
 */
export async function readConfig(): Promise<GlobalConfig> {
  const configPath = getConfigPath();
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as GlobalConfig;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {};
    }
    // If parse fails or other error, return empty config
    return {};
  }
}

/**
 * Write to the global config file.
 * Preserves existing fields and merges in new values.
 */
export async function writeConfig(updates: Partial<GlobalConfig>): Promise<void> {
  const configPath = getConfigPath();
  const configDir = path.dirname(configPath);

  // Ensure directory exists
  await fs.mkdir(configDir, { recursive: true });

  // Read existing config and merge
  const existing = await readConfig();
  const merged = { ...existing, ...updates };

  // Deep merge for telemetry object
  if (updates.telemetry && existing.telemetry) {
    merged.telemetry = { ...existing.telemetry, ...updates.telemetry };
  }

  await fs.writeFile(configPath, JSON.stringify(merged, null, 2) + '\n');
}

/**
 * Get the telemetry config section.
 */
export async function getTelemetryConfig(): Promise<TelemetryConfig> {
  const config = await readConfig();
  return config.telemetry ?? {};
}

/**
 * Update the telemetry config section.
 */
export async function updateTelemetryConfig(updates: Partial<TelemetryConfig>): Promise<void> {
  const existing = await getTelemetryConfig();
  await writeConfig({
    telemetry: { ...existing, ...updates },
  });
}
