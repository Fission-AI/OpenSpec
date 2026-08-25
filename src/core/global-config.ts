import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// 常量
export const GLOBAL_CONFIG_DIR_NAME = 'openspec';
export const GLOBAL_CONFIG_FILE_NAME = 'config.json';
export const GLOBAL_DATA_DIR_NAME = 'openspec';

// TypeScript 类型
export type Profile = 'core' | 'custom';
export type Delivery = 'both' | 'skills' | 'commands';

/** 全局配置的遥测段（身份 + 选择退出）。 */
export interface TelemetryConfig {
  /** 为 false 时遥测禁用。未设置表示启用（选择退出模式）。 */
  enabled?: boolean;
  /** 匿名随机 UUID；与用户无关。 */
  anonymousId?: string;
  /** 是否已显示首次运行的遥测通知。 */
  noticeSeen?: boolean;
}

// TypeScript 接口
export interface GlobalConfig {
  featureFlags?: Record<string, boolean>;
  profile?: Profile;
  delivery?: Delivery;
  workflows?: string[];
  /**
   * 机器级回退存储 id，仅在根解析期间、没有 --store 标志、
   * 本地根或项目级 store: 指针解析时查阅。
   */
  defaultStore?: string;
  /** Workset 打开器行（切片 7.1）；手动编辑，使用时验证。 */
  openers?: unknown;
  /** 匿名使用分析设置和身份。 */
  telemetry?: TelemetryConfig;
  /** 是否已显示首次运行的 shell-completions 提示。 */
  completionTipSeen?: boolean;
}

const DEFAULT_CONFIG: GlobalConfig = {
  featureFlags: {},
  profile: 'core',
  delivery: 'both',
};

/**
 * 按照 XDG 基本目录规范获取全局配置目录路径。
 *
 * - 所有平台：如果设置了 XDG_CONFIG_HOME，则使用 $XDG_CONFIG_HOME/openspec/
 * - Unix/macOS 回退：~/.config/openspec/
 * - Windows 回退：%APPDATA%/openspec/
 */
export function getGlobalConfigDir(): string {
  // XDG_CONFIG_HOME 在所有平台上显式设置时优先
  const xdgConfigHome = process.env.XDG_CONFIG_HOME;
  if (xdgConfigHome) {
    return path.join(xdgConfigHome, GLOBAL_CONFIG_DIR_NAME);
  }

  const platform = os.platform();

  if (platform === 'win32') {
    // Windows：使用 %APPDATA%
    const appData = process.env.APPDATA;
    if (appData) {
      return path.join(appData, GLOBAL_CONFIG_DIR_NAME);
    }
    // Windows 回退：如果 APPDATA 未设置
    return path.join(os.homedir(), 'AppData', 'Roaming', GLOBAL_CONFIG_DIR_NAME);
  }

  // Unix/macOS 回退：~/.config
  return path.join(os.homedir(), '.config', GLOBAL_CONFIG_DIR_NAME);
}

/**
 * 按照 XDG 基本目录规范获取全局数据目录路径。
 * 用于用户数据，如 schema 覆盖。
 *
 * - 所有平台：如果设置了 XDG_DATA_HOME，则使用 $XDG_DATA_HOME/openspec/
 * - Unix/macOS 回退：~/.local/share/openspec/
 * - Windows 回退：%LOCALAPPDATA%/openspec/
 */
export interface GlobalDataDirOptions {
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  homedir?: string;
}

function joinGlobalDataPath(platform: NodeJS.Platform, ...segments: string[]): string {
  return platform === 'win32'
    ? path.win32.join(...segments)
    : path.posix.join(...segments);
}

export function getGlobalDataDir(options: GlobalDataDirOptions = {}): string {
  const env = options.env ?? process.env;
  const platform = options.platform ?? os.platform();

  // XDG_DATA_HOME 在所有平台上显式设置时优先
  const xdgDataHome = env.XDG_DATA_HOME;
  if (xdgDataHome) {
    return joinGlobalDataPath(platform, xdgDataHome, GLOBAL_DATA_DIR_NAME);
  }

  const homedir = options.homedir ?? os.homedir();

  if (platform === 'win32') {
    // Windows：使用 %LOCALAPPDATA%
    const localAppData = env.LOCALAPPDATA;
    if (localAppData) {
      return joinGlobalDataPath(platform, localAppData, GLOBAL_DATA_DIR_NAME);
    }
    // Windows 回退：如果 LOCALAPPDATA 未设置
    return joinGlobalDataPath(platform, homedir, 'AppData', 'Local', GLOBAL_DATA_DIR_NAME);
  }

  // Unix/macOS 回退：~/.local/share
  return joinGlobalDataPath(platform, homedir, '.local', 'share', GLOBAL_DATA_DIR_NAME);
}

/**
 * 获取全局配置文件的路径。
 */
export function getGlobalConfigPath(): string {
  return path.join(getGlobalConfigDir(), GLOBAL_CONFIG_FILE_NAME);
}

/**
 * 从磁盘加载全局配置。
 * 如果文件不存在或无效则返回默认配置。
 * 将加载的配置与默认值合并，以确保新字段可用。
 */
export function getGlobalConfig(): GlobalConfig {
  const configPath = getGlobalConfigPath();

  try {
    if (!fs.existsSync(configPath)) {
      return { ...DEFAULT_CONFIG };
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    // 与默认值合并（加载的值优先）
    const merged: GlobalConfig = {
      ...DEFAULT_CONFIG,
      ...parsed,
      // featureFlags 的深度合并
      featureFlags: {
        ...DEFAULT_CONFIG.featureFlags,
        ...(parsed.featureFlags || {})
      }
    };

    // Schema 演进：如果加载的配置中不存在新字段，则应用默认值
    if (parsed.profile === undefined) {
      merged.profile = DEFAULT_CONFIG.profile;
    }
    if (parsed.delivery === undefined) {
      merged.delivery = DEFAULT_CONFIG.delivery;
    }

    return merged;
  } catch (error) {
    // 解析错误时记录警告，但不为缺失文件记录
    if (error instanceof SyntaxError) {
      console.error(`警告：${configPath} 中的 JSON 无效，使用默认值`);
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
