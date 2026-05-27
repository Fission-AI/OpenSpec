## Context

This is Slice 2 of the artifact tracker POC. The goal is to provide utilities for creating change directories programmatically.

**Current state:** No programmatic way to create changes. Users must manually create directories.

**Proposed state:** Utility functions for change creation with name validation.

## Goals / Non-Goals

### Goals
- **Add** `createChange()` function to create change directories
- **Add** `validateChangeName()` function for kebab-case validation
- **Enable** automation (Claude commands, scripts) to create changes

### Non-Goals
- Refactor existing CLI commands (they work fine)
- Create abstraction layers or manager classes
- Change how `ListCommand` or `ChangeCommand` work

## Decisions

### Decision 1: Simple Utility Functions

**Choice**: Add functions to `src/utils/change-utils.ts` - no class.

```typescript
// src/utils/change-utils.ts

export function validateChangeName(name: string): { valid: boolean; error?: string }

export async function createChange(
  projectRoot: string,
  name: string
): Promise<void>
```

**Why**:
- Simple, no abstraction overhead
- Easy to test
- Easy to import where needed
- Matches existing utility patterns in `src/utils/`

**Alternatives considered**:
- ChangeManager class: Rejected - over-engineered for 2 functions
- Add to existing command: Rejected - mixes CLI with reusable logic

### Decision 2: Kebab-Case Validation Pattern

**Choice**: Validate names with `^[a-z][a-z0-9]*(-[a-z0-9]+)*$`

Valid: `add-auth`, `refactor-db`, `add-feature-2`, `refactor`
Invalid: `Add-Auth`, `add auth`, `add_auth`, `-add-auth`, `add-auth-`, `add--auth`

**Why**:
- Filesystem-safe (no special characters)
- URL-safe (for future web UI)
- Consistent with existing change naming in repo

## File Changes

### New Files
- `src/utils/change-utils.ts` - Utility functions
- `src/utils/change-utils.test.ts` - Unit tests

### Modified Files
- None

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Function might not cover all use cases | Start simple, extend if needed |
| Naming conflicts with future work | Using clear, specific function names |
