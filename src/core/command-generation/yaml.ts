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
 * Always emits a double-quoted scalar. Quoting unconditionally keeps the
 * value a string no matter what it holds: an unquoted `true`, `null` or
 * `123` would round-trip as a boolean, null or number, and an unquoted
 * value opening with a block indicator (`|`, `>`) or containing `: `
 * is not valid YAML at all.
 *
 * Inside the quotes it escapes everything that cannot appear verbatim in a
 * double-quoted scalar: backslash, double quote, line feed, carriage
 * return, and the non-printable characters YAML's `c-printable` production
 * excludes (C0 controls, DEL and C1 controls). Lenient parsers accept a raw
 * control byte, but strict ones reject the document outright, so escaping
 * them here keeps the generated file portable across every tool's parser.
 *
 * @param value - The raw string to embed in YAML frontmatter.
 * @returns The value as an escaped, double-quoted YAML scalar.
 */
export function escapeYamlValue(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    // Remaining non-printables have no dedicated escape; emit them as \xHH.
    .replace(
      /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/g,
      (char) => `\\x${char.charCodeAt(0).toString(16).padStart(2, '0')}`
    );
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
