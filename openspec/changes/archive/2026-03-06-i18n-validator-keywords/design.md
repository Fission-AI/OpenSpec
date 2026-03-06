## Context

The validator enforces RFC 2119 normative keywords (`SHALL`, `MUST`) in two places:

1. **Schema level** — `src/core/schemas/base.schema.ts:12` uses `text.includes('SHALL') || text.includes('MUST')` as a Zod refinement on every requirement.
2. **Validator level** — `src/core/validation/validator.ts:433` uses `/\b(SHALL|MUST)\b/` regex in `containsShallOrMust()` for delta spec validation (ADDED/MODIFIED blocks).

Both are hardcoded to English. The multi-language guide (`docs/multi-language.md`) tells users how to generate artifacts in other languages via `config.yaml` context, but the validator rejects those artifacts.

## Goals / Non-Goals

**Goals:**
- Accept RFC 2119 equivalent keywords in English and Spanish
- Keep English as the default — no configuration required for English-only projects
- Make the keyword set easy to extend to additional languages in the future
- Update validation error messages to list all accepted keywords

**Non-Goals:**
- Full i18n of the CLI (error messages, help text, etc.)
- Configurable keyword sets per-project via `config.yaml` (future enhancement)
- Support for languages beyond English and Spanish in this change
- Translating section headers (e.g., `## Purpose` stays in English)

## Decisions

### 1. Centralized keyword constant map in `constants.ts`

Add a `NORMATIVE_KEYWORDS` constant that lists all accepted keywords across languages:

```ts
export const NORMATIVE_KEYWORDS = {
  en: ['SHALL', 'MUST'],
  es: ['DEBE', 'DEBERA'],
} as const;
```

**Why a flat map over per-language modules:** The total keyword set is small (2 keywords x 2 languages = 4 entries). A single constant is simpler to maintain, test, and extend than separate modules or a registry pattern.

**Why not regex patterns:** Explicit lookups via `Array.includes()` are easier to reason about and less error-prone than building dynamic regex. The validator already uses `includes()` in the schema.

**Alternative considered — config-driven keywords:** Would allow per-project customization but adds complexity (config loading during validation, schema changes). Not justified for 2 languages. Can be added later by reading from config and merging with the constant.

### 2. Single helper function replaces both check sites

Create a `containsNormativeKeyword(text: string): boolean` function in `constants.ts` (or a small `keywords.ts` utility) that checks against all keywords from all languages. Both the schema refinement and the validator method call this single function.

```ts
export function containsNormativeKeyword(text: string): boolean {
  const allKeywords = Object.values(NORMATIVE_KEYWORDS).flat();
  return allKeywords.some(kw => new RegExp(`\\b${kw}\\b`).test(text));
}
```

**Why word-boundary regex:** Prevents false positives from substrings (e.g., "DEBERÁ" partially matching "DEBE"). The current validator already uses `\b` boundaries for the English check. Spanish keywords without accents (`DEBERA` instead of `DEBERÁ`) are accepted to avoid encoding issues in different editors and platforms.

**Why centralized:** Eliminates the duplication between `base.schema.ts` and `validator.ts`. One place to update when adding languages.

### 3. Accept keywords with or without accents for Spanish

Spanish RFC 2119 equivalents use accented characters (`DEBERÁ`), but many developers may type without accents. Accept both `DEBE`/`DEBERÁ` and `DEBERA` (without accent).

The keyword list includes the unaccented forms as canonical, and the regex word-boundary check handles the accented variant naturally since `\b` matches at the boundary before the accented character.

### 4. Update validation error message

Change `REQUIREMENT_NO_SHALL` from:
```
'Requirement must contain SHALL or MUST keyword'
```
to:
```
'Requirement must contain a normative keyword (SHALL, MUST, DEBE, DEBERA)'
```

This tells users exactly which keywords are accepted regardless of their language.

## Risks / Trade-offs

**[Risk] False positives from Spanish prose** — A requirement that uses "debe" in lowercase as regular prose (common in Spanish) could match if we're not careful. → Mitigation: Only match UPPERCASE keywords, consistent with RFC 2119 convention that normative keywords are always capitalized.

**[Risk] Accent handling across platforms** — Files saved with different encodings could have different byte representations of `DEBERÁ`. → Mitigation: Accept the unaccented `DEBERA` as a valid keyword alongside `DEBERÁ`. This sidesteps encoding issues entirely.

**[Trade-off] No per-project language config** — All keywords from all languages are always accepted. A Spanish project could use `MUST` and pass validation, and vice versa. This is intentional for simplicity — mixing keywords within a single requirement would be a style concern, not a validation concern.
