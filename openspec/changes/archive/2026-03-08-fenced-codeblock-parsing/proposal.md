## Why

The markdown parser in `requirement-blocks.ts` does not track fenced code block state when scanning for `##` and `### Requirement:` headers. When a spec contains ` ``` ` blocks with markdown-like headers inside (common in template examples), the parser misidentifies them as real document structure, causing **silent data loss** during `openspec archive`. This was discovered when 7 of 9 requirements were silently dropped from a real project spec.

## What Changes

- **Fix**: Add fenced code block awareness to all three parsing functions (`splitTopLevelSections`, `extractRequirementsSection`, `parseRequirementBlocksFromSection`) so they skip headers inside ` ``` ` blocks
- **Tests**: Add test cases with fenced code blocks containing `##` and `###` headers

## Capabilities

### Modified Capabilities

- `cli-archive`: Fix spec merge to handle fenced code blocks correctly (no data loss)

## Impact

- **Core parser**: `src/core/parsers/requirement-blocks.ts` — 3 functions modified
- **Tests**: New test cases for fenced code block scenarios
- **No breaking changes**: The fix only makes parsing more correct
