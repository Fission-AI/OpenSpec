# Design: Add i18n Normative Keywords

## Context

OpenSpec validates that every requirement contains `SHALL` or `MUST` via two hardcoded checks:
1. `base.schema.ts:12` — Zod refinement: `text.includes('SHALL') || text.includes('MUST')`
2. `validator.ts:434` — Regex: `/\b(SHALL|MUST)\b/`

The `\b` word boundary anchor in JavaScript treats accented characters (e.g., `Á` in `DEBERÁ`) as non-word characters, since `\b` only considers `[a-zA-Z0-9_]`. This means `/\bDEBERÁ\b/` fails to match because JavaScript sees a word boundary between `R` and `Á`.

The project config (`config.yaml`) already has extensible fields (`schema`, `context`, `rules`). Adding `language` follows the same pattern.

## Goals / Non-Goals

**Goals**:
- Accept normative keywords from the configured language
- Handle Unicode keywords correctly (accented characters)
- Keep structural headers (`### Requirement:`, `#### Scenario:`, etc.) in English
- Preserve current behavior when no language is configured

**Non-Goals**:
- Translating CLI output, error messages, or help text
- Translating structural/section headers
- Supporting multiple languages within a single project
- Validating conditional keywords (WHEN, THEN, AND — these are not validated today)

## Decisions

### Decision: Keyword registry as a TypeScript constant

Store language-to-keywords mapping in a new file `src/core/i18n/keywords.ts` as a `Record<string, string[]>`:

```typescript
export const NORMATIVE_KEYWORDS: Record<string, string[]> = {
  en: ['MUST', 'SHALL'],
  es: ['DEBE', 'DEBERA', 'DEBERÁ'],
};

export const DEFAULT_LANGUAGE = 'en';
```

**Why this over external YAML files**: The registry is small (a few lines per language), changes infrequently, and benefits from type safety. External files add file I/O, parsing, and path resolution complexity for no real gain. Adding a new language is still a one-line change.

### Decision: Unicode-safe word boundary matching with `\p{L}`

Replace `\b` with Unicode-aware boundaries using `\p{L}` (Unicode Letter property) with the `u` flag:

```typescript
// Build regex: (?<!\p{L})(DEBE|DEBERA|DEBERÁ)(?!\p{L})
function buildKeywordRegex(keywords: string[]): RegExp {
  const escaped = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = `(?<!\\p{L})(${escaped.join('|')})(?!\\p{L})`;
  return new RegExp(pattern, 'u');
}
```

This uses negative lookbehind/lookahead for Unicode letters, so:
- `DEBERÁ` matches in `"El sistema DEBERÁ emitir"` ✓
- `DEBE` does NOT match in `"DEBERÁ"` (because `R` is `\p{L}`) ✓
- `DEBE` matches in `"DEBE emitir"` ✓
- `MUST` matches in `"system MUST do"` ✓

**Why not `includes()`**: While simpler, `includes()` would match substrings — `DEBE` would match inside `DEBERÁ`. With interchangeable keyword lists this creates ambiguity. The regex approach handles this correctly with one precompiled pattern.

**Precompilation**: The regex is built once when the validator is constructed (or when language config is read), not on every validation call.

### Decision: Thread language through validator via constructor

The `Validator` class already takes `strictMode: boolean` in its constructor. Extend it:

```typescript
constructor(strictMode: boolean = false, language?: string)
```

Internally, the constructor:
1. Resolves keywords from registry (fallback to `en` if unknown language)
2. Precompiles the keyword regex
3. Generates the validation error message with quoted keywords

The Zod schema in `base.schema.ts` needs a factory function since it currently uses a static refinement:

```typescript
export function createRequirementSchema(keywords: string[], keywordRegex: RegExp) {
  return z.object({
    text: z.string()
      .min(1, VALIDATION_MESSAGES.REQUIREMENT_EMPTY)
      .refine(
        (text) => keywordRegex.test(text),
        formatKeywordMessage(keywords)
      ),
    scenarios: z.array(ScenarioSchema)
      .min(1, VALIDATION_MESSAGES.REQUIREMENT_NO_SCENARIOS),
  });
}
```

### Decision: Dynamic validation message with quoted keywords

Format the error message dynamically:

```typescript
function formatKeywordMessage(keywords: string[]): string {
  const quoted = keywords.map(k => `"${k}"`);
  if (quoted.length === 1) return `Requirement must contain ${quoted[0]} keyword`;
  const last = quoted.pop();
  return `Requirement must contain ${quoted.join(', ')} or ${last} keyword`;
}
```

This produces:
- `en`: `Requirement must contain "MUST" or "SHALL" keyword`
- `es`: `Requirement must contain "DEBE", "DEBERA" or "DEBERÁ" keyword`

## Risks / Trade-offs

- **Risk**: `\p{L}` with `u` flag requires Node.js ≥10 (project requires ≥20.19.0, so safe).
  → Mitigation: Already within supported range.

- **Risk**: `base.schema.ts` changes from static export to factory function, which is a refactor touching the Zod schema import chain.
  → Mitigation: The `SpecSchema` and `ChangeSchema` in `src/core/schemas/` will need to use the factory. The `Validator` class already owns the validation flow, so it can create the schema internally.

- **Trade-off**: Keeping the keyword registry hardcoded means adding a language requires a code change + release. This is acceptable because: (a) languages are added rarely, (b) community PRs are easy to review (one line), and (c) it avoids config complexity for end users.

## Open Questions

None — the exploration phase resolved all design questions.
