# Connect Repo-Local Changes To Initiatives

## Status

Implemented. The original decision text below is preserved as design record;
current completion evidence lives in `tasks.md` and `evidence.md`.

## Source Of Truth

Start from `../../direction.md` and the Item 8 roadmap entry.

The relevant boundary is:

```text
Initiatives coordinate shared context.
Repo-local changes own implementation plans.
Workspaces open local views.
```

## Goal

Let an agent create or link a repo-local OpenSpec change to a shared
initiative without copying initiative prose, storing machine-local paths, or
making the initiative own repo implementation artifacts.

Example user prompt:

```text
Using initiative billing-launch, create a proposal for API work.
```

## Decisions

### 1. Initiative Link Location

Decision: Store the initiative link in the repo-local change `.openspec.yaml`.

Suggested metadata shape:

```yaml
schema: spec-driven
created: 2026-05-22
initiative:
  store: platform
  id: billing-launch
```

Rules:

- Store only the context store id and initiative id.
- Do not store local context-store paths.
- Do not store local repo paths.
- Do not create a checked-in `initiative.md` snapshot by default.
- Do not write backlinks into the initiative.

Rationale:

- `.openspec.yaml` is already the per-change machine-readable metadata file.
- The link is durable repo context and should be checked in with the change.
- The canonical initiative context remains in the context store.
- The metadata stays portable across teammates and machines.

### 2. Create Command Shape

Decision: Add initiative linking to the repo-local change creation command with
`--initiative`.

Supported first-slice forms:

```bash
openspec new change add-billing-api --initiative billing-launch --json
openspec new change add-billing-api --initiative platform/billing-launch --json
openspec new change add-billing-api --initiative billing-launch --store platform --json
```

Rules:

- The command starts from `new change` because the change is repo-owned.
- `--initiative` modifies repo-local change creation; it does not make the
  initiative create or own the change.
- `--json` should be added to `new change` for agent-readable handoff output.
- A separate initiative-owned create command is not part of the first slice.

Rationale:

- The expected user flow is agent-first: "using initiative X, create a proposal
  for repo work."
- Agents need one normal repo-local create command that can also write the
  initiative reference.
- Keeping the verb rooted in `new change` preserves the boundary that changes
  implement repo-owned slices.

### 3. Initiative Lookup Behavior

Decision: Reuse `initiative show` lookup semantics for `--initiative`.

Rules:

- Bare `--initiative <id>` searches all registered context stores.
- Bare lookup succeeds only when exactly one readable registered store contains
  the initiative id.
- Duplicate initiative ids across stores fail as ambiguous.
- Any unreadable registered store makes bare lookup incomplete and fails before
  writing change metadata.
- `--initiative <store>/<id>` selects one registered store by id.
- `--initiative <id> --store <store>` also selects one registered store by id.
- `--initiative <id> --store-path <path>` validates the explicit local context
  store path, reads its store id, and writes only `{ store, id }` to metadata.
- `--store-path` does not auto-register the context store.
- Do not write repo-local initiative metadata until lookup is complete and
  unambiguous.

Rationale:

- Agents can use the short form when it is safe.
- Durable repo-local links should not be created from partial knowledge.
- The behavior matches existing agent-first discovery semantics.

### 4. Repo-Local Only For V1

Decision: Item 8 supports initiative links only on repo-local changes.

Rules:

- `openspec new change <id> --initiative ...` creates an initiative-linked
  change only when the current planning home is repo-local.
- If the command runs from a workspace planning home, v1 refuses with clear
  guidance to run the command from the repo that owns the implementation plan.
- Existing workspace-planning changes remain compatibility behavior and are not
  extended with initiative linkage in this slice.

Rationale:

- The current product boundary assigns implementation plans to repo-local
  OpenSpec changes.
- Workspaces are local views, not the durable planning owner for initiative
  work.
- Extending workspace-planning changes would revive the superseded
  workspace-owns-the-plan model.

### 5. Repo Ownership Matching

