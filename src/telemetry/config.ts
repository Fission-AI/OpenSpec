/**
 * 遥测状态的全局配置。
 * 将匿名 ID 和通知已见标志存储在平台相应的配置目录中。
 */
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  GLOBAL_CONFIG_DIR_NAME,
  GLOBAL_CONFIG_FILE_NAME,
  getGlobalConfigDir,
  type TelemetryConfig,
} from '../core/global-config.js';

// 常量
export const CONFIG_DIR_NAME = GLOBAL_CONFIG_DIR_NAME;
export const CONFIG_FILE_NAME = GLOBAL_CONFIG_FILE_NAME;

/** 重新导出共享的遥测段类型（global-config 中的单一事实来源）。 */
export type { TelemetryConfig };

export interface GlobalConfig {
  telemetry?: TelemetryConfig;
  [key: string]: unknown; // 保留其他字段
}

type ConfigReadResult =
  | { status: 'missing' }
  | { status: 'ok'; config: GlobalConfig }
  | { status: 'invalid'; config: GlobalConfig };

function getConfigDir(): string {
  return getGlobalConfigDir();
}

function getLegacyConfigPath(): string {
  return path.join(os.homedir(), '.config', CONFIG_DIR_NAME, CONFIG_FILE_NAME);
}

async function readConfigFile(configPath: string): Promise<ConfigReadResult> {
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return { status: 'ok', config: JSON.parse(content) as GlobalConfig };
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { status: 'missing' };
    }
    // 如果解析失败或发生其他读取错误，忽略该文件。
    return { status: 'invalid', config: {} };
  }
}

async function writeConfigFile(configPath: string, config: GlobalConfig): Promise<void> {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, JSON.stringify(config, null, 2) + '\n');
}

function hasMissingTelemetryFields(config: GlobalConfig): boolean {
  const telemetry = config.telemetry;
  return (
    !telemetry ||
    telemetry.anonymousId === undefined ||
    telemetry.noticeSeen === undefined
  );
}

function mergeLegacyTelemetry(config: GlobalConfig, legacyConfig: GlobalConfig): GlobalConfig | undefined {
  const legacyTelemetry = legacyConfig.telemetry;
  if (!legacyTelemetry) {
    return undefined;
  }

  const currentTelemetry = config.telemetry ?? {};
  const shouldMigrate =
    (currentTelemetry.anonymousId === undefined && legacyTelemetry.anonymousId !== undefined) ||
    (currentTelemetry.noticeSeen === undefined && legacyTelemetry.noticeSeen !== undefined);

  if (!shouldMigrate) {
    return undefined;
  }

  return {
    ...config,
    telemetry: {
      ...legacyTelemetry,
      ...currentTelemetry,
    },
  };
}

async function migrateLegacyTelemetryConfig(
  configPath: string,
  config: GlobalConfig,
  persist: boolean,
): Promise<GlobalConfig> {
  const legacyConfigPath = getLegacyConfigPath();
  if (path.resolve(configPath) === path.resolve(legacyConfigPath) || !hasMissingTelemetryFields(config)) {
    return config;
  }

  const legacyRead = await readConfigFile(legacyConfigPath);
  if (legacyRead.status !== 'ok') {
    return config;
  }

  const migrated = mergeLegacyTelemetry(config, legacyRead.config);
  if (!migrated) {
    return config;
  }

  if (persist) {
    try {
      await writeConfigFile(configPath, migrated);
    } catch {
      // 即使一次性迁移无法持久化，也保留本次运行的遥测数据。
    }
  }

  return migrated;
}

/**
 * 获取全局配置文件的路径。
 * 遵循 XDG 基本目录规范和平台约定。
 *
 * - 所有平台：如果设置了 XDG_CONFIG_HOME，则使用 $XDG_CONFIG_HOME/openspec/
 * - Unix/macOS 回退：~/.config/openspec/
 * - Windows 回退：%APPDATA%/openspec/
 */
export function getConfigPath(): string {
  const configDir = getConfigDir();
  return path.join(configDir, CONFIG_FILE_NAME);
}

/**
 * 读取全局配置文件。
 * 如果文件不存在则返回空对象。
 */
export async function readConfig(): Promise<GlobalConfig> {
  const configPath = getConfigPath();
  const read = await readConfigFile(configPath);
  const config = read.status === 'ok' ? read.config : {};
  return migrateLegacyTelemetryConfig(configPath, config, read.status !== 'invalid');
}

/**
 * 写入全局配置文件。
 * 保留现有字段并合并新值。
 */
export async function writeConfig(updates: Partial<GlobalConfig>): Promise<void> {
  const configPath = getConfigPath();

  // 读取现有配置并合并
  const existing = await readConfig();
  const merged = { ...existing, ...updates };

  // 遥测对象的深度合并
  if (updates.telemetry && existing.telemetry) {
    merged.telemetry = { ...existing.telemetry, ...updates.telemetry };
  }

  await writeConfigFile(configPath, merged);
}

/**
 * 获取遥测配置段。
 */
export async function getTelemetryConfig(): Promise<TelemetryConfig> {
  const config = await readConfig();
  return config.telemetry ?? {};
}

/**
 * 更新遥测配置段。
 */
export async function updateTelemetryConfig(updates: Partial<TelemetryConfig>): Promise<void> {
  const existing = await getTelemetryConfig();
  await writeConfig({
    telemetry: { ...existing, ...updates },
  });
}
