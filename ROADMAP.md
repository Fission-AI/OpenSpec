# Workspace POC Roadmap

## Goal

Deliver a lean but real Workspace POC that follows the intended user flow:

`workspace create` -> `workspace add-repo` -> `new change --targets` -> `workspace open --change` -> `apply --change --repo` -> workspace-aware `status` -> explicit workspace completion/archive.

The roadmap is deliberately execution-ordered. Early phases establish the entrypoint and filesystem model first, then add repo registration, then cross-repo planning, then execution handoff, then roll-up and completion semantics.

## POC Guardrails

- Centralize planning in the workspace, not canonical truth.
- Keep canonical specs in the owning repo.
- Keep repo-local execution repo-local.
- Reuse `change` as the primary user-facing primitive.
- Keep workspace metadata under `.openspec/` at the workspace root.
- Do not create an extra inner `openspec/` directory inside a dedicated workspace.
- Store stable aliases in committed workspace metadata and absolute paths only in the local overlay.
- Make repo attachment change-scoped, not workspace-wide.
- Reuse the workspace change ID when materializing repo-local changes.
- Start with create-only materialization unless a research phase explicitly chooses otherwise.
- Keep mocks narrow. Prefer real temp directories, real file IO, and real CLI execution.

## Testing Strategy

- Reuse the existing Vitest setup, `runCLI()` helper, and temp-directory pattern already used across the repo.
- Add one reusable `workspaceSandbox()` helper instead of many bespoke test setups.
- Add a small fixture set under `test/fixtures/workspace-poc/` and clone it into temp roots per test with `fs.cp` and `mkdtemp`.
- Add shared assertions for the core invariants: no nested `openspec/` under the workspace root; no absolute repo paths in committed files; materialized repo-local change IDs match workspace change IDs; change-scoped attach only includes targeted repos.
- Mock only prompt boundaries, telemetry, and agent-launch adapters. Do not mock filesystem behavior, path canonicalization, materialization logic, or status roll-up rules unless the test is specifically about an adapter boundary.
- Keep three reusable filesystem shapes: empty workspace sandbox, happy-path workspace with three repos, and dirty workspace with stale aliases, partial materialization, and incomplete tasks.

## Output Convention

Every phase writes a `SUMMARY.md` to its phase directory.

- Build and test phases write to `notes/workspace-poc/phase-XX-<slug>/SUMMARY.md`, `notes/workspace-poc/phase-XX-<slug>/VERIFY.md`, and `notes/workspace-poc/phase-XX-<slug>/MANUAL_TEST.md`
- Research phases write to `notes/workspace-poc/phase-XX-<slug>/SUMMARY.md`, `notes/workspace-poc/phase-XX-<slug>/DECISION.md`, `notes/workspace-poc/phase-XX-<slug>/VERIFY.md`, and `notes/workspace-poc/phase-XX-<slug>/MANUAL_TEST.md`
- Task and acceptance-check checkboxes are phase-scoped and numbered sequentially, for example `01.1`, `01.2`, `01.3`.

The summary should capture:

- what was changed
- what tests were run
- what passed or failed
- open issues for the next phase

The verification note should capture:

- what was independently checked in a fresh context
- what issues were found
- what fixes were applied
- what residual risks remain, if any

The manual test note should capture:

- what user-visible or smoke scenarios were exercised in a fresh context
- what passed or failed
- what fixes were applied
- what residual risks remain, if any

## Phase 00 - Testing Infrastructure Foundation

Type: Build

Usable outcome: A lean test harness exists for workspace work, so later phases can use real workspace and repo state without inventing new infrastructure each time.

