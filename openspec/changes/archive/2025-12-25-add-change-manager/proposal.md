## Why

There's no programmatic way to create a new change directory. Users must manually:
1. Create `openspec/changes/<name>/` directory
2. Create a `proposal.md` file
3. Hope they got the naming right

This is error-prone and blocks automation (e.g., Claude commands, scripts).

**This proposal adds:**
1. `createChange(projectRoot, name)` - Create change directories programmatically
2. `validateChangeName(name)` - Enforce kebab-case naming conventions

## What Changes

### New Utilities

| Function | Description |
|----------|-------------|
| `createChange(projectRoot, name)` | Creates `openspec/changes/<name>/` directory |
| `validateChangeName(name)` | Returns `{ valid: boolean; error?: string }` |

### Name Validation Rules

Pattern: `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`

| Valid | Invalid |
|-------|---------|
| `add-auth` | `Add-Auth` (uppercase) |
| `refactor-db` | `add auth` (spaces) |
| `add-feature-2` | `add_auth` (underscores) |
| `refactor` | `-add-auth` (leading hyphen) |

### Location

New file: `src/utils/change-utils.ts`

Simple utility functions - no class, no abstraction layer.

## Impact

- **Affected specs**: None
- **Affected code**: None (new utilities only)
- **New files**: `src/utils/change-utils.ts`
- **Breaking changes**: None