Decision: Do not attempt repo ownership matching in v1.

Rules:

- Creating a repo-local change with an initiative link records participation in
  the initiative.
- The link does not claim that OpenSpec verified repo ownership, repo impact, or
  initiative area coverage.
- The command should not block or warn solely because the current repo is absent
  from initiative content.

Rationale:

- Item 8 should not invent repo ownership or monorepo area semantics.
- Ownership matching belongs with later initiative resolution or explicit
  initiative metadata.
- Keeping v1 small lets teams test whether linked repo-local changes are useful
  before adding policy gates.

### 6. JSON And Human Output

Decision: Keep create output factual and minimal.

Rules:

- Output should report what the command did, not recommend workflow next steps.
- Human output should confirm the created change location, schema, and initiative
  link.
- JSON output should include stable fields for the created change and initiative
  link.
- JSON output should not include a `next` command or suggested workflow action.
- Output should not include initiative summaries, repo ownership claims,
  resolved local context-store paths, or progress/status-like fields.

Suggested JSON shape:

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

Rationale:

- CLI/API-style responses should state operation results or errors.
- Accurately choosing the next action depends on agent context and should remain
  the agent's responsibility.
- Keeping output factual avoids coupling change creation to later lifecycle
  design.

### 7. Existing Change Recovery

Decision: Include a recovery command for setting the initiative link on an
existing repo-local change.

Command shape:

```bash
openspec set change add-billing-api --initiative billing-launch --json
openspec set change add-billing-api --initiative platform/billing-launch --json
openspec set change add-billing-api --initiative billing-launch --store platform --json
openspec set change add-billing-api --initiative billing-launch --store-path ../context --json
```

Rules:

- `openspec set change <id> --initiative ...` is a validated setter for
  repo-local change metadata.
- In Item 8, the only supported settable field is the initiative link.
- The command only mutates `openspec/changes/<id>/.openspec.yaml`.
- The command does not edit proposal, design, tasks, specs, or initiative-store
  files.
- The command uses the same initiative lookup semantics as
  `openspec new change <id> --initiative ...`.
- If the same initiative link already exists, the command succeeds as an
  idempotent no-op.
- If a different initiative link already exists, the command fails without
  writing. Replacement, relink, unlink, and dry-run behavior are not part of v1.
- If the command runs from a workspace planning home, it refuses for the same
  reason as initiative-linked `new change`.

Rationale:

- Agents can forget to pass `--initiative` during change creation; v1 needs a
  friendly recovery path.
- `set change` describes the real operation: setting checked-in change metadata,
  not creating an initiative-owned relationship.
- Keeping the command limited to `.openspec.yaml` avoids a broad edit surface.
- Avoid `openspec change ...` because that namespace is currently deprecated.
- Avoid `edit` because it implies opening an editor, and avoid `update` because
  OpenSpec already uses update for local guidance/tool refresh.

### 8. Status And Instructions Visibility

Decision: Surface the initiative link in status and instructions output without
resolving or displaying the initiative itself.

Rules:

- Human status output should show that the change is linked to an initiative.
- JSON status output should include the stored initiative `{ store, id }`.
- Instructions output should include a concise factual note that the change is
  linked to the initiative.
- Status and instructions must not read, summarize, validate, or resolve the
  initiative from the context store in v1.
- Missing or unavailable context stores must not make repo-local status or
  instructions fail.
- Output should not add next-step recommendations.

Rationale:

- The initiative link should be visible in normal repo-local workflow output so
  users and agents do not miss the relationship.
- Keeping visibility to stored metadata avoids introducing context-store
  availability as a dependency for repo-local workflow commands.
- Initiative resolution belongs to initiative-specific commands, not status or
  instructions in this slice.

## Open Decisions

None. Decision pass complete; confirm the decisions before implementation.

## Latest Suggested Resolutions

These were the suggested answers carried into implementation:

- Surface the stored initiative link in status and instructions without reading
  or displaying the initiative itself.
