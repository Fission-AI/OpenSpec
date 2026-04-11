## Context

OpenSpec's current initialization and instruction-loading model is repo-local:

- `openspec init` scaffolds one project path at a time
- `openspec/config.yaml` is loaded relative to one project root
- legacy cleanup explicitly treats root `AGENTS.md` as user-owned content

That makes the current model a poor fit for multi-repo workspaces where teams want one shared control plane plus several sibling implementation repos.

The proposed solution is to add a first-class workspace layer above project repos without regressing the current single-repo flow.

## Goals / Non-Goals

**Goals:**

- provide a checked-in source of truth for multi-repo workspace topology
- support a dedicated control-plane repo pattern without requiring a monorepo
- scaffold and sync workspace files from a stable manifest
- generate a root router file for AGENTS-compatible assistants
- preserve repo-local `AGENTS.md` ownership boundaries
- keep single-repo `openspec init` behavior intact

**Non-Goals:**

- replacing per-repo OpenSpec initialization with workspace-only setup
- standardizing every possible assistant-specific router format in the first change
- recursively inferring arbitrary nested repository graphs
- making network calls or SCM-host assumptions during workspace discovery

## Decisions

### 1. Use a manifest as the source of truth

The workspace root SHALL store `openspec-workspace.yaml` as the authoritative description of the multi-repo topology.

Example shape:

```yaml
version: 1
controlPlane:
  path: ./openspec-management
repos:
  - name: auth
    path: ./service-auth
    role: implementation
    instructions: ./service-auth/AGENTS.md
  - name: payments
    path: ./service-payments
    role: implementation
    instructions: ./service-payments/AGENTS.md
generation:
  agentsRouter:
    enabled: true
    path: ./.agents.md
```

**Rationale:** a manifest is easier to validate, diff, and evolve than treating `.agents.md` as the primary contract.

### 2. Keep router files generated, not authoritative

Workspace router files such as `.agents.md` SHALL be rendered from manifest state.

**Rationale:** this keeps OpenSpec from reintroducing the older pattern of directly owning root and nested `AGENTS.md` files. User-authored repo-local instructions remain user-managed; OpenSpec only references them.

### 3. Add a separate `workspace` command group

Workspace behavior belongs under a dedicated command surface:

- `openspec workspace init`
- `openspec workspace sync`
- `openspec workspace doctor`

**Rationale:** `openspec init` is already well established as project-scoped. Mixing workspace semantics into that command would blur scope and make safety guarantees harder to communicate.

### 4. Default to sibling-directory discovery with explicit confirmation

Workspace discovery SHOULD scan immediate child directories of the chosen workspace root for:

- git repos
- existing `openspec/` directories
- `AGENTS.md` files

Discovered repos SHALL be presented for review before they are written to the manifest.

**Rationale:** sibling discovery matches the common `scm/` layout while avoiding hidden implicit behavior.

### 5. Keep control-plane scaffolding lightweight

The generated control-plane repo SHOULD start with:

- `AGENTS.md` for control-plane instructions
- `specs/` for shared schemas or cross-repo specs
- optional `README.md` describing the workspace contract

It MAY omit initializing a nested OpenSpec project until the team explicitly requests it.

**Rationale:** some teams want only a workspace map first; forcing full repo initialization would add ceremony.

## Command Behavior

### `openspec workspace init`

Responsibilities:

- choose or confirm workspace root
- discover sibling repos and candidate instruction files
- create `openspec-workspace.yaml`
- scaffold the control-plane repo if missing
- generate `.agents.md` when enabled

Key safety rules:

- SHALL not overwrite existing repo-local `AGENTS.md`
- SHALL not add discovered repos without review
- SHALL fail clearly if the target workspace root is not writable

### `openspec workspace sync`

Responsibilities:

- re-read `openspec-workspace.yaml`
- regenerate `.agents.md` and other generated workspace files
- optionally refresh control-plane boilerplate files that are OpenSpec-managed
- report drift between manifest and generated outputs

### `openspec workspace doctor`

Responsibilities:

- validate manifest structure
- detect missing repo paths or instruction files
- warn when generated router files are stale
- report collisions such as duplicate repo names or duplicate paths

## Router Generation

The initial generated `.agents.md` SHOULD be intentionally small and mechanical:

```md
# Workspace Router

@control-plane: ./openspec-management/AGENTS.md
@auth: ./service-auth/AGENTS.md
@payments: ./service-payments/AGENTS.md
```

Generation rules:

- include only repos present in the manifest
- use relative paths from the workspace root
- skip missing instruction files with a warning unless the manifest marks them required

## Risks / Trade-offs

**Risk: assistants interpret router syntax differently**
→ Mitigation: keep the manifest primary and router generation pluggable. `.agents.md` is only one output surface.

**Risk: discovery includes unrelated sibling repos**
→ Mitigation: review step before write, plus `workspace doctor` warnings for low-confidence entries.

**Risk: control-plane repo scope creeps into per-repo config**
→ Mitigation: keep project-root OpenSpec config unchanged; workspace manifest lives one level above individual repos.

**Trade-off: another config file to learn**
→ Acceptable because multi-repo topology is a distinct problem that does not fit cleanly into `openspec/config.yaml`.

## Rollout Plan

1. Add manifest types, parser, validator, and path-normalization helpers
2. Add `workspace init` with discovery and manifest writing
3. Add `.agents.md` generation and `workspace sync`
4. Add `workspace doctor` diagnostics
5. Document the control-plane pattern and migration guidance for existing teams
