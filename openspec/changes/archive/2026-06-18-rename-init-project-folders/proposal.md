## Why

The folders `clearspec init` scaffolds for project inputs and outputs currently use long, hyphenated names (`project-requirements/`, `code-repositories/`, `additional-context/`, `project-specifications/`). Shorter, simpler names are easier to type, read, and reason about, and align better with the ClearSpec vocabulary (spec-packs).

## What Changes

- `clearspec init` creates this set of four top-level folders inside `clearspec/` instead of the current set:
  - `requirements/` (was `project-requirements/`)
  - `context/` (was `additional-context/`)
  - `code/` (was `code-repositories/`)
  - `spec-packs/` (was `project-specifications/`)
- The new names apply everywhere the old names did: fresh initialization, extend mode (existing `clearspec/`), and `--tools none`.
- Folders continue to be created empty and idempotently, preserving any existing content in extend mode.
- Tests are updated to assert the new folder names.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `cli-init`: The **Directory Creation** requirement is updated so the scaffolded project folders are `requirements/`, `context/`, `code/`, and `spec-packs/` instead of the previous four names.

## Impact

- Code: `src/core/config.ts` — `CLEARSPEC_PROJECT_FOLDERS` constant values.
- Code: `src/core/init.ts` — consumes the constant in `createDirectoryStructure()` (no change needed if the constant is updated, since folders are derived from it).
- Tests: `test/core/init.test.ts` — coverage that references folder names (including the hardcoded `project-requirements` assertion).
- Spec: `openspec/specs/cli-init/spec.md` — Directory Creation requirement updated via delta.
- No breaking changes to command behavior; only the names of the scaffolded folders change.
