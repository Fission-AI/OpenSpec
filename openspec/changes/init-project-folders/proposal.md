## Why

ClearSpec aims to help users spec out larger-scale projects, but `clearspec init` currently scaffolds only the core authoring structure (`specs/`, `changes/`). Large projects also need a consistent home for upstream inputs — requirements, related code repositories, supporting context, and finished specifications — so contributors and AI assistants know where to put and find this material from day one.

## What Changes

- `clearspec init` creates four additional top-level folders inside the `clearspec/` directory:
  - `project-requirements/`
  - `code-repositories/`
  - `additional-context/`
  - `project-specifications/`
- These folders are created in both fresh initialization and extend mode (when `clearspec/` already exists), matching the existing behavior for `specs/` and `changes/`.
- The four new folders are created regardless of AI tool selection (including `--tools none`), consistent with the rest of the base structure.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `cli-init`: The **Directory Creation** requirement expands the scaffolded structure to include the four new project folders alongside the existing `specs/` and `changes/archive/` directories.

## Impact

- Code: `src/core/init.ts` — `createDirectoryStructure()` (the hardcoded directory arrays for both extend and fresh modes).
- Tests: `test/core/init.test.ts` — the "should create ClearSpec directory structure" test (and related coverage) must assert the new folders exist.
- Spec: `openspec/specs/cli-init/spec.md` — Directory Creation requirement updated via delta.
- No breaking changes; existing structure and behavior are preserved and only added to.
