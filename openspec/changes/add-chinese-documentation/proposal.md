# Add Chinese Documentation

## Why

OpenSpec currently only provides documentation in English, which creates barriers for Chinese-speaking developers who want to adopt spec-driven development. Adding Chinese translations will:
- Make OpenSpec accessible to the large Chinese developer community
- Improve adoption in Chinese-speaking regions
- Demonstrate OpenSpec's commitment to internationalization

## What Changes

- Add Chinese versions of all core documentation files:
  - `README.zh-CN.md` - Main project README
  - `AGENTS.zh-CN.md` - Root-level agent instructions
  - `openspec/AGENTS.zh-CN.md` - OpenSpec-specific agent instructions
  - `docs/artifact_poc.zh-CN.md` - Artifact POC documentation
  - `docs/schema-customization.zh-CN.md` - Schema customization guide
  - `docs/schema-workflow-gaps.zh-CN.md` - Schema workflow gaps analysis
- Establish naming convention: `<filename>.zh-CN.md` for Chinese versions
- Keep Chinese docs synchronized with English originals

## Impact

- **Affected specs**: `docs-agent-instructions` (new documentation structure)
- **Affected code**: None - this is documentation-only
- **Breaking changes**: None
- **New files**: 6 new Chinese documentation files
- **Maintenance**: Chinese docs will need updates when English docs change
