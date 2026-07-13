/**
 * Shared TOML serialization helpers for command adapters.
 *
 * Easy Code commands are stored as TOML files. This module provides
 * safe serialization for TOML string values so generated files stay
 * valid regardless of the content being embedded.
 */

/**
 * Escapes a string for use as a TOML basic string (double-quoted).
 *
 * TOML basic strings support the following escape sequences:
 *   \\ backslash, \" double quote, \n line feed, \r carriage return, \t tab.
 *
 * @param value - The raw string to embed in a TOML basic string.
 * @returns The escaped string, suitable for wrapping in double quotes.
 */
export function escapeTOMLBasicString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
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
 *
 * @param value - The raw multiline string to embed.
 * @returns The escaped string, suitable for wrapping in triple double quotes.
 */
export function escapeTOMLMultilineString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    // Escape the first quote in any run of 3+ consecutive double quotes
    // so they cannot prematurely close the triple-double-quote block.
    .replace(/"(?="")/g, '\\"');
}
