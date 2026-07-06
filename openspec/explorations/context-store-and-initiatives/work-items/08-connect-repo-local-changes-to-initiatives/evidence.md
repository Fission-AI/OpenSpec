# Connect Repo-Local Changes To Initiatives Evidence

## Decision 1: Initiative Link Location

The initiative link should live in the repo-local change `.openspec.yaml`.

Example:

```yaml
schema: spec-driven
created: 2026-05-22
initiative:
  store: platform
  id: billing-launch
```

This keeps repo implementation ownership in the repo while preserving a durable
reference to canonical initiative context.

The link should not include local paths, copied initiative prose, or backlinks
inside the initiative store.

## Research Notes

- `createChange()` already writes `.openspec.yaml` for every change.
- `ChangeMetadataSchema` currently allows schema, created, goal, and
  affected-area fields. Item 8 can extend that schema with `initiative`.
- Archive moves the whole change directory, so the initiative link will move
  with archived changes.
- Apply, validate, and archive should not require context-store availability in
  this slice.

## Decision 2: Create Command Shape

Initiative-linked creation should use `openspec new change` with `--initiative`.

Supported first-slice forms:

```bash
openspec new change add-billing-api --initiative billing-launch --json
openspec new change add-billing-api --initiative platform/billing-launch --json
openspec new change add-billing-api --initiative billing-launch --store platform --json
```

This keeps the operation repo-owned. The initiative is a reference on the
change, not the actor that creates or owns the change.

The first slice should also add `--json` to `new change` so agents can capture
the created change path, metadata path, and initiative reference.

## Decision 3: Initiative Lookup Behavior

Bare `--initiative <id>` should reuse `initiative show` lookup semantics.

It searches all registered context stores and succeeds only when the lookup is
complete and exactly one readable store contains the initiative.

Explicit store selectors narrow lookup:

```bash
openspec new change add-billing-api --initiative platform/billing-launch
openspec new change add-billing-api --initiative billing-launch --store platform
openspec new change add-billing-api --initiative billing-launch --store-path ./context
```

`--store-path` validates the explicit path and reads its store id, but does not
auto-register the store. Metadata still stores only the portable store id and
initiative id.

Repo-local metadata should not be written until initiative lookup is complete
and unambiguous.

## Decision 4: Repo-Local Only For V1

Item 8 should support initiative links only on repo-local changes.

If `openspec new change <id> --initiative ...` runs from a workspace planning
home, v1 should refuse and tell the user to run the command from the repo that
owns the implementation plan.

Existing workspace-planning changes remain compatibility behavior and should not
gain initiative linkage in this slice.

This preserves the boundary that initiatives coordinate shared context,
repo-local changes own implementation plans, and workspaces open local views.

## Decision 5: No Repo Ownership Matching In V1

Item 8 should not verify that the current repo is named by, owned by, or inferred
from the initiative.

Creating a repo-local change with an initiative link records participation in the
initiative. It does not prove ownership, repo impact, or coverage of an
initiative area.

Repo ownership matching can be revisited after initiative resolution or explicit
initiative metadata has a real repo/area model.

## Decision 6: JSON And Human Output

Create output should stay factual and minimal.

Human output should confirm:

- the created change id and location
- the schema
- the initiative link `{ store, id }`

JSON output should include:

```json
{
  "change": {
    "id": "add-billing-api",
    "path": "/repo/openspec/changes/add-billing-api",
    "metadataPath": "/repo/openspec/changes/add-billing-api/.openspec.yaml",
    "schema": "spec-driven"
  },
  "initiative": {
    "store": "platform",
    "id": "billing-launch"
  }
}
```

The output should not include `next` or other suggested workflow actions. API
responses should report operation results or errors; choosing the next action is
the agent's responsibility and depends on broader context.

## Decision 7: Existing Change Recovery

Item 8 should include a friendly recovery command for existing repo-local
changes:

```bash
openspec set change add-billing-api --initiative billing-launch --json
openspec set change add-billing-api --initiative platform/billing-launch --json
openspec set change add-billing-api --initiative billing-launch --store platform --json
openspec set change add-billing-api --initiative billing-launch --store-path ../context --json
```

This command is a validated setter for checked-in repo-local change metadata. In
Item 8, the only supported settable field is the initiative link, and the only
file it may mutate is `openspec/changes/<id>/.openspec.yaml`.

The command should not edit proposal, design, tasks, specs, or initiative-store
files. It should not store local paths or write backlinks into the initiative.

If the requested initiative link already exists, the command should succeed as
an idempotent no-op. If a different initiative link already exists, the command
should fail without writing. Replacement, relink, unlink, and dry-run behavior
are deferred.

Rationale:

- Agents can forget to link a change during creation, so a first-class recovery
  path is useful.
- `set change` matches the actual side effect: writing validated change metadata
  to `.openspec.yaml`.
- Keeping the command scoped to `.openspec.yaml` avoids creating a broad change
  editing surface.
- `openspec change ...` is currently deprecated, `edit` implies opening an
  editor, and `update` already means refreshing local OpenSpec tooling or
  guidance.

## Decision 8: Status And Instructions Visibility

Status and instructions should surface that the repo-local change is linked to
an initiative, but should not display or resolve the initiative itself.

Human status output should show the stored initiative reference, and JSON status
output should include the stored initiative `{ store, id }`. Instructions output
should include a concise factual note that the change is linked to the
initiative.

Status and instructions should not read, summarize, validate, or resolve the
initiative from the context store in v1. Missing or unavailable context stores
should not make repo-local status or instructions fail.

This keeps the relationship visible during ordinary repo-local workflows while
preserving the boundary that initiative lookup and context reading belong to
initiative-specific commands.

## Latest Open-Decision Notes

Date: 2026-05-23.

All decisions for Item 8 are now confirmed for implementation.

Implementation should keep the first slice small:

- The light release should test whether initiative-linked repo-local changes are
  useful before adding gating, ownership inference, or broader workflow
  integration.
- Standalone `initiative resolve` was later rejected; workspace local-view state
  owns local path mapping.
- Source provenance, history/export, contract maps, and target-bound
  initiative-hosted changes remain useful future discussion points, but should
  not block this initial slice.

## Implementation Evidence

Date: 2026-05-23.

Implemented:

- `openspec new change <id> --initiative ...` for repo-local changes, with
  `--json`, `--store`, and `--store-path` support.
- `openspec set change <id> --initiative ...` for existing repo-local changes.
- Portable checked-in metadata under `initiative: { store, id }`.
- Status and instructions visibility from stored metadata only.
- Workspace refusal, lookup-failure no-write behavior, same-link idempotency,
  and different-link conflict protection.

Verification:

```bash
pnpm run build
```

Result: passed.

```bash
pnpm exec eslint src/commands/workflow/new-change.ts src/commands/workflow/set-change.ts src/commands/workflow/initiative-link.ts src/commands/workflow/instructions.ts src/commands/workflow/status.ts src/commands/workflow/shared.ts src/commands/initiative.ts src/core/artifact-graph/types.ts src/core/artifact-graph/instruction-loader.ts src/utils/change-utils.ts src/cli/index.ts
```

Result: passed.

```bash
pnpm exec vitest run test/utils/change-metadata.test.ts test/commands/change-initiative-link.test.ts
```

Result: passed, 39 tests.

```bash
pnpm exec vitest run test/commands/artifact-workflow.test.ts test/commands/initiative.test.ts test/core/artifact-graph/instruction-loader.test.ts
```

Result: passed, 110 tests.