Output summary directory: `notes/workspace-poc/phase-00-test-harness/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 00.1 Add `test/helpers/workspace-sandbox.ts` to create a temp managed workspace root plus attached repos.
- [x] 00.2 Add fixture seeds under `test/fixtures/workspace-poc/` for `empty`, `happy-path`, and `dirty`.
- [x] 00.3 Add shared assertion helpers for path leakage, workspace layout, target membership, and materialization invariants.
- [x] 00.4 Reserve test suite locations for new coverage: `test/core/workspace/`, `test/commands/workspace/`, and `test/cli-e2e/workspace/`.
- [x] 00.5 Keep the harness compatible with the current `runCLI()` helper and forked Vitest workers.

Acceptance tests:

- [x] 00.6 `workspaceSandbox()` creates a workspace root with `.openspec/` and `changes/`, and no inner `openspec/`.
- [x] 00.7 Cloned fixtures can be mutated independently without cross-test bleed.
- [x] 00.8 Committed fixture files never contain absolute repo paths.
- [x] 00.9 CLI tests can run against the sandbox and keep JSON output free of spinner noise.

## Phase 01 - Workspace Create Entrypoint

Type: Build

Usable outcome: A user can create a persistent workspace root through `openspec workspace create <name>`.

Output summary directory: `notes/workspace-poc/phase-01-workspace-create/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 01.1 Add the `workspace` command group and the `workspace create` entrypoint.
- [x] 01.2 Reuse the current init/setup path rather than inventing a second bootstrap system.
- [x] 01.3 Implement managed workspace root creation.
- [x] 01.4 Create `.openspec/workspace.yaml`, `.openspec/local.yaml`, and top-level `changes/`.
- [x] 01.5 Ensure `.openspec/local.yaml` is treated as local-only state.
- [x] 01.6 Make the created layout clearly distinct from repo-local `openspec/` roots.

Acceptance tests:

- [x] 01.7 Creating a workspace produces `.openspec/workspace.yaml`, `.openspec/local.yaml`, and `changes/`.
- [x] 01.8 The workspace root does not contain `openspec/changes`.
- [x] 01.9 Re-running against an existing workspace fails or behaves idempotently in one explicit, documented way.
- [x] 01.10 Invalid or duplicate workspace names fail with actionable errors.

## Phase 02 - Validate Workspace Create

Type: Test

Usable outcome: `workspace create` is covered at unit, command, and CLI layers before other workspace behavior builds on it.

Output summary directory: `notes/workspace-poc/phase-02-test-workspace-create/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 02.1 Add unit tests for managed path resolution and workspace metadata initialization.
- [x] 02.2 Add command-level tests for create behavior and failure modes.
- [x] 02.3 Add CLI e2e coverage for `workspace create`, help text, exit codes, and layout assertions.

Acceptance tests:

- [x] 02.4 Help output documents `workspace create`.
- [x] 02.5 Successful CLI creation yields a usable workspace root on disk.
- [x] 02.6 JSON output remains clean if a machine-readable mode is added.
- [x] 02.7 Duplicate create attempts do not corrupt the workspace root.

## Phase 03 - Repo Registry and Doctor

Type: Build

Usable outcome: A workspace can register repo aliases and validate them with `workspace add-repo` and `workspace doctor`.

Output summary directory: `notes/workspace-poc/phase-03-repo-registry/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 03.1 Implement committed alias storage in `.openspec/workspace.yaml`.
- [x] 03.2 Implement absolute path storage in `.openspec/local.yaml`.
- [x] 03.3 Validate that registered paths exist and contain repo-local OpenSpec state.
- [x] 03.4 Canonicalize stored local paths.
- [x] 03.5 Implement `workspace doctor` to check alias resolution, missing repos, and overlay drift.

Acceptance tests:

- [x] 03.6 `workspace add-repo <alias> <path>` stores the alias in committed metadata and the path only in local metadata.
- [x] 03.7 Missing paths and duplicate aliases fail cleanly.
- [x] 03.8 Paths are canonicalized before persistence.
- [x] 03.9 `workspace doctor` reports stale or missing repos without mutating state.
- [x] 03.10 No absolute path leaks into committed workspace files.

## Phase 04 - Validate Repo Registry and Doctor

Type: Test

Usable outcome: Repo registration becomes trustworthy enough for targeted changes and later agent attachment.

