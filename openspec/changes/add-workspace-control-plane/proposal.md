## Why

OpenSpec currently assumes one active project root at a time. That works well for single-repo setups, but it leaves multi-repo teams without a standard way to keep agents grounded across a shared workspace.

A common real-world setup looks like this:

```text
scm/
├── openspec-management/
├── service-auth/
└── service-payments/
```

In this model, teams want:

- a dedicated control-plane repo for shared specs, schemas, and workspace metadata
- a predictable workspace manifest that maps sibling repos and their local agent instructions
- generated router files that help AGENTS-compatible assistants discover the full project map
- automation for initial scaffolding and later resync without requiring a monorepo

Today, users must assemble that structure by hand. OpenSpec has no first-class workspace concept, no checked-in manifest for multi-repo topology, and no CLI support for scaffolding or syncing a control-plane repo.

## What Changes

### 1. Add a first-class workspace model

Introduce a checked-in workspace manifest at the shared workspace root. This manifest becomes the source of truth for multi-repo topology and control-plane settings.

The initial format is `openspec-workspace.yaml` and includes:

- control-plane repo path
- member repo paths
- optional repo roles and tags
- local agent-instruction file paths when present
- generation settings for workspace-level router files

### 2. Add a dedicated workspace command surface

Introduce a new `openspec workspace` command group for multi-repo setup and maintenance:

- `openspec workspace init`
- `openspec workspace sync`
- `openspec workspace doctor`

These commands are distinct from `openspec init`, which remains project-scoped.

### 3. Scaffold a control-plane repo and workspace files

`openspec workspace init` scaffolds a control-plane repo such as `openspec-management/`, creates the workspace manifest, and optionally generates a root router file for AGENTS-compatible assistants.

The command SHOULD support starting from either:

- an existing shared parent directory containing sibling repos
- an empty target directory where the control-plane repo will be created first

### 4. Treat router files as generated outputs

OpenSpec SHALL treat agent-facing router files such as `.agents.md` as generated artifacts derived from the workspace manifest, not as the primary persisted contract.

This keeps the system tool-agnostic and avoids making OpenSpec responsible for owning every repo-local `AGENTS.md` file.

### 5. Support auto-discovery with explicit review

Workspace init/sync can scan sibling directories for candidate repos and local `AGENTS.md` files, but discovered entries SHALL be reviewed before being written into the manifest.

This avoids accidentally sweeping unrelated repos into the workspace map.

## Capabilities

### New Capabilities

- `cli-workspace`: Workspace-focused CLI commands for multi-repo scaffolding, sync, and diagnostics
- `workspace-manifest`: Checked-in manifest for control-plane configuration and repo topology

### Modified Capabilities

- `docs-agent-instructions`: Document workspace-generated router files and clarify ownership boundaries between user-authored local instructions and OpenSpec-generated workspace routing

## Impact

### New Files

- `src/commands/workspace.ts` - Register `workspace init|sync|doctor`
- `src/core/workspace/manifest.ts` - Manifest types, parsing, validation
- `src/core/workspace/discovery.ts` - Sibling repo and instruction-file discovery
- `src/core/workspace/sync.ts` - Manifest-driven file generation and drift checks
- `src/core/workspace/router-generation.ts` - Generate `.agents.md` and related router outputs

### Modified Files

- `src/cli/index.ts` - Register workspace commands
- `docs/cli.md` - Document workspace command group
- `docs/getting-started.md` or new workspace docs - Explain control-plane setup and workspace lifecycle

## Recommended UX

```text
$ openspec workspace init

Workspace root: /Users/alex/dev/scm
Control plane: ./openspec-management

Discovered sibling repos:
  [x] service-auth        ./service-auth
  [x] service-payments    ./service-payments
  [ ] playground-scratch  ./playground-scratch

Detected instruction files:
  service-auth        ./service-auth/AGENTS.md
  service-payments    ./service-payments/AGENTS.md

Create:
  - openspec-workspace.yaml
  - openspec-management/
  - .agents.md
```

## Notes

- This proposal intentionally does not overload `openspec init` with workspace behavior.
- This proposal intentionally does not make OpenSpec the owner of every repo-local `AGENTS.md`.
- Tool-specific router generation beyond `.agents.md` can follow later once the manifest and command surface are in place.
