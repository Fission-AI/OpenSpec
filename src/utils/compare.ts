/**
 * Compare two strings by UTF-16 code point, never by locale.
 *
 * `localeCompare()` follows the process's ICU locale, so the same inputs can
 * order differently across OSes and CI images - and for output a caller
 * promises is stable (diffed in CI, snapshotted in tests, emitted as JSON),
 * that difference is a spurious failure. Code-point ordering is the same
 * everywhere.
 */
export function compareCodePoints(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
