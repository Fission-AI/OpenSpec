## Why
Delta validation fails to parse requirement blocks that `openspec show --json --deltas-only` successfully parses, causing false negatives. The parser's regex pattern `/^###\s+Requirement:/` is too strict about whitespace, and error messages don't provide enough detail to diagnose parsing failures.

## What Changes
- Enhance requirement block parsing to handle edge cases (whitespace variations, line ending normalization)
- Improve validation error messages to show which lines failed to parse and why
- Add diagnostic logging when section headers are found but no requirements are parsed

## Impact
- Affected specs: cli-validate
- Affected code: `src/core/parsers/requirement-blocks.ts`, `src/core/validation/validator.ts`
- Bug fixes: Resolves issue #164
