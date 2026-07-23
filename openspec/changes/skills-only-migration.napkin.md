# Skills-Only Migration

Napkin doc for migrating from legacy templates to skills-based architecture.

## Core Idea

Replace 18 template functions with single `SkillDefinition[]` array. Skills become source of truth. No new commands - make existing commands smarter.

## Two Parts

### Part 1: Foundation

- `SkillDefinition[]` array as single source of truth
- `openspec init` generates skills-only setup (no AGENTS.md)
- Editor detection built-in (.claude/, .cursor/, .windsurf/, .cline/)
- Generate equivalent configs for all detected editors

### Part 2: Smart Update

Make `openspec update` handle migration automatically:

```
$ openspec update

# Detects state and acts accordingly:

# If nothing exists:
No openspec setup found. Run 'openspec init' first.

# If already modern:
Updating skills...
✓ 12 skills up to date
✓ Editor configs refreshed

# If legacy detected:
Legacy setup detected.

This will:
• Create skills/ (12 skills)
• Create editor configs
• Backup existing to .openspec/backup/
• Remove AGENTS.md and old templates

Proceed? [Y/n]
```

## State Detection

| State | `init` | `update` |
|-------|--------|----------|
| None | Run normally | Error → suggest init |
| Legacy | Suggest update | Migrate with confirmation + backup |
| Modern | "Already initialized" | Refresh/sync |

## What We're NOT Doing

- ❌ Separate `upgrade` command (use `update`)
- ❌ Separate `cleanup` command (update handles removal)
- ❌ `openspec status` for setup state (that's for change workflows)
- ❌ `openspec restore` command (backup dir + git is enough)
- ❌ Post-migration verification step
- ❌ Contextual nudges in other commands

## Execution

Part 1 → Part 2 (sequential, Part 2 depends on Part 1)

## Open Questions

- Backup location: `.openspec/backup/` or `.openspec-backup/`?
- Should `--dry-run` be supported on update for migration preview?
- How verbose should the migration confirmation be?