Output summary directory: `notes/workspace-poc/phase-04-test-repo-registry/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 04.1 Add pure tests for alias parsing, path canonicalization, committed-vs-local serialization, and doctor diagnostics.
- [x] 04.2 Add command tests for add-repo and doctor using the workspace sandbox.
- [x] 04.3 Add CLI e2e coverage for happy path and stale path scenarios.

Acceptance tests:

- [x] 04.4 Doctor detects missing repo roots, missing `openspec/`, and alias/path drift.
- [x] 04.5 Committed metadata remains stable across local path changes.
- [x] 04.6 Repairing a stale path in `local.yaml` restores doctor success.
- [x] 04.7 The registry remains readable after multiple repo additions in one workspace.

## Phase 05 - Target-Aware Workspace Change Creation

Type: Build

Usable outcome: A workspace can create a central cross-repo change with `openspec new change <id> --targets <a,b,c>`.

Output summary directory: `notes/workspace-poc/phase-05-targeted-change-create/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 05.1 Extend change creation to support workspace topology.
- [x] 05.2 Record explicit targets in workspace change metadata.
- [x] 05.3 Scaffold central planning artifacts in the workspace change: proposal, design, coordination tasks, and per-target draft task/spec partitions.
- [x] 05.4 Hard-fail if a requested target alias is unknown.
- [x] 05.5 Ensure no repo-local artifacts are created yet.

Acceptance tests:

- [x] 05.6 Creating a targeted workspace change records the exact target set.
- [x] 05.7 Per-target planning directories are created under the workspace change.
- [x] 05.8 Unknown or duplicate targets fail with actionable errors.
- [x] 05.9 Repo-local repos remain untouched until `apply`.
- [x] 05.10 Duplicate change IDs still fail predictably.

## Phase 06 - Validate Target-Aware Change Creation

Type: Test

Usable outcome: The central planning object is stable before any agent-open or materialization work begins.

Output summary directory: `notes/workspace-poc/phase-06-test-targeted-change-create/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 06.1 Add unit tests for target parsing and workspace change metadata rules.
- [x] 06.2 Add command tests for targeted change creation against a registered workspace.
- [x] 06.3 Add CLI e2e coverage for successful creation, unknown aliases, and untouched repo-local roots.

Acceptance tests:

- [x] 06.4 `new change --targets` rejects aliases not present in the workspace registry.
- [x] 06.5 The workspace change layout matches the chosen topology.
- [x] 06.6 The workspace change contains central planning artifacts and per-target partitions only.
- [x] 06.7 Running status or doctor after creation still sees the workspace as healthy.

## Phase 07 - Research Minimum `workspace open` Contract

Type: Research

Usable outcome: The team decides the smallest honest v0 behavior for `workspace open --change` without overcommitting to multi-root agent support that may not be real.

Output summary directory: `notes/workspace-poc/phase-07-open-contract-research/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 07.1 Write the research note in `notes/workspace-poc/phase-07-open-contract-research/DECISION.md`.
- [x] 07.2 Decide the minimum v0 behavior for planning-only mode, change-scoped attached mode, supported agent targets for the demo path, and failure behavior when one or more targeted repos are unresolved.
- [x] 07.3 Choose whether non-primary agents are supported, partial, or explicitly out of scope in v0.

Acceptance tests:

- [x] 07.4 The research note names one recommended contract and at least one rejected alternative.
- [x] 07.5 The note defines exact user-visible behavior for `workspace open --change <id>` and `workspace open` with no change.
- [x] 07.6 The note lists testable success and failure cases for the next phase.

## Phase 08 - Workspace Open

Type: Build

Usable outcome: A user can open the workspace in planning-only mode or open a specific change with only its target repos attached.

Output summary directory: `notes/workspace-poc/phase-08-workspace-open/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 08.1 Implement `workspace open --change <id> [--agent <tool>]`.
- [x] 08.2 Implement planning-only mode when no change is supplied.
- [x] 08.3 Ensure change-scoped open resolves only the change’s targeted repos.
- [x] 08.4 Integrate with the existing command-generation/tooling path rather than inventing a new one.
- [x] 08.5 Fail with actionable diagnostics when targeted repos are unresolved.

Acceptance tests:

- [x] 08.6 `workspace open` without `--change` does not attach repo roots.
- [x] 08.7 `workspace open --change <id>` attaches only targeted repos, not all registered repos.
- [x] 08.8 Open fails clearly when a targeted repo path is stale or missing.
- [x] 08.9 The chosen primary agent path produces a usable session launch or instruction surface.

## Phase 09 - Validate Workspace Open

Type: Test

Usable outcome: The open contract is pinned down with real fixture state before materialization depends on it.

Output summary directory: `notes/workspace-poc/phase-09-test-workspace-open/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 09.1 Add tests for planning-only vs change-scoped mode.
- [x] 09.2 Add tests that verify only the expected repo aliases are attached.
- [x] 09.3 Add tests for unresolved target paths and unsupported agent/tool combinations.
- [x] 09.4 Add CLI e2e coverage for the selected primary demo path.

