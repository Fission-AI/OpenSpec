# Relax SHALL/MUST Validation to Support Non-English Documentation

## Why

OpenSpec currently requires all requirements to contain SHALL or MUST keywords, enforced as an ERROR-level validation check. This blocks users who write specifications in non-English languages, as reported in Issue #243.

While SHALL/MUST keywords follow RFC 2119 best practices for English specifications, mandating them prevents:
- International teams from using their native language for internal documentation
- Organizations with non-English documentation standards from adopting OpenSpec
- Multilingual projects from maintaining consistent language across specs

The current validation is overly restrictive. Best practices should be encouraged (WARNING) rather than enforced (ERROR).

## What Changes

**Validation Behavior**:
- Change SHALL/MUST validation from ERROR to WARNING level
- Users writing in English still see recommendations to follow RFC 2119
- Users writing in other languages can proceed without blockers
- `--strict` mode continues to treat warnings as errors for teams that want enforcement

**Impact**: Minimal code change (2 lines in validator.ts), significant international accessibility improvement.

## Impact

**Users Affected**: All users who run `openspec validate`, especially international users

**Breaking Changes**: None - existing valid specs remain valid, previously invalid non-English specs become valid with warnings

**Migration Required**: No

**Dependencies**: None

**Timeline**: Quick fix - single session implementation
