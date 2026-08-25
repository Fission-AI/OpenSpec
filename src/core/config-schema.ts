import { z } from 'zod';

/**
 * 全局 OpenSpec 配置的 Zod schema。
 * 使用 passthrough() 保留未知字段以确保向前兼容。
 */
export const GlobalConfigSchema = z
  .object({
    featureFlags: z
      .record(z.string(), z.boolean())
      .optional()
      .default({}),
    profile: z
      .enum(['core', 'custom'])
      .optional()
      .default('core'),
    delivery: z
      .enum(['both', 'skills', 'commands'])
      .optional()
      .default('both'),
    workflows: z
      .array(z.string())
      .optional(),
    defaultStore: z
      .string()
      .optional()
      .describe(
        'Store id used as fallback root when no explicit --store, local root, or project-level store: pointer resolves'
      ),
    // passthrough 使运行时管理的字段（anonymousId、noticeSeen）在
    // 用户仅设置 telemetry.enabled 时仍能通过 CLI validate。
    telemetry: z
      .object({
        enabled: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    // 运行时管理（如 telemetry.noticeSeen）；CLI set 不可由用户设置。
    completionTipSeen: z.boolean().optional(),
  })
  .passthrough();

export type GlobalConfigType = z.infer<typeof GlobalConfigSchema>;

/** 默认配置值。 */
export const DEFAULT_CONFIG: GlobalConfigType = {
  featureFlags: {},
  profile: 'core',
  delivery: 'both',
};

const KNOWN_TOP_LEVEL_KEYS = new Set([
  ...Object.keys(DEFAULT_CONFIG),
  'workflows',
  'defaultStore',
  'telemetry',
]);

/** 用户可通过 CLI 在 `telemetry` 下设置的嵌套键。 */
const TELEMETRY_SETTABLE_KEYS = new Set(['enabled']);

/**
 * 会到达原型链而不是配置对象的键段。
 * 永远不能作为配置键，因此拒绝它们没有任何成本。
 */
const UNSAFE_KEY_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

function hasUnsafeSegment(keys: string[]): boolean {
  return keys.some((key) => UNSAFE_KEY_SEGMENTS.has(key));
}

/**
 * 当点号表示的键路径包含到达原型链的段时返回 true。
 * 绕过键验证的调用方（如 --allow-unknown）仍不得绕过此检查。
 */
export function hasUnsafeKeySegment(path: string): boolean {
  return hasUnsafeSegment(path.split('.'));
}

/**
 * 验证 CLI set 操作的配置键路径。
 * 未知的顶层键会被拒绝，除非调用方显式允许。
 */
export function validateConfigKeyPath(path: string): { valid: boolean; reason?: string } {
  const rawKeys = path.split('.');

  if (rawKeys.length === 0 || rawKeys.some((key) => key.trim() === '')) {
    return { valid: false, reason: '键路径不能为空' };
  }

  const unsafeKey = rawKeys.find((key) => UNSAFE_KEY_SEGMENTS.has(key));
  if (unsafeKey) {
    return { valid: false, reason: `键段 "${unsafeKey}" 不允许` };
  }

  const rootKey = rawKeys[0];
  if (!KNOWN_TOP_LEVEL_KEYS.has(rootKey)) {
    return { valid: false, reason: `未知的顶层键 "${rootKey}"` };
  }

  if (rootKey === 'featureFlags') {
    if (rawKeys.length > 2) {
      return { valid: false, reason: 'featureFlags 的值为布尔值，不支持嵌套键' };
    }
    return { valid: true };
  }

  if (rootKey === 'telemetry') {
    if (rawKeys.length === 1) {
      return { valid: false, reason: '在 telemetry 下设置嵌套键（如 telemetry.enabled）' };
    }
    if (rawKeys.length !== 2 || !TELEMETRY_SETTABLE_KEYS.has(rawKeys[1])) {
      return {
        valid: false,
        reason: `未知的 telemetry 键 "${rawKeys.slice(1).join('.')}"（允许：enabled）`,
      };
    }
    return { valid: true };
  }

  if (rawKeys.length > 1) {
    return { valid: false, reason: `"${rootKey}" 不支持嵌套键` };
  }

  return { valid: true };
}

/**
 * 使用点号表示法获取对象中的嵌套值。
 *
 * @param obj - 要访问的对象
 * @param path - 点号分隔的路径（如 "featureFlags.someFlag"）
 * @returns 路径处的值，如果未找到则返回 undefined
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  if (hasUnsafeSegment(keys)) {
    return undefined;
  }
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

/**
 * 使用点号表示法在对象中设置嵌套值。
 * 根据需要创建中间对象。
 *
 * @param obj - 要修改的对象（原地变更）
 * @param path - 点号分隔的路径（如 "featureFlags.someFlag"）
 * @param value - 要设置的值
 */
export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');

  // 字面比较而不是通过辅助函数，以便守卫对读者和静态分析都是显而易见的。
  // 在写入任何内容之前检查整个路径，以便被拒绝的键不会留下半创建的对象。
  for (const key of keys) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return;
    }
  }

  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;
}