Acceptance tests:

- [x] 09.5 Planning-only open never exposes attached repo roots.
- [x] 09.6 Change-scoped open never attaches unrelated repos.
- [x] 09.7 Open diagnostics point to `workspace doctor` or the alias that needs repair.
- [x] 09.8 Test coverage does not depend on real multi-root writes.

## Phase 10 - Research Materialization Contract

Type: Research

Usable outcome: The materialization contract is explicit before `apply --change --repo` is implemented.

Output summary directory: `notes/workspace-poc/phase-10-materialization-contract-research/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 10.1 Write the research note in `notes/workspace-poc/phase-10-materialization-contract-research/DECISION.md`.
- [x] 10.2 Decide the v0 rule for create-only vs refresh, overwrite behavior, rerun behavior, conflict handling, and the minimum metadata written during materialization.
- [x] 10.3 Prefer the simplest honest contract for the POC, even if refresh is deferred.

Acceptance tests:

- [x] 10.4 The research note chooses one v0 contract and names explicit non-goals.
- [x] 10.5 The note defines what counts as a successful materialization.
- [x] 10.6 The note defines the expected behavior for repeat `apply` calls.

## Phase 11 - Target Materialization via `apply`

Type: Build

Usable outcome: A selected target can be materialized into its repo with `openspec apply --change <id> --repo <alias>`.

Output summary directory: `notes/workspace-poc/phase-11-apply-materialization/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 11.1 Extend `apply` to understand workspace topology.
- [x] 11.2 Materialize only the selected target slice into the target repo.
- [x] 11.3 Reuse the same change ID in the target repo.
- [x] 11.4 Keep workspace planning artifacts intact after materialization.
- [x] 11.5 Make the authority handoff explicit: workspace draft before `apply`, repo-local execution after `apply`.
- [x] 11.6 Write the minimum trace metadata needed for later status roll-up.

Acceptance tests:

- [x] 11.7 Materialization creates a repo-local change with the same change ID.
- [x] 11.8 Only the selected target repo is modified.
- [x] 11.9 Untargeted aliases and unknown aliases fail clearly.
- [x] 11.10 Repeating `apply` follows the v0 contract from Phase 10.
- [x] 11.11 Workspace drafts remain intact after successful materialization.

## Phase 12 - Validate Materialization

Type: Test

Usable outcome: The execution handoff is proven against real repos before status and completion semantics are layered on top.

Output summary directory: `notes/workspace-poc/phase-12-test-apply-materialization/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 12.1 Add unit tests for materialization plan construction and target resolution.
- [x] 12.2 Add command tests for apply success, apply failure, and repeat-apply behavior.
- [x] 12.3 Add CLI e2e coverage for selective materialization into one repo out of many.
- [x] 12.4 Add dirty-workspace coverage for stale aliases and pre-existing target change collisions.

Acceptance tests:

- [x] 12.5 The repo-local change ID exactly matches the workspace change ID.
- [x] 12.6 Apply never writes to repos outside the selected alias.
- [x] 12.7 Apply surfaces collisions and stale-path failures without partial silent success.
- [x] 12.8 The happy-path fixture supports `create -> add-repo -> new change -> apply`.

## Phase 13 - Research Status Roll-Up and Reverse Links

Type: Research

Usable outcome: Status semantics are concrete enough to implement without inventing misleading lifecycle labels.

Output summary directory: `notes/workspace-poc/phase-13-status-research/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 13.1 Write the research note in `notes/workspace-poc/phase-13-status-research/DECISION.md`.
- [x] 13.2 Define the minimum v0 workspace states and their derivation rules: planned, materialized, in progress, blocked, complete, soft-done, and hard-done.
- [x] 13.3 Decide whether repo-local changes need reverse links back to the workspace change in v0.
- [x] 13.4 Define the minimum JSON status shape that tests can lock down.

Acceptance tests:

