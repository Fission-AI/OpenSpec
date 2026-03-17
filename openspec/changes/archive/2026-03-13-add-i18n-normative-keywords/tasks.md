# Tasks

## 1. Keyword Registry

- [x] 1.1 Create `src/core/i18n/keywords.ts` with `NORMATIVE_KEYWORDS` constant (`en`, `es`), `DEFAULT_LANGUAGE`, `buildKeywordRegex()` using `(?<![\p{L}\p{N}\p{Pc}\p{Pd}])...(?![\p{L}\p{N}\p{Pc}\p{Pd}])` with `u` flag, and `formatKeywordMessage()` helper
- [x] 1.2 Add unit tests for `buildKeywordRegex()`: English keywords, Spanish keywords (with accents), substring non-matching (`DEBE` should not match inside `DEBERÁ`), punctuation boundaries, case sensitivity
- [x] 1.3 Add unit tests for `formatKeywordMessage()`: single keyword, two keywords, three keywords

## 2. Config Loading

- [x] 2.1 Add `language` field to `ProjectConfigSchema` in `src/core/project-config.ts` (optional string, min length 1)
- [x] 2.2 Add resilient parsing for `language` field following existing pattern (validate type, log warning on invalid, include in partial config)
- [x] 2.3 Add unit tests for language field parsing: valid, missing, empty string, invalid type

## 3. Validator Updates

- [x] 3.1 Refactor `base.schema.ts`: replace static `RequirementSchema` with `createRequirementSchema(keywords, keywordRegex)` factory function. Keep backward-compatible default export using English keywords.
- [x] 3.2 Update `Validator` constructor to accept optional `language` parameter, resolve keywords from registry, precompile regex, and create the Zod schema via factory
- [x] 3.3 Update `containsShallOrMust()` in `validator.ts` to use the precompiled keyword regex instead of hardcoded `/\b(SHALL|MUST)\b/`
- [x] 3.4 Update `VALIDATION_MESSAGES.REQUIREMENT_NO_SHALL` in `constants.ts` to be a function or template that accepts keyword list, and update guidance snippets (`GUIDE_MISSING_SPEC_SECTIONS`, `GUIDE_SCENARIO_FORMAT`) to reference configured keywords
- [x] 3.5 Thread language from config into Validator instantiation in `src/commands/validate.ts`
- [x] 3.6 Add unit tests: English validation (existing behavior preserved), Spanish validation (DEBE/DEBERA/DEBERÁ accepted), unknown language fallback to English, error messages show configured keywords

## 4. Documentation

- [x] 4.1 Add i18n section to README.md documenting: `language` config property, recommended `config.yaml` setup for Spanish projects (including `context` field for AI keyword guidance), list of supported languages and their keywords
