/**
 * Global configuration for telemetry state.
 * Stores anonymous ID and notice-seen flag in the platform-appropriate config directory.
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

// Constants
export const CONFIG_DIR_NAME = 'openspec';
export const CONFIG_FILE_NAME = 'config.json';

export interface TelemetryConfig {
  anonymousId?: string;
  noticeSeen?: boolean;
}

export interface GlobalConfig {
  telemetry?: TelemetryConfig;
  [key: string]: unknown; // Preserve other fields
}

function getConfigDir(): string {
  // XDG_CONFIG_HOME takes precedence on all platforms when explicitly set
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, CONFIG_DIR_NAME);
  }

  const platform = os.platform();

  if (platform === 'win32') {
    // Windows: use %APPDATA%
    const appData = process.env.APPDATA;
    if (appData) {
      return path.join(appData, CONFIG_DIR_NAME);
    }
    // Fallback for Windows if APPDATA is not set
    return path.join(os.homedir(), 'AppData', 'Roaming', CONFIG_DIR_NAME);
  }

  // Unix/macOS fallback: ~/.config
  return path.join(os.homedir(), '.config', CONFIG_DIR_NAME);
}

/**
 * Get the path to the global config file.
 * Follows XDG Base Directory Specification and platform conventions.
 *
 * - All platforms: $XDG_CONFIG_HOME/openspec/ if XDG_CONFIG_HOME is set
 * - Unix/macOS fallback: ~/.config/openspec/
 * - Windows fallback: %APPDATA%/openspec/
 */
export function getConfigPath(): string {
  const configDir = getConfigDir();
  return path.join(configDir, CONFIG_FILE_NAME);
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