- [x] 13.5 The research note gives one precise derivation rule per state.
- [x] 13.6 The note defines which states rely on repo-local inspection and which rely on workspace state alone.
- [x] 13.7 The note resolves whether reverse links are required, optional, or deferred.

## Phase 14 - Workspace Status Roll-Up

Type: Build

Usable outcome: Running status from the workspace tells the user what is planned, materialized, active, blocked, complete, soft-done, and hard-done.

Output summary directory: `notes/workspace-poc/phase-14-workspace-status/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 14.1 Extend status behavior to recognize workspace topology.
- [x] 14.2 Roll up central coordination state plus per-target execution state.
- [x] 14.3 Keep output honest and minimal.
- [x] 14.4 Add stable JSON output for workspace status.
- [x] 14.5 Do not infer more than the underlying workspace and repo-local state can actually support.

Acceptance tests:

- [x] 14.6 Workspace status distinguishes planning-only targets from materialized targets.
- [x] 14.7 Status can report blocked states for stale repo paths or missing materializations when appropriate.
- [x] 14.8 Soft-done only appears when all known coordination and target work is complete.
- [x] 14.9 Hard-done only appears after explicit workspace archive/completion in a later phase.
- [x] 14.10 JSON status output is stable and free of spinner contamination.

## Phase 15 - Validate Workspace Status

Type: Test

Usable outcome: Roll-up semantics are verified with deterministic scenarios rather than manual interpretation.

Output summary directory: `notes/workspace-poc/phase-15-test-workspace-status/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 15.1 Add pure tests for state derivation logic.
- [x] 15.2 Add command tests for workspace-aware status output.
- [x] 15.3 Add CLI e2e coverage for mixed states across three repos.
- [x] 15.4 Add regression tests for JSON shape and spinner-free output.

Acceptance tests:

- [x] 15.5 Status correctly reports a mix of planned, materialized, archived, and blocked targets in one workspace.
- [x] 15.6 Status remains readable when one repo is missing or stale.
- [x] 15.7 JSON output can be parsed directly by an agent or automation.
- [x] 15.8 The dirty fixture supports interruption and resume scenarios.

## Phase 16 - Workspace Completion and Archive Semantics

Type: Build

Usable outcome: The workspace has an explicit top-level completion/hard-done path while repo-local archive remains repo-local.

Output summary directory: `notes/workspace-poc/phase-16-workspace-archive/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 16.1 Decide the minimal command path for explicit workspace completion/archive using the existing archive surface where practical.
- [x] 16.2 Preserve repo-local archive behavior and canonical spec ownership.
- [x] 16.3 Ensure top-level hard-done is explicit and never implied by repo-local activity alone.
- [x] 16.4 Record enough workspace-level completion state for status to report hard-done.

Acceptance tests:

- [x] 16.5 Archiving a repo-local change does not automatically archive the workspace change.
- [x] 16.6 Workspace hard-done requires explicit top-level user action.
- [x] 16.7 Repo-local archive continues to operate against repo-local canonical specs.
- [x] 16.8 Mixed repo cadences are allowed without invalidating workspace state.

## Phase 17 - Validate Workspace Completion and Archive

Type: Test

Usable outcome: Completion semantics are proven and do not collapse repo ownership boundaries.

Output summary directory: `notes/workspace-poc/phase-17-test-workspace-archive/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 17.1 Add command and CLI tests for workspace hard-done behavior.
- [x] 17.2 Add tests for partial repo archive, staggered repo archive, and explicit workspace archive.
- [x] 17.3 Add regression tests to ensure repo-local archive behavior is unchanged outside workspace flows.

Acceptance tests:

- [x] 17.4 One repo can archive while another remains in progress without forcing top-level done.
- [x] 17.5 Status shows soft-done before hard-done when the documented conditions are met.
- [x] 17.6 Existing repo-local archive tests still pass without workspace regressions.

## Phase 18 - Deferred Research: Shared-Contract Promotion and Stable IDs

Type: Research

Usable outcome: Deferred questions are captured cleanly without bloating the POC implementation.

