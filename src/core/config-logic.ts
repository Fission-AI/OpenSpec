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

export function getConfigPath(): string {
  return getGlobalConfigPath();
}

export function getConfigList(): GlobalConfig {
  return getGlobalConfig();
}

export function getConfigValue(key: string): unknown {
  const config = getGlobalConfig();
  return getNestedValue(config as Record<string, unknown>, key);
}

export function setConfigValue(
  key: string,
  value: string,
  options: { forceString?: boolean; allowUnknown?: boolean } = {}
): { key: string; value: unknown; displayValue: string } {
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
  if (!validation.success) {
    throw new Error(`Invalid configuration - ${validation.error}`);
  }

  setNestedValue(config, key, coercedValue);
  saveGlobalConfig(config as GlobalConfig);

  const displayValue =
    typeof coercedValue === 'string' ? `"${coercedValue}"` : String(coercedValue);

  return { key, value: coercedValue, displayValue };
}

export function unsetConfigValue(key: string): boolean {
  const config = getGlobalConfig() as Record<string, unknown>;
  const existed = deleteNestedValue(config, key);

  if (existed) {
    saveGlobalConfig(config as GlobalConfig);
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
