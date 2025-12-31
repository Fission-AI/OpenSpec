# Schema Customization

This document describes how users can customize OpenSpec schemas and templates, the current manual process, and the gap that needs to be addressed.

---

## Overview

OpenSpec uses a 2-level schema resolution system following the XDG Base Directory Specification:

1. **User override**: `${XDG_DATA_HOME}/openspec/schemas/<name>/`
2. **Package built-in**: `<npm-package>/schemas/<name>/`

When a schema is requested (e.g., `spec-driven`), the resolver checks the user directory first. If found, that entire schema directory is used. Otherwise, it falls back to the package's built-in schema.

---

## Current Manual Process

To override the default `spec-driven` schema, a user must:

### 1. Determine the correct directory path

| Platform | Path |
|----------|------|
| macOS/Linux | `~/.local/share/openspec/schemas/` |
| Windows | `%LOCALAPPDATA%\openspec\schemas\` |
| All (if set) | `$XDG_DATA_HOME/openspec/schemas/` |

### 2. Create the directory structure

```bash
# macOS/Linux example
mkdir -p ~/.local/share/openspec/schemas/spec-driven/templates
```

### 3. Find and copy the default schema files

The user must locate the installed npm package to copy the defaults:

```bash
# Find the package location (varies by install method)
npm list -g openspec --parseable
# or
which openspec && readlink -f $(which openspec)

# Copy files from the package's schemas/ directory
cp <package-path>/schemas/spec-driven/schema.yaml ~/.local/share/openspec/schemas/spec-driven/
cp <package-path>/schemas/spec-driven/templates/*.md ~/.local/share/openspec/schemas/spec-driven/templates/
```

### 4. Modify the copied files

Edit `schema.yaml` to change the workflow structure:

```yaml
name: spec-driven
version: 1
description: My custom workflow
artifacts:
  - id: proposal
    generates: proposal.md
    description: Initial proposal
    template: proposal.md
    requires: []
  # Add, remove, or modify artifacts...
```

Edit templates in `templates/` to customize the content guidance.

### 5. Verify the override is active

Currently there's no command to verify which schema is being used. Users must trust that the file exists in the right location.

---

## Gap Analysis

The current process has several friction points:

| Issue | Impact |
|-------|--------|
| **Path discovery** | Users must know XDG conventions and platform-specific paths |
| **Package location** | Finding the npm package path varies by install method (global, local, pnpm, yarn, volta, etc.) |
| **No scaffolding** | Users must manually create directories and copy files |
| **No verification** | No way to confirm which schema is actually being resolved |
| **No diffing** | When upgrading openspec, users can't see what changed in built-in templates |
| **Full copy required** | Must copy entire schema even to change one template |

### User Stories Not Currently Supported

1. *"I want to add a `research` artifact before `proposal`"* — requires manual copy and edit
2. *"I want to customize just the proposal template"* — must copy entire schema
3. *"I want to see what the default schema looks like"* — must find package path
4. *"I want to revert to defaults"* — must delete files and hope paths are correct
5. *"I upgraded openspec, did the templates change?"* — no way to diff

---

## Proposed Solution: Schema Configurator

A CLI command (or set of commands) that handles path resolution and file operations for users.

### Option A: Single `openspec schema` command

```bash
# List available schemas (built-in and user overrides)
openspec schema list

# Show where a schema resolves from
openspec schema which spec-driven
# Output: /Users/me/.local/share/openspec/schemas/spec-driven/ (user override)
# Output: /usr/local/lib/node_modules/openspec/schemas/spec-driven/ (built-in)

# Copy a built-in schema to user directory for customization
openspec schema copy spec-driven
# Creates ~/.local/share/openspec/schemas/spec-driven/ with all files

# Show diff between user override and built-in
openspec schema diff spec-driven

# Remove user override (revert to built-in)
openspec schema reset spec-driven

# Validate a schema
openspec schema validate spec-driven
```

### Option B: Dedicated `openspec customize` command

```bash
# Interactive schema customization
openspec customize
# Prompts: Which schema? What do you want to change? etc.

# Copy and open for editing
openspec customize spec-driven
# Copies to user dir, prints path, optionally opens in $EDITOR
```

### Option C: Init-time schema selection

```bash
# During project init, offer schema customization
openspec init
# ? Select a workflow schema:
#   > spec-driven (default)
#     tdd
#     minimal
#     custom (copy and edit)
```

### Recommended Approach

**Option A** provides the most flexibility and follows Unix conventions (subcommands for discrete operations). Key commands in priority order:

1. `openspec schema list` — see what's available
2. `openspec schema which <name>` — debug resolution
3. `openspec schema copy <name>` — scaffold customization
4. `openspec schema diff <name>` — compare with built-in
5. `openspec schema reset <name>` — revert to defaults

---

## Implementation Considerations

### Path Resolution

The resolver already exists in `src/core/artifact-graph/resolver.ts`:

```typescript
export function getPackageSchemasDir(): string { ... }
export function getUserSchemasDir(): string { ... }
export function getSchemaDir(name: string): string | null { ... }
export function listSchemas(): string[] { ... }
```

New commands would leverage these existing functions.

### File Operations

- Copy should preserve file permissions
- Copy should not overwrite existing user files without `--force`
- Reset should prompt for confirmation

### Template-Only Overrides

A future enhancement could support overriding individual templates without copying the entire schema. This would require changes to the resolution logic:

```
Current: schema dir (user) OR schema dir (built-in)
Future:  schema.yaml from user OR built-in
         + each template from user OR built-in (independent fallback)
```

This adds complexity but enables the "I just want to change one template" use case.

---

## Related Documents

- [Schema Workflow Gaps](./schema-workflow-gaps.md) — End-to-end workflow analysis and phased implementation plan

## Related Files

| File | Purpose |
|------|---------|
| `src/core/artifact-graph/resolver.ts` | Schema resolution logic |
| `src/core/artifact-graph/instruction-loader.ts` | Template loading |
| `src/core/global-config.ts` | XDG path helpers |
| `schemas/spec-driven/` | Default schema and templates |
