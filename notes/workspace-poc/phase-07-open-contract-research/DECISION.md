# Phase 07 Decision

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Recommended contract

The minimum honest v0 contract for `workspace open` is:

- `openspec workspace open` is a planning-only session-prep command.
- `openspec workspace open --change <id>` is a change-scoped attached-roots session-prep command.
- v0 produces a usable instruction surface for one supported agent path instead of promising generic external process launch.
- v0 officially supports only `--agent claude`. Omitting `--agent` defaults to `claude`.
- `workspace open --change <id>` resolves only that change's targeted repos and hard-fails if any target repo is unresolved.
- `workspace open` never materializes repo-local changes and never replaces `openspec apply --change <id> --repo <alias>`.

This is the smallest contract that is still real:

- planning-only mode is useful even when no repos are ready
- attached mode is honest only when every targeted repo is actually readable
- the CLI stays responsible for materialization, not the agent
- the POC avoids claiming multi-agent parity that the current code and tool landscape do not prove

## Why this contract

Evidence reviewed for this phase:

- `src/commands/workspace.ts` currently implements only `create`, `add-repo`, and `doctor`; there is no `open` entrypoint yet.
- `src/core/workspace/registry.ts` already defines the concrete repo-resolution failure states the new command can build on.
- `src/core/workspace/change-create.ts` already makes target aliases explicit in workspace change metadata.
- `src/core/command-generation/adapters/claude.ts`, `codex.ts`, and `github-copilot.ts` show that command formatting exists, but not a stable cross-tool attach-at-launch contract.
- `docs/supported-tools.md` already documents that Copilot custom prompts are IDE-only and that Codex commands are global prompts, which is weaker than a clean repo-scoped attach story.
- `WORKSPACE_POC_PRD.md` and `WORKSPACE_POC_DECISION_RECORD.md` both point toward planning-only vs attached-roots mode and a single primary demo path.

The practical conclusion is:

- planning-only mode should exist independently of repo resolution
- change-scoped attached mode should be all-targets-or-fail
- the first shipped path should optimize for one tool, not theoretical parity

## Exact user-visible behavior

### `openspec workspace open`

`workspace open` with no `--change` enters planning-only mode.

Behavior:

- Must be run inside a managed workspace created with `openspec workspace create`.
- Defaults to `--agent claude` when `--agent` is omitted.
- Does not resolve repo aliases and does not attach any repo roots.
- Exits successfully with a planning-only instruction surface rooted at the workspace.
- The surface must state:
  - mode: `planning-only`
  - workspace root path
  - agent target
  - attached repos: `none`
  - next step: use the workspace for central planning, then run `workspace open --change <id>` when target repos need to be in view
- Does not create or update repo-local change artifacts.
- Does not mutate workspace metadata.

### `openspec workspace open --change <id>`

`workspace open --change <id>` enters change-scoped attached-roots mode.

Behavior:

- Must be run inside a managed workspace created with `openspec workspace create`.
- Defaults to `--agent claude` when `--agent` is omitted.
- Validates that `changes/<id>/` exists in the workspace.
- Reads the workspace change metadata and requires a non-empty `targets` list.
- Resolves only the aliases named in that change's `targets`.
- Treats a target as resolved only when:
  - the alias is registered in workspace metadata
  - the alias has a local overlay path
  - the resolved path exists and is a directory
  - the resolved path contains repo-local OpenSpec state at `openspec/`
- On success, exits with a change-scoped instruction surface that states:
  - mode: `change-scoped`
  - workspace root path
  - change ID and change path
  - agent target
  - attached repos: only the targeted aliases with their resolved absolute paths
  - a reminder that `openspec apply --change <id> --repo <alias>` is still the supported materialization step
- Does not attach every registered repo.
- Does not create or update repo-local change artifacts.

### Failure behavior for targeted repos

`workspace open --change <id>` fails the entire command if one or more targeted repos are unresolved.

Behavior:

