import {
  getGlobalConfigPath,
  getGlobalConfig,
  saveGlobalConfig,
  GlobalConfig,
} from './global-config.js';
import {
  getNestedValue,
  setNestedValue,
  deleteNestedValue,
  coerceValue,
  validateConfigKeyPath,
  validateConfig,
  DEFAULT_CONFIG,
} from './config-schema.js';

const FORBIDDEN_PATH_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

function assertSafeConfigKeyPath(path: string): void {
  for (const part of path.split('.')) {
    if (FORBIDDEN_PATH_KEYS.has(part)) {
      throw new Error(`Invalid configuration key "${path}". Unsafe path segment "${part}".`);
    }
  }
}

export function getConfigPath(): string {
  return getGlobalConfigPath();
}

export function getConfigList(): GlobalConfig {
  return getGlobalConfig();
}

export function getConfigValue(key: string): unknown {
  assertSafeConfigKeyPath(key);
  const config = getGlobalConfig();
  return getNestedValue(config as Record<string, unknown>, key);
}

export function setConfigValue(
  key: string,
  value: string,
  options: { forceString?: boolean; allowUnknown?: boolean } = {}
): { key: string; value: unknown; displayValue: string } {
  assertSafeConfigKeyPath(key);
  const allowUnknown = Boolean(options.allowUnknown);
  const keyValidation = validateConfigKeyPath(key);

  if (!keyValidation.valid && !allowUnknown) {
    const reason = keyValidation.reason ? ` ${keyValidation.reason}.` : '';
    throw new Error(`Invalid configuration key "${key}".${reason}`);
  }

  const config = getGlobalConfig() as Record<string, unknown>;
  const coercedValue = coerceValue(value, options.forceString || false);

  const newConfig = JSON.parse(JSON.stringify(config));
  setNestedValue(newConfig, key, coercedValue);

  const validation = validateConfig(newConfig);
  if (!validation.success || !validation.data) {
    throw new Error(`Invalid configuration - ${validation.error || 'Unknown error'}`);
  }

  // Use the validated/transformed data from the schema
  saveGlobalConfig(validation.data as GlobalConfig);

  const displayValue =
    typeof coercedValue === 'string' ? `"${coercedValue}"` : String(coercedValue);

  return { key, value: coercedValue, displayValue };
}

export function unsetConfigValue(key: string): boolean {
  assertSafeConfigKeyPath(key);
  const config = getGlobalConfig() as Record<string, unknown>;
  const existed = deleteNestedValue(config, key);

  if (existed) {
    // Validate after deletion to ensure schema defaults are applied if necessary
    const validation = validateConfig(config);
    if (validation.success && validation.data) {
      saveGlobalConfig(validation.data as GlobalConfig);
    } else {
      saveGlobalConfig(config as GlobalConfig);
    }
  }

  return existed;
}

export function resetConfig(all: boolean): boolean {
  if (!all) {
    throw new Error('All flag is required for reset');
  }

  saveGlobalConfig({ ...DEFAULT_CONFIG });
  return true;
}