Output summary directory: `notes/workspace-poc/phase-18-deferred-research/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 18.1 Write the research note in `notes/workspace-poc/phase-18-deferred-research/DECISION.md`.
- [x] 18.2 Capture the recommended next-step design for shared-contract promotion into canonical owner repos, migration from local alias/path overlays to stable project IDs, and whether any team-shared workspace semantics should exist after the POC.
- [x] 18.3 Keep this phase explicitly non-blocking for the working POC.

Acceptance tests:

- [x] 18.4 The research note separates deferred concerns from the shipped POC contract.
- [x] 18.5 The note identifies which future changes would break current tests or fixture shape.
- [x] 18.6 The note names at least one migration seam that preserves backward compatibility.

## Phase 19 - End-to-End POC Acceptance

Type: Test

Usable outcome: The whole POC is proven with a small number of realistic, repeatable scenarios.

Output summary directory: `notes/workspace-poc/phase-19-e2e-acceptance/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 19.1 Add one golden happy-path e2e scenario covering: create workspace, register three repos, create one targeted change, open the change, materialize one repo, inspect status, archive repo-local work, and explicitly complete/archive the workspace.
- [x] 19.2 Add one interruption/re-entry scenario covering: an existing workspace, one materialized target, one stale target, and status/doctor output that points to the next action.
- [x] 19.3 Add one failure-recovery scenario covering: duplicate aliases, unknown targets, repeat apply, stale repo paths, and partial completion.

Acceptance tests:

- [x] 19.4 The happy-path scenario can run end-to-end with real filesystem state and no broad mocks.
- [x] 19.5 The interruption scenario can be resumed without reconstructing context manually.
- [x] 19.6 The failure-recovery scenario produces actionable errors and no silent corruption.
- [x] 19.7 The final suite demonstrates the product promise: plan centrally, execute locally, preserve repo ownership.

## Phase 20 - PRD Satisfaction Audit

Type: Test

Usable outcome: The implementation is checked directly against `WORKSPACE_POC_PRD.md` rather than only against the roadmap or inferred intent.

Output summary directory: `notes/workspace-poc/phase-20-prd-audit/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 20.1 Compare the full implementation, docs, tests, and user-facing behavior against `WORKSPACE_POC_PRD.md`.
- [x] 20.2 Identify every unmet, partially met, or ambiguous PRD requirement.
- [x] 20.3 Validate that the implementation still respects the key guardrails from the PRD and decision record.
- [x] 20.4 If any PRD gaps remain, insert concrete remediation phases immediately after this phase, each with acceptance tests and output directories, before allowing final signoff to proceed.

Acceptance tests:

- [x] 20.5 Every meaningful PRD requirement is mapped to implemented behavior, explicit non-goal, or a documented gap.
- [x] 20.6 Any remaining gaps result in newly inserted remediation phases, not a vague TODO list.
- [x] 20.7 The audit output is concrete enough for a fresh agent session to act on immediately.

## Phase 21 - Workspace Guidance and Owner Visibility

Type: Build

Usable outcome: A fresh user can tell when workspace mode fits the job, capture owner or handoff information per repo, and see that information from the existing workspace surfaces.

Output summary directory: `notes/workspace-poc/phase-21-workspace-guidance-and-owners/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 21.1 Extend committed workspace repo metadata to capture optional owner or handoff information without storing machine-specific paths.
- [x] 21.2 Add a backward-compatible CLI path to record or update owner or handoff information for a registered repo alias.
- [x] 21.3 Surface owner or handoff information anywhere the workspace already shows affected repos and next actions, at minimum workspace-aware `status` and `workspace open`.
- [x] 21.4 Add shipped user-facing guidance that explains when to use workspace mode versus stay repo-local, the supported end-to-end CLI flow, and how to re-enter or hand off an in-flight workspace change.

Acceptance tests:

- [x] 21.5 Fresh users can discover from shipped docs or help when workspace mode is the right tool and what the supported CLI flow is.
- [x] 21.6 When owner or handoff information is configured, workspace status and open surfaces expose it without leaking local paths into committed metadata.
- [x] 21.7 Existing workspaces remain valid and readable when owner or handoff information is absent.

## Phase 22 - Validate Guidance and Owner Visibility

Type: Test

Usable outcome: Guidance and owner or handoff visibility are proven on real workspace state and remain backward-compatible with the shipped POC.

