import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// Constants
export const GLOBAL_CONFIG_DIR_NAME = 'openspec';
export const GLOBAL_CONFIG_FILE_NAME = 'config.json';

// TypeScript interfaces
export interface GlobalConfig {
  featureFlags?: Record<string, boolean>;
}

const DEFAULT_CONFIG: GlobalConfig = {
  featureFlags: {}
};

/**
 * Gets the global configuration directory path following XDG Base Directory Specification.
 *
 * - Unix/macOS: $XDG_CONFIG_HOME/openspec/ or ~/.config/openspec/
 * - Windows: %APPDATA%/openspec/
 */
export function getGlobalConfigDir(): string {
  const platform = os.platform();

  if (platform === 'win32') {
    // Windows: use %APPDATA%
    const appData = process.env.APPDATA;
    if (appData) {
      return path.join(appData, GLOBAL_CONFIG_DIR_NAME);
    }
    // Fallback for Windows if APPDATA is not set
    return path.join(os.homedir(), 'AppData', 'Roaming', GLOBAL_CONFIG_DIR_NAME);
  }

  // Unix/macOS: use XDG_CONFIG_HOME or fallback to ~/.config
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, GLOBAL_CONFIG_DIR_NAME);
  }

  return path.join(os.homedir(), '.config', GLOBAL_CONFIG_DIR_NAME);
}

/**
 * Gets the path to the global config file.
 */
export function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), GLOBAL_CONFIG_FILE_NAME);
}

/**
 * Loads the global configuration from disk.
 * Returns default configuration if file doesn't exist or is invalid.
 * Merges loaded config with defaults to ensure new fields are available.
 */
export function getGlobalConfig(): GlobalConfig {
  const configPath = getGlobalConfigPath();

  try {
    if (!fs.existsSync(configPath)) {
      return { ...DEFAULT_CONFIG };
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Merge with defaults (loaded values take precedence)
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      // Deep merge featureFlags
      featureFlags: {
        ...DEFAULT_CONFIG.featureFlags,
        ...(parsed.featureFlags || {})
      }
    };
  } catch (error) {
    // Log warning for parse errors, but not for missing files
    if (error instanceof SyntaxError) {
      console.error(`Warning: Invalid JSON in ${configPath}, using defaults`);
    }
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Saves the global configuration to disk.
 * Creates the config directory if it doesn't exist.
 */
export function saveGlobalConfig(config: GlobalConfig): void {
  const configDir = getGlobalConfigDir();
  const configPath = getGlobalConfigPath();

  // Create directory if it doesn't exist
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}
