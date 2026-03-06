## Why

The validator hardcodes RFC 2119 keywords (`SHALL`, `MUST`) in English, causing specs written in other languages to fail validation even though they use correct normative keywords in their own language (e.g., `DEBE`/`DEBERA` in Spanish). The multi-language guide (`docs/multi-language.md`) already supports generating artifacts in other languages, but the validator rejects them. This makes OpenSpec unusable for non-English teams without skipping validation entirely.

## What Changes

- Add a language-aware keyword map that maps RFC 2119 keywords to their equivalents in supported languages (English and Spanish initially)
- Update the `RequirementSchema` refinement in `base.schema.ts` to accept keywords from all configured languages
- Update the `containsShallOrMust` method in `validator.ts` to accept keywords from all configured languages
- Expose validation messages in both English and Spanish so error output matches the spec language

## Capabilities

### New Capabilities

- `i18n-validator-keywords`: Language-aware requirement keyword validation supporting RFC 2119 equivalents in English and Spanish

### Modified Capabilities

- `cli-validate`: Validator keyword checks will accept normative keywords in any supported language, not just English

## Impact

- `src/core/schemas/base.schema.ts` — `RequirementSchema` refinement changes from hardcoded `SHALL`/`MUST` check to multi-language keyword check
- `src/core/validation/validator.ts` — `containsShallOrMust` method expanded to support Spanish equivalents
- `src/core/validation/constants.ts` — May need new keyword constants or a keyword map
- No breaking changes — English keywords continue to work as before
- No new dependencies required