- Exit code is non-zero.
- No partial success surface is emitted.
- The error names every failing alias and why it failed.
- The error points the user to `openspec workspace doctor` or the exact alias that needs repair.

Fatal failure reasons:

- change does not exist
- change metadata has no `targets`
- target alias is missing from the workspace registry
- target alias is missing from `.openspec/local.yaml`
- target repo path is missing
- target repo path is not a directory
- target repo path exists but lacks `openspec/`

Non-fatal nuance:

- A non-canonical but still valid stored path may be normalized for use and surfaced as drift, but it is not by itself an unresolved-target failure.

## Supported agent targets in v0

Decision:

- `claude` is the only officially supported `workspace open` agent target in v0.
- Omitting `--agent` is equivalent to `--agent claude`.
- Non-primary agents are explicitly out of scope for Phase 08 v0 behavior.

Rationale:

- Phase 08 only needs one primary agent path to produce a real demoable outcome.
- The current codebase has command-format adapters for many tools, but that is not the same as proving stable multi-root session-open behavior.
- Claude is already the clearest documented primary path in the workspace POC docs.
- Supporting more tools now would expand the test matrix faster than the current workspace implementation surface justifies.

Follow-up note:

- Codex is the first revisit candidate after Phase 08 and Phase 09 if the primary path lands cleanly.
- Copilot remains out of scope for v0 because the repo's current support is prompt-file oriented and not a credible one-shot multi-root CLI attach story.

## Rejected alternatives

### Rejected: attach every registered repo

Why rejected:

- it violates the roadmap principle that attachment should be change-scoped, not workspace-wide
- it scales poorly as workspaces grow
- it makes agent context noisy and hides the actual execution set

### Rejected: partial open when some targeted repos are unresolved

Why rejected:

- attached mode is only honest if the agent can see the full targeted working set
- partial success creates a false sense that cross-repo planning is complete
- planning-only mode already covers the "not all repos are ready yet" use case

### Rejected: promise multi-agent parity in v0

Why rejected:

- the repo currently proves command generation, not equal attach semantics across tools
- it would force Phase 08 to solve tool-specific behavior instead of landing one real path
- the roadmap only needs one primary agent path for the POC

### Rejected: auto-launch and manage external agent processes in v0

Why rejected:

- it adds tool-specific process and environment complexity that is not required to prove the contract
- a deterministic instruction surface is enough for the next phase acceptance target

## Testable success and failure cases for Phase 08

### Success cases

- `openspec workspace open` inside a healthy workspace exits `0` and reports `planning-only` with `attached repos: none`.
- `openspec workspace open --change shared-auth` for a change targeting `app,api` exits `0` and lists only `app` and `api`, not other registered aliases like `docs`.
- `openspec workspace open --change shared-auth` reports the workspace root, the change path, and the exact resolved absolute repo paths for the targeted aliases.
- `openspec workspace open --change shared-auth` leaves repo-local `openspec/changes/shared-auth` absent in all targeted repos.
- `openspec workspace open --change shared-auth --agent claude` produces the same usable instruction surface as the default no-flag path.

### Failure cases

- `openspec workspace open` outside a managed workspace exits non-zero with an actionable workspace-root error.
- `openspec workspace open --change missing-change` exits non-zero and names the missing change.
- `openspec workspace open --change planning-only-draft` exits non-zero if the change exists but has no `targets` metadata.
- `openspec workspace open --change shared-auth` exits non-zero when any targeted alias is missing from `.openspec/local.yaml`.
- `openspec workspace open --change shared-auth` exits non-zero when any targeted path is stale, missing, or no longer contains `openspec/`.
- `openspec workspace open --change shared-auth --agent codex` exits non-zero with an unsupported-agent error in v0.

## Blockers and next-step notes

- No new roadmap phase is required from this decision.
- Phase 08 should implement only the recommended contract above and should not broaden agent scope during the build unless a new bounded phase is added first.
