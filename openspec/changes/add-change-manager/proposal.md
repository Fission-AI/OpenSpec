## Why

Change management logic is currently duplicated across multiple CLI commands:
- `ListCommand` (`src/core/list.ts`) scans `openspec/changes/`, excludes `archive/`
- `ChangeCommand` (`src/commands/change.ts`) has `getActiveChanges()` doing the same
- Path resolution and existence checks are inline `fs.access()` / `path.join()` calls
- No centralized place for change CRUD operations

This makes the code harder to maintain and prevents reuse by the artifact-graph system (Slices 3/4).

**This proposal:**
1. **Extracts** existing change logic into a reusable `ChangeManager` module
2. **Adds** new functionality: `createChange()` and kebab-case name validation
3. **Refactors** CLI commands to use the new module (thin wrappers)

## What Changes

### New Module: `ChangeManager` (`src/core/change-manager/`)

A core module consolidating all change directory operations:

| Method | Source | Description |
|--------|--------|-------------|
| `listChanges()` | **Extract** | From `ListCommand` + `ChangeCommand.getActiveChanges()` |
| `changeExists(name)` | **Extract** | From inline `fs.access()` checks |
| `getChangePath(name)` | **Extract** | From inline `path.join()` logic |
| `isInitialized()` | **Extract** | From `ListCommand` directory check |
| `createChange(name, desc?)` | **NEW** | Create change directory + README |
| `validateName(name)` | **NEW** | Enforce kebab-case naming |

### Refactored Commands (thin wrappers)

| Command | Before | After |
|---------|--------|-------|
| `ListCommand.execute()` | Inline fs scanning | Calls `changeManager.listChanges()` |
| `ChangeCommand.list()` | Inline `getActiveChanges()` | Calls `changeManager.listChanges()` |
| `ChangeCommand.show()` | Inline path building | Calls `changeManager.getChangePath()` |
| `ChangeCommand.validate()` | Inline path building | Calls `changeManager.getChangePath()` |

### Key Design Decisions

- **Single source of truth** - All change operations go through ChangeManager
- **CLI becomes thin** - Commands handle formatting/interaction only
- **Testable core** - ChangeManager is pure, no CLI coupling
- **Reusable** - artifact-graph Slices 3/4 can import and use it

## Impact

- **Affected specs**: None (internal refactor + new capability)
- **New spec**: `change-manager` - Consolidated change operations
- **Affected code**:
  - New: `src/core/change-manager/index.ts` - Main module
  - New: `src/core/change-manager/change-manager.ts` - Class implementation
  - New: `src/core/change-manager/validation.ts` - Name validation
  - Refactor: `src/core/list.ts` - Use ChangeManager
  - Refactor: `src/commands/change.ts` - Use ChangeManager
- **Dependencies**: Used by `artifact-graph` for Slices 3/4
- **Breaking changes**: None (CLI interface unchanged)