/**
 * 使用点号表示法从对象中删除嵌套值。
 *
 * @param obj - 要修改的对象（原地变更）
 * @param path - 点号分隔的路径（如 "featureFlags.someFlag"）
 * @returns 如果键存在并被删除则返回 true，否则返回 false
 */
export function deleteNestedValue(obj: Record<string, unknown>, path: string): boolean {
  const keys = path.split('.');

  for (const key of keys) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return false;
    }
  }

  let current: Record<string, unknown> = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
      return false;
    }
    current = current[key] as Record<string, unknown>;
  }

  const lastKey = keys[keys.length - 1];
  if (lastKey in current) {
    delete current[lastKey];
    return true;
  }
  return false;
}

/**
 * 将字符串值强制转换为适当的类型。
 * - "true" / "false" -> 布尔值
 * - 数字字符串 -> 数字
 * - JSON 数组/对象 -> 解析后的容器
 * - 其他一切 -> 字符串
 *
 * @param value - 要强制转换的字符串值
 * @param forceString - 如果为 true，始终将值作为字符串返回
 * @returns 强制转换后的值
 */
export function coerceValue(
  value: string,
  forceString: boolean = false
): string | number | boolean | unknown[] | Record<string, unknown> {
  if (forceString) {
    return value;
  }

  // 布尔值强制转换
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }

  // 数字强制转换 - 必须是有效的有限数字
  const num = Number(value);
  if (!isNaN(num) && isFinite(num) && value.trim() !== '') {
    return num;
  }

  const jsonContainer = parseJsonContainer(value);
  if (jsonContainer !== undefined) {
    return jsonContainer;
  }

  return value;
}

function parseJsonContainer(value: string): unknown[] | Record<string, unknown> | undefined {
  const trimmed = value.trim();
  const looksLikeContainer =
    (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
    (trimmed.startsWith('{') && trimmed.endsWith('}'));

  if (!looksLikeContainer) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed !== null && typeof parsed === 'object') {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

/**
 * 格式化值以类似 YAML 的方式显示。
 *
 * @param value - 要格式化的值
 * @param indent - 当前缩进级别
 * @returns 格式化后的字符串
 */
export function formatValueYaml(value: unknown, indent: number = 0): string {
  const indentStr = '  '.repeat(indent);

  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    return value.map((item) => `${indentStr}- ${formatValueYaml(item, indent + 1)}`).join('\n');
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return '{}';
    }
    return entries
      .map(([key, val]) => {
        const formattedVal = formatValueYaml(val, indent + 1);
        if (typeof val === 'object' && val !== null && Object.keys(val).length > 0) {
          return `${indentStr}${key}:\n${formattedVal}`;
        }
        return `${indentStr}${key}: ${formattedVal}`;
      })
      .join('\n');
  }

  return String(value);
}

/**
 * 根据 schema 验证配置对象。
 *
 * @param config - 要验证的配置
 * @returns 包含成功状态和可选错误信息的验证结果
 */
export function validateConfig(config: unknown): { success: boolean; error?: string } {
  try {
    GlobalConfigSchema.parse(config);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const messages = zodError.issues.map((e) => `${e.path.join('.')}: ${e.message}`);
      return { success: false, error: messages.join('; ') };
    }
    return { success: false, error: '未知的验证错误' };
  }
}