Output summary directory: `notes/workspace-poc/phase-22-test-workspace-guidance-and-owners/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 22.1 Add unit, command, and CLI coverage for owner or handoff metadata plus the updated docs or help surface.
- [x] 22.2 Verify older workspace fixtures and workspaces without owner or handoff metadata still pass unchanged.
- [x] 22.3 Run manual CLI checks for docs or help, `workspace open`, and workspace-aware `status` from a fresh workspace.

Acceptance tests:

- [x] 22.4 Shipped docs or help no longer require the PRD or roadmap to explain when workspace mode is appropriate.
- [x] 22.5 Workspace text and JSON surfaces show configured owner or handoff information consistently.
- [x] 22.6 Existing ownerless workspaces and the Phase 19 acceptance flow continue to pass.

## Phase 23 - Workspace Target Set Adjustment

Type: Build

Usable outcome: Users can adjust the target set on a workspace change after creation without manual file edits or silent authority drift.

Output summary directory: `notes/workspace-poc/phase-23-workspace-target-set-adjustment/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 23.1 Add a minimal explicit command path to add or remove target aliases from an existing workspace change.
- [x] 23.2 Keep workspace change metadata, per-target draft artifacts, and workspace registry validation coherent when targets are added or removed.
- [x] 23.3 Define and implement safe guardrails for removing a target that has already been materialized or otherwise moved into repo-local execution.
- [x] 23.4 Update workspace `open`, `apply`, and workspace-aware `status` to respect the adjusted target set.

Acceptance tests:

- [x] 23.5 Adding a target updates the workspace change metadata and scaffolds the new per-target draft slice.
- [x] 23.6 Removing an unmaterialized target updates the workspace cleanly without corrupting other targets.
- [x] 23.7 Removing or mutating a materialized target fails or requires an explicit documented safety path instead of silently breaking authority handoff.

## Phase 24 - Validate Target Set Adjustment

Type: Test

Usable outcome: Target-set edits behave safely under real workspace conditions and do not regress the shipped POC flow.

Output summary directory: `notes/workspace-poc/phase-24-test-workspace-target-set-adjustment/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 24.1 Add unit, command, and CLI coverage for target-add and target-remove behavior, including materialized-target guardrails.
- [x] 24.2 Run manual re-entry, `status`, `workspace open`, and `apply` checks after target-set edits in a fresh workspace.
- [x] 24.3 Re-run the workspace acceptance slice to confirm target adjustment does not regress the existing happy path or interruption flow.

Acceptance tests:

- [x] 24.4 Adjusted target sets are reflected consistently in workspace metadata, `workspace open`, `apply`, and workspace-aware `status`.
- [x] 24.5 Guardrails prevent silent divergence for already materialized targets.
- [x] 24.6 The existing Phase 19 acceptance scenario still passes after target-set support lands.

## Phase 25 - Final PRD Recheck and Signoff

Type: Test

Usable outcome: After any remediation phases have run, the codebase is rechecked against the PRD and the POC can be considered complete.

Output summary directory: `notes/workspace-poc/phase-25-prd-signoff/`

Completion checklist:

- [x] Tasks completed
- [x] Acceptance tests satisfied
- [x] Independent verification complete
- [x] Manual testing complete
- [x] Phase complete

Tasks:

- [x] 25.1 Re-run the PRD satisfaction check after all remediation phases are complete.
- [x] 25.2 Confirm the final implementation, documentation, and tests satisfy the PRD.
- [x] 25.3 Confirm the roadmap itself has no incomplete required phases left behind.
- [x] 25.4 Produce a final signoff summary that states whether the POC is complete and what residual risks remain.

Acceptance tests:

- [x] 25.5 The final signoff references `WORKSPACE_POC_PRD.md` directly and confirms whether it is satisfied.
- [x] 25.6 If the PRD is still not satisfied, the phase does not sign off and instead inserts further remediation phases before trying again.
- [x] 25.7 The final signoff is explicit about any residual risks, but it does not leave known fixable PRD gaps unresolved.

## Recommended First Shipping Slice

If the POC needs the smallest credible milestone before full roll-up and completion semantics, ship through Phase 12:

- test harness
- workspace create
- repo registry + doctor
- targeted workspace changes
- minimum researched `workspace open`
- create-only materialization through `apply`

That is the first point where the product is honest for real cross-repo work. Phases 13 through 25 then harden status, completion semantics, end-to-end resilience, PRD completeness, and final signoff.
