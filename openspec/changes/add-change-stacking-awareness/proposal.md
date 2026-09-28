## Why

Parallel changes often touch the same capabilities and `cli-init`/`cli-update` behavior, but today there is no machine-readable way to express sequencing, dependencies, or expected merge order.

This creates three recurring problems:

- teams cannot tell which change should land first
- large changes are hard to split into safe mergeable slices
- parallel work can accidentally reintroduce assumptions already removed by another change

We need lightweight planning metadata and CLI guidance so contributors can safely stack plans on top of each other.

## What Changes

### 1. Add lightweight stack metadata for changes

Extend change metadata to support sequencing and decomposition context, for example:

- `dependsOn`: changes that must land first
- `provides`: capability markers exposed by this change
- `requires`: capability markers needed by this change
- `touches`: capability/spec areas likely affected (advisory only; warning signal, not a hard dependency)
- `parent`: optional parent change for split work

Metadata is optional and backward compatible for existing changes.

Ordering semantics:

- `dependsOn` is the source of truth for execution/archive ordering
- `provides`/`requires` are capability contracts for validation and planning visibility
- `provides`/`requires` do not create implicit dependency edges; authors must still declare required ordering via `dependsOn`

### 2. Add stack-aware validation

Enhance change validation to detect planning issues early:

- missing dependencies
- dependency cycles
- archive ordering violations (for example, attempting to archive a change before all `dependsOn` predecessors are archived)
- unmatched capability markers (for example, `requires` marker with no provider in active history emits non-blocking warning)
- overlap warnings when active changes touch the same capability

Validation should fail only for deterministic blockers (for example cycles or missing required dependencies), and keep overlap checks as actionable warnings.

### 3. Add sequencing visibility commands

Add lightweight CLI support to inspect and execute plan order:

- `openspec change graph` to show dependency DAG/order
- `openspec change graph` validates for cycles first; when cycles are present it fails with the same deterministic cycle error as stack-aware validation
- `openspec change next` to suggest unblocked changes ready to implement/archive

### 4. Add split scaffolding for large changes

Add helper workflow to decompose large proposals into stackable slices:

- `openspec change split <change-id>` scaffolds child changes with `parent` + `dependsOn`
- generates minimal proposal/tasks stubs for each child slice
- converts the source change into a parent planning container (no duplicate child implementation tasks)
- re-running split for an already-split source change returns a deterministic actionable error unless `--overwrite` (alias `--force`) is passed
- `--overwrite` / `--force` fully regenerates managed child scaffold stubs and metadata links for the split, replacing prior scaffold content

### 5. Document stack-first workflow

Update docs to describe:

- how to model dependencies and parent/child slices
- when to split a large change
- how to use graph/next validation signals during parallel development
- migration guidance for `openspec/changes/IMPLEMENTATION_ORDER.md`:
  - machine-readable change metadata becomes the normative dependency source
  - `IMPLEMENTATION_ORDER.md` remains optional narrative context during transition

## Capabilities

### New Capabilities

- `change-stacking-workflow`: Dependency-aware sequencing and split scaffolding for change planning

### Modified Capabilities

- `cli-change`: Adds graph/next/split planning commands and stack-aware validation messaging
- `change-creation`: Supports parent/dependency metadata when creating or splitting changes
- `openspec-conventions`: Defines optional stack metadata conventions for change proposals

## Impact

- `src/core/project-config.ts` and related parsing/validation utilities for change metadata loading
- `src/core/config-schema.ts` (or dedicated change schema) for stack metadata validation
- `src/commands/change.ts` and/or `src/core/list.ts` for graph/next/split command behavior
- `src/core/validation/*` for dependency cycle and overlap checks
- `docs/cli.md`, `docs/concepts.md`, and contributor guidance for stack-aware workflows
- tests for metadata parsing, graph ordering, next-item suggestions, and split scaffolding
