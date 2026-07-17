/**
 * Shared YAML frontmatter helpers for command adapters.
 *
 * Several tool adapters emit YAML frontmatter and need to escape
 * user-facing strings (name, description, category, tags) so the
 * generated file stays valid YAML. This module centralizes that logic
 * so the behavior is identical across adapters and fixed in one place.
 */

/**
 * Escapes a string value for safe YAML output.
 *
 * Quotes the value with double quotes when it contains characters that
 * carry special meaning in YAML (or leading/trailing whitespace), and
 * escapes the characters that are not representable verbatim inside a
 * double-quoted scalar: backslash, double quote, line feed and carriage
 * return. Values without special characters are returned unquoted.
 *
 * @param value - The raw string to embed in YAML frontmatter.
 * @returns The value, double-quoted and escaped when necessary.
 */
export function escapeYamlValue(value: string): string {
  // Check if value needs quoting (contains special YAML characters or starts/ends with whitespace)
  const needsQuoting = /[:\n\r#{}[\],&*!|>'"%@`]|^\s|\s$/.test(value);
  if (needsQuoting) {
    // Use double quotes and escape characters that are not safe to emit
    // verbatim inside a double-quoted YAML scalar. Carriage returns must be
    // escaped too: a literal CR inside double quotes is subject to YAML line
    // folding/normalization and would silently corrupt the round-tripped value.
    const escaped = value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r');
    return `"${escaped}"`;
  }
  return value;
}
