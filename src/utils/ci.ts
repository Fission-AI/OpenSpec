/**
 * 遥测和版本检查共用的 CI 环境检测。
 *
 * 提供商将 CI 设置为 "true"、"1"、"yes" 等。只有显式的关闭值才会被视为"非 CI"，
 * 因此未知值仍会抑制出站请求，而不是让构建产生意外。
 */

const CI_DISABLED_VALUES = new Set(['', 'false', '0', 'no', 'off']);

/**
 * 当 `CI` 被设置为除显式关闭值之外的任何值时返回 true。
 */
export function isCiEnvironment(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  const value = env.CI;
  return value !== undefined && !CI_DISABLED_VALUES.has(value.trim().toLowerCase());
}
