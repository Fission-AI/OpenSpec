## Why

OpenSpec hardcodes `SHALL` and `MUST` as the only accepted normative keywords in validation. Teams working in languages other than English (e.g., Spanish) can already write specs with translated scenario keywords (`CUANDO`, `ENTONCES`) and structural headers remain in English — but validation rejects requirements using normative keywords like `DEBE` or `DEBERÁ`. This forces non-English teams into an awkward mix: Spanish prose with English normative keywords embedded in it.

## What Changes

- **New `language` property in `config.yaml`**: A project-level setting (e.g., `language: es`) that selects which normative keywords the validator accepts. Defaults to `en` (current behavior preserved).
- **Keyword registry with interchangeable lists**: Each language defines a list of equivalent normative keywords. For English: `[MUST, SHALL]`. For Spanish: `[DEBE, DEBERA, DEBERÁ]`. The validator accepts any keyword from the configured language's list.
- **Validator updated to use configured keywords**: The hardcoded `/\b(SHALL|MUST)\b/` regex and `text.includes('SHALL')` checks are replaced with language-aware matching. Special attention to Unicode word boundaries (JavaScript `\b` treats accented characters like `Á` as non-word characters).
- **Validation messages reference configured keywords**: Error messages like `Requirement must contain SHALL or MUST keyword` will quote the configured language's keywords instead (e.g., `Requirement must contain "DEBE", "DEBERA", or "DEBERÁ" keyword`).
- **README updated with i18n guidance**: A new section documenting how to configure a project for non-English specs, including recommended `config.yaml` setup and `context` field for AI instructions.

### What does NOT change

- Structural headers remain English-only: `### Requirement:`, `#### Scenario:`, `## ADDED/MODIFIED/REMOVED Requirements`
- Conditional keywords (`WHEN`, `THEN`, `AND`, `GIVEN`) are not validated today and remain unparsed — translation is handled via `context` in config.yaml for AI instruction
- CLI output, error messages, and help text remain in English
- No mixed-language projects: one language per project

## Capabilities

### New Capabilities
- `i18n-normative-keywords`: Language-aware normative keyword validation with interchangeable keyword lists per language

### Modified Capabilities
- `config-loading`: Add `language` field to ProjectConfigSchema with validation
- `cli-validate`: Validator accepts normative keywords from the configured language

## Impact

- **Code**: `src/core/validation/validator.ts`, `src/core/validation/constants.ts`, `src/core/schemas/base.schema.ts`, `src/core/project-config.ts`
- **Docs**: `README.md` (new i18n section)
- **Breaking**: None. Default is `en`, preserving current behavior. Existing projects are unaffected.
