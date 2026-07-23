# LLM Wiki Integration Examples

This directory contains example configurations and skills for integrating OpenSpec with LLM Wiki for knowledge management.

## Contents

### `skills/`
Example skill files that can be copied to your project's AI tool directory:

- **`openspec-wiki-query/`** - Skill for querying the wiki before starting work
- **`openspec-wiki-ingest/`** - Skill for ingesting completed changes into the wiki

### `claude-settings.json`
Example hook configuration for Claude Code that automatically triggers wiki query and ingest operations.

## Quick Setup

1. Copy skills to your AI tool directory:
   ```bash
   # For Claude Code
   cp -r skills/openspec-wiki-query .claude/skills/
   cp -r skills/openspec-wiki-ingest .claude/skills/
   ```

2. Configure hooks (see `claude-settings.json` for example)

3. Initialize wiki structure in your project:
   ```bash
   mkdir -p openspec/docs/wiki/features
   mkdir -p openspec/docs/raw/00-uncategorized
   mkdir -p openspec/docs/schema
   ```

4. Restart your IDE

For detailed instructions, see [docs/guides/llm-wiki-integration.md](../../docs/guides/llm-wiki-integration.md).

## Directory Structure

The recommended wiki structure uses `openspec/docs/` as the base:

```
openspec/
├── docs/
│   ├── wiki/              # Knowledge base
│   │   ├── index.md
│   │   ├── log.md
│   │   ├── features/
│   │   ├── components/
│   │   └── ...
│   ├── raw/               # Source documents
│   │   ├── 00-meta/
│   │   ├── 00-uncategorized/
│   │   └── 05-configurations/
│   └── schema/            # Schema definitions
│       └── CLAUDE.md
```

## Customization

These examples are generic and should be customized for your project:

- Adjust wiki paths if using different structure
- Modify exclusion rules in schema file
- Customize page templates
- Adapt hook configuration for your IDE

## Notes

- Skills use `openspec/docs/` as the default wiki location
- Hooks are configured for Claude Code; adapt for other tools
- All content is in English for international compatibility
- Skills read from actual files, not hardcoded content
