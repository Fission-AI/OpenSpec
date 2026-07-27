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
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r');
  return `"${escaped}"`;
}

/**
 * Formats a tags array as a YAML array with proper escaping.
 *
 * @param tags - Array of tag strings.
 * @returns Formatted YAML array string, e.g. '[tag1, tag2]'.
 */
export function formatTagsArray(tags: string[]): string {
  const escapedTags = tags.map((tag) => escapeYamlValue(tag));
  return `[${escapedTags.join(', ')}]`;
}
