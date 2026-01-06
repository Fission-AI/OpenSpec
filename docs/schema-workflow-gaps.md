# Schema Workflow: End-to-End Analysis

This document analyzes the complete user journey for working with schemas in OpenSpec, identifies gaps, and proposes a phased solution.

---

## Current State

### What Exists

| Component | Status |
|-----------|--------|
| Schema resolution (XDG) | 2-level: user override → package built-in |
| Built-in schemas | `spec-driven`, `tdd` |
| Artifact workflow commands | `status`, `next`, `instructions`, `templates` with `--schema` flag |
| Change creation | `openspec new change <name>` — no schema binding |

### What's Missing

| Component | Status |
|-----------|--------|
| Schema bound to change | Not stored — must pass `--schema` every time |
| Project-local schemas | Not supported — can't version control with repo |
| Schema management CLI | None — manual path discovery required |
| Project default schema | None — hardcoded to `spec-driven` |

---

## User Journey Analysis

### Scenario 1: Using a Non-Default Schema

**Goal:** User wants to use TDD workflow for a new feature.

**Today's experience:**
```bash
openspec new change add-auth
# Creates directory, no schema info stored

openspec status --change add-auth
# Shows spec-driven artifacts (WRONG - user wanted TDD)

# User realizes mistake...
openspec status --change add-auth --schema tdd
# Correct, but must remember --schema every time

# 6 months later...
openspec status --change add-auth
# Wrong again - nobody remembers this was TDD
```

**Problems:**
- Schema is a runtime argument, not persisted
- Easy to forget `--schema` and get wrong results
- No record of intended schema for future reference

---

### Scenario 2: Customizing a Schema

**Goal:** User wants to add a "research" artifact before "proposal".

**Today's experience:**
```bash
# Step 1: Figure out where to put overrides
# Must know XDG conventions:
#   macOS/Linux: ~/.local/share/openspec/schemas/
#   Windows: %LOCALAPPDATA%\openspec\schemas/

# Step 2: Create directory structure
mkdir -p ~/.local/share/openspec/schemas/my-workflow/templates

# Step 3: Find the npm package to copy defaults
npm list -g openspec --parseable
# Output varies by package manager:
#   npm: /usr/local/lib/node_modules/openspec
#   pnpm: ~/.local/share/pnpm/global/5/node_modules/openspec
#   volta: ~/.volta/tools/image/packages/openspec/...
#   yarn: ~/.config/yarn/global/node_modules/openspec

# Step 4: Copy files
cp -r <package-path>/schemas/spec-driven/* \
      ~/.local/share/openspec/schemas/my-workflow/

# Step 5: Edit schema.yaml and templates
# No way to verify override is active
# No way to diff against original
```

**Problems:**
- Must know XDG path conventions
- Finding npm package path varies by install method
- No tooling to scaffold or verify
- No diff capability when upgrading openspec

---

### Scenario 3: Team Sharing Custom Workflow

**Goal:** Team wants everyone to use the same custom schema.

**Today's options:**
1. Everyone manually sets up XDG override — error-prone, drift risk
2. Document setup in README — still manual, easy to miss
3. Publish separate npm package — overkill for most teams
4. Check schema into repo — **not supported** (no project-local resolution)

**Problems:**
- No project-local schema resolution
- Can't version control custom schemas with the codebase
- No single source of truth for team workflow

---

## Gap Summary

| Gap | Impact | Workaround |
|-----|--------|------------|
| Schema not bound to change | Wrong results, forgotten context | Remember to pass `--schema` |
| No project-local schemas | Can't share via repo | Manual XDG setup per machine |
| No schema management CLI | Manual path hunting | Know XDG + find npm package |
| No project default schema | Must specify every time | Always pass `--schema` |
| No init-time schema selection | Missed setup opportunity | Manual config |

---

## Proposed Architecture

### New File Structure

```
openspec/
├── config.yaml                 # Project config (NEW)
├── schemas/                    # Project-local schemas (NEW)
│   └── my-workflow/
│       ├── schema.yaml
│       └── templates/
│           ├── research.md
│           ├── proposal.md
│           └── ...
└── changes/
    └── add-auth/
        ├── change.yaml         # Change metadata (NEW)
        ├── proposal.md
        └── ...
```

### config.yaml (Project Config)

```yaml
# openspec/config.yaml
defaultSchema: spec-driven
```

Sets the project-wide default schema. Used when:
- Creating new changes without `--schema`
- Running commands on changes without `change.yaml`

### change.yaml (Change Metadata)

```yaml
# openspec/changes/add-auth/change.yaml
schema: tdd
created: 2025-01-15T10:30:00Z
description: Add user authentication system
```

Binds a specific schema to a change. Created automatically by `openspec new change`.

### Schema Resolution Order

```
1. ./openspec/schemas/<name>/                    # Project-local
2. ~/.local/share/openspec/schemas/<name>/       # User global (XDG)
3. <npm-package>/schemas/<name>/                 # Built-in
```

Project-local takes priority, enabling version-controlled custom schemas.

### Schema Selection Order (Per Command)

```
1. --schema CLI flag                    # Explicit override
2. change.yaml in change directory      # Change-specific binding
3. openspec/config.yaml defaultSchema   # Project default
4. "spec-driven"                        # Hardcoded fallback
```

---

## Ideal User Experience

