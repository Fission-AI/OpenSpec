/**
 * Normative keyword registry for internationalized spec validation.
 *
 * Each language maps to a list of interchangeable normative keywords.
 * The validator accepts any keyword from the configured language's list.
 */

export const NORMATIVE_KEYWORDS: Record<string, string[]> = {
  en: ['MUST', 'SHALL'],
  es: ['DEBE', 'DEBERA', 'DEBERÁ'],
};

export const DEFAULT_LANGUAGE = 'en';

/**
 * Build a regex that matches any of the given keywords as whole words,
 * using Unicode-aware boundaries (\p{L}, \p{N}, \p{Pc}, \p{Pd}) instead of \b.
 *
 * JavaScript's \b treats accented characters (e.g., Á in DEBERÁ) as
 * non-word characters, so we use negative lookbehind/lookahead for
 * Unicode letters instead.
 *
 * The regex is intended to be precompiled once and reused.
 */
export function buildKeywordRegex(keywords: string[]): RegExp {
  const escaped = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = `(?<![\\p{L}\\p{N}\\p{Pc}\\p{Pd}])(${escaped.join('|')})(?![\\p{L}\\p{N}\\p{Pc}\\p{Pd}])`;
  return new RegExp(pattern, 'u');
}

/**
 * Format a human-readable validation message listing the expected keywords.
 * Keywords are quoted for emphasis.
 *
 * Examples:
 *   ['MUST', 'SHALL']              → 'Requirement must contain "MUST" or "SHALL" keyword'
 *   ['DEBE', 'DEBERA', 'DEBERÁ']  → 'Requirement must contain "DEBE", "DEBERA", or "DEBERÁ" keyword'
 */
export function formatKeywordMessage(keywords: string[]): string {
  const quoted = keywords.map(k => `"${k}"`);
  if (quoted.length === 1) return `Requirement must contain ${quoted[0]} keyword`;
  const last = quoted[quoted.length - 1];
  const rest = quoted.slice(0, -1);
  if (quoted.length === 2) return `Requirement must contain ${rest[0]} or ${last} keyword`;
  return `Requirement must contain ${rest.join(', ')}, or ${last} keyword`;
}

/**
 * Resolve keywords for a language code, falling back to the default language.
 */
export function resolveKeywords(language?: string): string[] {
  if (!language) return NORMATIVE_KEYWORDS[DEFAULT_LANGUAGE];
  const normalized = language.trim().toLowerCase();
  if (!normalized) return NORMATIVE_KEYWORDS[DEFAULT_LANGUAGE];
  const keywords = NORMATIVE_KEYWORDS[normalized];
  if (keywords) return keywords;
  const available = Object.keys(NORMATIVE_KEYWORDS).join(', ');
  console.warn(`Unknown language "${language}". Available: ${available}. Falling back to "${DEFAULT_LANGUAGE}".`);
  return NORMATIVE_KEYWORDS[DEFAULT_LANGUAGE];
}
