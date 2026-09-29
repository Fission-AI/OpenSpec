/**
 * Shared TOML string escaping for command adapters.
 */

/**
 * Control characters (C0 except tab/newline/carriage return, plus DEL) are
 * invalid inside TOML strings and must be written as escapes.
 */
const TOML_CONTROL_CHARS = new RegExp('[\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f]', 'g');

/**
 * TOML basic strings are escape-active: a backslash or double quote in the
 * value breaks the file if written raw. Newlines cannot appear in a
 * single-line basic string at all, so they are escaped too.
 */
export function escapeTomlBasicString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(TOML_CONTROL_CHARS, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

/**
 * Multiline basic strings keep raw newlines and tabs, but backslashes are
 * still escape-active, any run of three quotes would end the string, and the
 * same control characters are invalid as in single-line basic strings — a
 * lone carriage return included (only LF and CRLF may appear raw; CRLF is
 * normalized away so the emitted file is single-convention). Escapes are
 * introduced after backslash-doubling so they are not re-doubled.
 */
export function escapeTomlMultilineBasicString(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\\/g, '\\\\')
    .replace(/"""/g, '""\\"')
    .replace(/\r/g, '\\r')
    .replace(TOML_CONTROL_CHARS, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}