### Creating a Change

```bash
# Uses project default (from config.yaml, or spec-driven)
openspec new change add-auth
# Creates openspec/changes/add-auth/change.yaml:
#   schema: spec-driven
#   created: 2025-01-15T10:30:00Z

# Explicit schema for this change
openspec new change add-auth --schema tdd
# Creates change.yaml with schema: tdd
```

### Working with Changes

```bash
# Auto-reads schema from change.yaml — no --schema needed
openspec status --change add-auth
# Output: "Change: add-auth (schema: tdd)"
# Shows which artifacts are ready/blocked/done

# Explicit override still works (with informational message)
openspec status --change add-auth --schema spec-driven
# "Note: change.yaml specifies 'tdd', using 'spec-driven' per --schema flag"
```

### Customizing Schemas

```bash
# See what's available
openspec schema list
# Built-in:
#   spec-driven    proposal → specs → design → tasks
#   tdd            spec → tests → implementation → docs
# Project: (none)
# User: (none)

# Copy to project for customization
openspec schema copy spec-driven my-workflow
# Created ./openspec/schemas/my-workflow/
# Edit schema.yaml and templates/ to customize

# Copy to global (user-level override)
openspec schema copy spec-driven --global
# Created ~/.local/share/openspec/schemas/spec-driven/

# See where a schema resolves from
openspec schema which spec-driven
# ./openspec/schemas/spec-driven/ (project)
# or: ~/.local/share/openspec/schemas/spec-driven/ (user)
# or: /usr/local/lib/node_modules/openspec/schemas/spec-driven/ (built-in)

# Compare override with built-in
openspec schema diff spec-driven
# Shows diff between user/project version and package built-in

# Remove override, revert to built-in
openspec schema reset spec-driven
# Removes ./openspec/schemas/spec-driven/ (or --global for user dir)
```

### Project Setup

```bash
openspec init
# ? Select default workflow schema:
#   > spec-driven (proposal → specs → design → tasks)
#     tdd (spec → tests → implementation → docs)
#     (custom schemas if detected)
#
# Writes to openspec/config.yaml:
#   defaultSchema: spec-driven
```

---

## Implementation Phases

### Phase 1: Change Metadata (change.yaml)

**Priority:** High
**Solves:** "Forgot --schema", lost context, wrong results

**Scope:**
- Create `change.yaml` when running `openspec new change`
- Store `schema`, `created` timestamp
- Modify workflow commands to read schema from `change.yaml`
- `--schema` flag overrides (with informational message)
- Backwards compatible: missing `change.yaml` → use default

**change.yaml format:**
```yaml
schema: tdd
created: 2025-01-15T10:30:00Z
```

**Migration:**
- Existing changes without `change.yaml` continue to work
- Default to `spec-driven` (current behavior)
- Optional: `openspec migrate` to add `change.yaml` to existing changes

---

### Phase 2: Project-Local Schemas

**Priority:** High
**Solves:** Team sharing, version control, no XDG knowledge needed

**Scope:**
- Add `./openspec/schemas/` to resolution order (first priority)
- `openspec schema copy <name> [new-name]` creates in project by default
- `--global` flag for user-level XDG directory
- Teams can commit `openspec/schemas/` to repo

**Resolution order:**
```
1. ./openspec/schemas/<name>/           # Project-local (NEW)
2. ~/.local/share/openspec/schemas/<name>/  # User global
3. <npm-package>/schemas/<name>/        # Built-in
```

---

### Phase 3: Schema Management CLI

**Priority:** Medium
**Solves:** Path discovery, scaffolding, debugging

**Commands:**
```bash
openspec schema list              # Show available schemas with sources
openspec schema which <name>      # Show resolution path
openspec schema copy <name> [to]  # Copy for customization
openspec schema diff <name>       # Compare with built-in
openspec schema reset <name>      # Remove override
openspec schema validate <name>   # Validate schema.yaml structure
```

---

### Phase 4: Project Config + Init Enhancement

**Priority:** Low
**Solves:** Project-wide defaults, streamlined setup

**Scope:**
- Add `openspec/config.yaml` with `defaultSchema` field
- `openspec init` prompts for schema selection
- Store selection in `config.yaml`
- Commands use as fallback when no `change.yaml` exists

**config.yaml format:**
```yaml
defaultSchema: spec-driven
```

---

## Backwards Compatibility

| Scenario | Behavior |
|----------|----------|
| Existing change without `change.yaml` | Uses `--schema` flag or project default or `spec-driven` |
| Existing project without `config.yaml` | Falls back to `spec-driven` |
| `--schema` flag provided | Overrides `change.yaml` (with info message) |
| No project-local schemas dir | Skipped in resolution, checks user/built-in |

All existing functionality continues to work. New features are additive.

---

## Related Documents

- [Schema Customization](./schema-customization.md) — Details on manual override process and CLI gaps
- [Artifact POC](./artifact_poc.md) — Core artifact graph architecture

## Related Code

| File | Purpose |
|------|---------|
| `src/core/artifact-graph/resolver.ts` | Schema resolution logic |
| `src/core/artifact-graph/instruction-loader.ts` | Template loading |
| `src/core/global-config.ts` | XDG path helpers |
| `src/commands/artifact-workflow.ts` | CLI commands |
| `src/utils/change-utils.ts` | Change creation utilities |
