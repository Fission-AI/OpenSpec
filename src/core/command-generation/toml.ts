/**
 * Shared TOML serialization helpers for command adapters.
 *
 * Easy Code commands are stored as TOML files. This module provides
 * safe serialization for TOML string values so generated files stay
 * valid regardless of the content being embedded.
 */

/**
 * Replaces disallowed control characters with TOML \uXXXX escape sequences.
 *
 * TOML basic strings forbid U+0000–U+0008, U+000B–U+000C, U+000E–U+001F, and
 * U+007F. The caller is expected to have already handled \t (U+0009), \n
 * (U+000A), and \r (U+000D) via their named escape sequences before calling
 * this helper.
 */
function escapeControlChars(value: string): string {
  return value.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,
    (ch) => `\\u${ch.codePointAt(0)!.toString(16).padStart(4, '0')}`
  );
}

/**
 * Escapes a string for use as a TOML basic string (double-quoted).
 *
 * TOML basic strings support the following escape sequences:
 *   \\\\ backslash, \\" double quote, \\n line feed, \\r carriage return, \\t tab.
 * All other control characters (U+0000–U+0008, U+000B–U+000C, U+000E–U+001F,
 * U+007F) are replaced with \\uXXXX unicode escape sequences.
 *
 * @param value - The raw string to embed in a TOML basic string.
 * @returns The escaped string, suitable for wrapping in double quotes.
 */
export function escapeTOMLBasicString(value: string): string {
  return escapeControlChars(
    value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  );
}

/**
 * Prepares a string for use as a TOML basic multiline string (triple double-quoted).
 *
 * TOML basic multiline strings support the same escape sequences as basic strings.
 * We use them instead of literal multiline strings (triple single-quoted) because
 * literal strings cannot escape anything — a literal ''' would close the block.
 *
 * Inside a basic multiline string:
 *   - backslashes must be escaped first
 *   - runs of 3+ consecutive double quotes would close the block; we escape the
 *     first quote in each triple to break the run
 *   - newlines are preserved verbatim (TOML allows real newlines in multiline strings)
 * All other control characters (U+0000–U+0008, U+000B–U+000C, U+000E–U+001F,
 * U+007F) are replaced with \\uXXXX unicode escape sequences.
 *
 * @param value - The raw multiline string to embed.
 * @returns The escaped string, suitable for wrapping in triple double quotes.
 */
export function escapeTOMLMultilineString(value: string): string {
  return escapeControlChars(
    value
      .replace(/\\/g, '\\\\')
      .replace(/\r/g, '\\r')
      // Escape the first quote in any run of 3+ consecutive double quotes
      // so they cannot prematurely close the triple-double-quote block.
      .replace(/"(?="")/g, '\\"')
  );
}
