## Context

This is Slice 2 of the artifact tracker POC. The goal is to provide a reusable `ChangeManager` module for change directory operations.

**Current state:** Change logic is duplicated across CLI commands:
- `ListCommand` (`src/core/list.ts:17-61`) - scans directories, excludes archive
- `ChangeCommand` (`src/commands/change.ts:242-260`) - `getActiveChanges()` duplicates this
- Path resolution via inline `path.join()` scattered throughout
- Existence checks via inline `fs.access()` scattered throughout

**Proposed state:** Single `ChangeManager` module that CLI commands delegate to.

## Goals / Non-Goals

### Goals
- **Extract** duplicated logic into reusable module
- **Add** new functionality: `createChange()`, name validation
- **Refactor** CLI commands to be thin wrappers
- **Enable** artifact-graph Slices 3/4 to reuse this module
- **Maintain** existing CLI behavior (no breaking changes)

### Non-Goals
- Change CLI command interfaces
- Add new CLI commands (that's Slice 4)
- Modify validation logic (stays in `Validator` class)
- Modify parsing logic (stays in `ChangeParser` class)

## Decisions

### Decision 1: Extract to Separate Module

**Choice**: Create `src/core/change-manager/` as a new module directory.

```
src/core/change-manager/
├── index.ts              # Public exports
├── change-manager.ts     # ChangeManager class
└── validation.ts         # Name validation utilities
```

**Why**:
- Follows pattern established by `artifact-graph/`
- Clear separation from CLI commands
- Testable in isolation
- Can be imported by other modules

**Alternatives considered**:
- Add methods to existing `ChangeCommand`: Rejected - mixes core logic with CLI
- Create single file `src/core/change-manager.ts`: Acceptable, but directory allows growth

### Decision 2: Class-Based API with Explicit Project Root

**Choice**: `ChangeManager` class instantiated with `projectRoot` path.

```typescript
class ChangeManager {
  constructor(options: { projectRoot: string })

  // Extracted methods
  listChanges(): Promise<string[]>
  changeExists(name: string): boolean
  getChangePath(name: string): string
  isInitialized(): boolean

  // New methods
  createChange(name: string, description?: string): Promise<void>
  validateName(name: string): { valid: boolean; error?: string }
}
```

**Why**:
- Explicit `projectRoot` makes testing trivial
- Matches pattern used in `artifact-graph` module
- Avoids `process.cwd()` coupling

### Decision 3: Preserve Existing Behavior During Extraction

**Choice**: Extracted methods MUST behave identically to current implementations.

| Method | Source | Behavior to Preserve |
|--------|--------|---------------------|
| `listChanges()` | `ListCommand` + `getActiveChanges()` | Exclude `archive/`, filter to dirs, sort alphabetically |
| `changeExists()` | Inline `fs.access()` | Synchronous-style check (can be sync or async) |
| `getChangePath()` | Inline `path.join()` | Return absolute path, throw if not exists |

**Why**:
- No behavioral changes = no risk of breaking existing CLI
- Tests can verify parity with current behavior
- Refactor is purely structural

### Decision 4: CLI Commands Become Thin Wrappers

**Choice**: After refactor, CLI commands only handle:
- User interaction (prompts, selection)
- Output formatting (console.log, JSON)
- Error presentation

```typescript
// Before (in ChangeCommand)
async list() {
  const entries = await fs.readdir(changesPath, { withFileTypes: true });
  const result = entries.filter(e => e.isDirectory() && e.name !== 'archive');
  // ... more logic
}

// After
async list() {
  const changes = await this.changeManager.listChanges();
  // Just format and output
  console.log(JSON.stringify(changes));
}
```

**Why**:
- Clear separation of concerns
- Core logic testable without CLI
- Consistent pattern across commands

### Decision 5: Kebab-Case Validation Pattern

**Choice**: Validate names with `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`

Valid: `add-auth`, `refactor-db`, `add-feature-2`, `refactor`
Invalid: `Add-Auth`, `add auth`, `add_auth`, `-add-auth`, `add-auth-`, `add--auth`

**Why**:
- Filesystem-safe (no special characters)
- URL-safe (for future web UI)
- Consistent with existing change naming conventions in repo
- Prevents common mistakes (spaces, underscores)

### Decision 6: README.md for Change Metadata

**Choice**: `createChange()` generates a `README.md` with name and optional description.

```markdown
# add-auth

Add user authentication system
```

**Why**:
- Human-readable in GitHub/GitLab UI
- Minimal overhead
- Matches existing manual change creation patterns

## File Changes

### New Files
- `src/core/change-manager/index.ts` - Public exports
- `src/core/change-manager/change-manager.ts` - Class implementation
- `src/core/change-manager/validation.ts` - Name validation
- `src/core/change-manager/change-manager.test.ts` - Unit tests

### Modified Files
- `src/core/list.ts` - Import and use ChangeManager
- `src/commands/change.ts` - Import and use ChangeManager
- `src/core/index.ts` - Export ChangeManager

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Behavioral changes during extraction | Write tests against current behavior FIRST, then refactor |
| Breaking CLI commands | No interface changes, only internal refactor |
| Circular dependencies | ChangeManager has no dependencies on CLI layer |

## Migration Plan

1. **Phase 1**: Create `ChangeManager` with extracted methods + tests
2. **Phase 2**: Add new methods (`createChange`, `validateName`) + tests
3. **Phase 3**: Refactor `ListCommand` to use ChangeManager
4. **Phase 4**: Refactor `ChangeCommand` to use ChangeManager
5. **Phase 5**: Verify all existing tests pass

## Open Questions

None - all questions resolved.
