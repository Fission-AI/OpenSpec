# Ship Initiative MVP

## Status

Create/list operation and CLI adapter slices complete. Full read/show, update,
and delete policy is deferred to later agent-first discovery and lifecycle
work.

## Source Of Truth

Start from `../../direction.md`.

The relevant model is:

```text
Context stores sync truth.
Collections shape truth.
Initiatives coordinate work.
Workspaces open local views.
Changes implement repo-owned slices.
```

## Goal

Give coordinated work a durable, shared, agent-consumable home inside an
`initiatives/` collection.

## Roadmap Shape

Default initiative shape:

```text
initiatives/<id>/
  initiative.yaml
  requirements.md
  design.md
  decisions.md
  questions.md
  tasks.md
```

Direction also leaves room for later `contracts/` content:

```text
initiatives/<id>/
  contracts/
```

## Initial Boundaries

- Initiative code should live outside `src/core/context-store/`.
- Context-store core should not know initiative semantics.
- Initiative APIs should consume a mounted `initiatives` collection from Item 4.
- Repo-local OpenSpec changes remain the implementation artifacts; initiatives
  coordinate intent, decisions, questions, and tasks.
- Do not implement workspace opening, repo resolution, status dashboards, sync,
  or linked change lifecycle in this item.

## Locked Direction So Far

- Put initiative code under `src/core/collections/initiatives/`.
- Export initiatives from `src/core/index.ts` only after a real API exists.
- Use visible `initiative.yaml`, not hidden `.initiative.yaml`, for the runtime
  context-store initiative model. Existing roadmap folders may still carry
  legacy `.initiative.yaml` progress metadata until that tracker is migrated or
  retired.
- Use strict YAML parsing and validation, following the existing foundation
  patterns.
- Do not create `links.yaml` in the initiative MVP. Repo-change wiring belongs
  to workspace/local coordination work later.
- Keep Markdown validation light; generate useful structure but do not validate
  prose content yet.
- Start implementation with initiative schema and template helpers before
  mounted collection operations.
- For the first mounted operation slice, add create and list only. Avoid a
  broad `readInitiative` API until the shape of "full initiative" is clearer.
- Treat a child folder as an initiative only when it contains a valid
  `initiative.yaml`. Missing `initiative.yaml` means "not an initiative";
  invalid `initiative.yaml` means broken shared state and should fail loudly.

## Deferred From Item 5

- Full initiative show/read behavior belongs in agent-first initiative discovery
  once the return shape is clearer.
- Metadata update and guarded delete belong in later lifecycle work after
  create/list usage has shaped the policy.

## Initial `initiative.yaml`

Recommended shape:

```yaml
version: 1
id: launch-billing-flow
title: Launch Billing Flow
summary: >
  Coordinate the billing launch across product, API, and client surfaces.
status: exploring
created: "2026-05-21"
owners: []
metadata: {}
```

Required:

- `version`
- `id`
- `title`
- `summary`
- `status`
- `created`

Defaulted or optional:

- `owners`
- `metadata`

Initial statuses:

- `exploring`
- `active`
- `complete`
- `archived`

## Initial Markdown Templates

Create these files up front:

- `requirements.md`: product intent, accepted requirements, out of scope.
- `design.md`: context, approach, affected areas, dependencies, risks.
- `decisions.md`: accepted decisions with date/title/decision/why/implications.
- `questions.md`: open and resolved questions.
- `tasks.md`: coordination tasks only, not repo implementation tasks.

Defer `contracts/`, `README.md`, milestones, dependency graphs, external issue
links, workspace path mappings, status dashboards, `links.yaml`, and Markdown
content validation.

## Likely Repo Slice

- Add `src/core/collections/initiatives/schema.ts`.
- Add `src/core/collections/initiatives/templates.ts`.
- Add `src/core/collections/initiatives/index.ts`.
- Add focused tests under `test/core/collections/initiatives/`.
- Add types, constants, ID validation, strict `initiative.yaml`
  parse/serialize helpers, and default template builders.
- Add create/list mounted collection operations after schema and templates are
  locked.
- Keep context-store collection APIs unchanged unless a real integration gap is
  found.

## Implemented Slice

- Added `src/core/collections/initiatives/schema.ts`.
- Added `src/core/collections/initiatives/templates.ts`.
- Added `src/core/collections/initiatives/index.ts`.
- Added focused tests under `test/core/collections/initiatives/`.
- Exported initiatives through `src/core/collections/index.ts` now that a
  mounted operation API exists.
- Kept `links.yaml` out of the initiative MVP file contract.

## Operation Slice Direction

- Add `src/core/collections/initiatives/operations.ts`.
- Export initiatives through `src/core/collections/index.ts` now that a mounted
  operation API exists.
- `createInitiative` should create exactly the MVP file shape:
  `initiative.yaml`, `requirements.md`, `design.md`, `decisions.md`,
  `questions.md`, and `tasks.md`.
- `createInitiative` should generate `created` through an injectable date
  provider, fail if the initiative folder already exists, and clean up a
  partially created folder on write failure.
- `listInitiatives` should inspect immediate child directories under the
  mounted `initiatives` collection, ignore folders without `initiative.yaml`,
  parse and validate folders with `initiative.yaml`, require
  `initiative.yaml.id` to match the folder name, and return initiative states
  sorted by id.

## Implemented Operation Slice

- Added `src/core/collections/initiatives/operations.ts`.
- Added `createInitiative` for creating the MVP folder shape through a mounted
  `initiatives` collection.
- Added `listInitiatives` using the valid-`initiative.yaml` detection rule.
- Exported initiatives through `src/core/collections/index.ts`.
- Added focused operation tests under
  `test/core/collections/initiatives/operations.test.ts`.

## Next Integration Enabler

Before adding `openspec initiative create/list`, add a context-store
registration/resolution facade so CLI code can resolve a named store and mount
the initiatives collection without exposing raw registry or metadata YAML.

## CLI Adapter Direction

Add the first initiative CLI surface as a thin adapter over the mounted
collection operations:

```bash
openspec initiative create <id> --store <store-id> --title <title> --summary <summary>
openspec initiative create <id> --store-path <path> --title <title> --summary <summary>
openspec initiative list --store <store-id>
openspec initiative list --store-path <path>
```

Use `initiative create/list` as a deliberate noun namespace, similar to
`workspace` and `schema`, even though newer OpenSpec conventions generally
prefer verb-first top-level commands. The stricter alternative would spread
initiative behavior across `new initiative` and global `list` flags, which is a
larger surface for this slice because initiative commands must resolve a
context store.

Keep store selection explicit in the first CLI slice. Require either
`--store <id>` or `--store-path <path>`, reject both together, and do not add
current-directory discovery, single-store auto-selection, an interactive picker,
a global default store, or workspace selected-store state yet.

Because shell completions are manually registered, adding the runtime command
also requires adding `initiative create/list/ls` to `COMMAND_REGISTRY`. Keep
completion support static for now: command names and flags only, with no dynamic
store-id or initiative-id completion.

## Implemented CLI Adapter Slice

- Added `src/commands/initiative.ts`.
- Registered `openspec initiative create` and `openspec initiative list` from
  the top-level CLI.
- Added `openspec initiative ls` as an alias for list.
- Required explicit context-store selection through `--store <id>` or
  `--store-path <path>`.
- Rejected conflicting `--store` and `--store-path` selectors.
- Returned workspace-style JSON payloads with a top-level `status` diagnostics
  array.
- Added static shell completion metadata for `initiative create/list/ls`.
- Added focused command tests under `test/commands/initiative.test.ts`.
