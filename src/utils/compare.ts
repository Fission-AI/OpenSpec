/**
 * Compare two strings by UTF-16 code unit, never by locale.
 *
 * `localeCompare()` follows the process's ICU locale, so the same inputs can
 * order differently across OSes and CI images - and for output a caller
 * promises is stable (diffed in CI, snapshotted in tests, emitted as JSON),
 * that difference is a spurious failure. Code-unit ordering is what JavaScript's
 * `<` and the default `Array.prototype.sort()` already use, and it is the same
 * everywhere. It differs from true code-point order above the BMP, which is
 * fine here: determinism is the property being bought, not collation.
 */
export function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
