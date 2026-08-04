# Delete Legacy Command Groups Spec

## Outcome

The `openspec workspace` and `openspec initiative` command groups no
longer exist, and everything that only they consumed goes with them —
command layer, orphaned core modules, completions entries, tests, and
docs. After this slice the CLI's visible surface is the simple path:
OpenSpec roots, stores, and the normal lifecycle commands. What survives
is exactly what other surfaces still need: the planning-home
workspace-mode contract (until 4.1 rebuilds opening), legacy change
metadata display, the `--initiative` rejection error, and every byte of
user data on disk.

This is the "small command-group deletion slice" the locked 5.1 criteria
sequenced "soon after 1.4". Slice 1.4 already stopped guidance from
advertising these groups; this slice deletes the groups themselves. The
opening machinery's state model dies later, when 4.1 replaces it.

## Locked Decisions (from roadmap 5.1, 2026-06-11)

1. **Delete, don't hide.** With zero users, hiding keeps every cost and
   protects nobody. No hidden aliases, no deprecation shims, no
   redirect stubs for the deleted groups.
2. **Sequenced.** Guidance surfaces died in 1.4 (done); the command
   groups die here; the opening machinery and the
   `workspace-planning` mode die when 4.1 replaces opening.
3. **Never delete user data.** Initiative directories inside stores,
   workspace view state under the XDG data dir, and workspace `changes/`
   directories stay on disk untouched. Git history is the undo for
   code; nothing is the undo for user data.
4. **Phase 5 deletion slices proceed without confirmation** (runbook):
   they delete code and generated guidance only.

## Decisions This Spec Makes (autonomous, recorded in the changelog)

1. **Orphans go with the groups.** Delete-don't-hide applies transitively
   to code whose last consumer is a deleted command: the five
   command-consumed core workspace modules (`registry`, `openers`,
   `open-surface`, `link-input`, and `skills` — the last also consumed by
   the surviving `config` command, whose workspace-profile integration is
   deleted with it, see decision 2) and the entire `src/core/collections/`
   tree (the initiatives collection plus the collection runtime — its
   only consumers are the dying commands). Leaving them would recreate
   the hidden-not-deleted state 5.1 rejected. `src/core/store/binding.ts`
   is **not** an orphan and stays: the kept `workspace/foundation.ts`
   imports its types and normalization for the persisted view-state
   shape (planning-home depends on it transitively).
2. **Surviving commands stop pointing at the dead groups — two included
   behavior changes.** (a) `openspec update`'s workspace detection
   (`src/cli/index.ts:~205-210` via `findWorkspaceRoot`) errors with
   "Run `openspec workspace update`…", a dead command after this slice;
   the block is deleted and `update` in a workspace view dir falls
   through to the standard no-project error. (b) The `config` command's
   workspace-profile integration — drift warnings naming
   `openspec workspace update` (`src/commands/config.ts:228-261`), the
   workspace context resolution (`:199-211`), and the interactive
   apply-to-workspace flow that **executes**
   `npx openspec workspace update` (`:674-697`) — is deleted whole.
   `config profile` keeps working for global profile management with no
   workspace awareness.
3. **The planning-home carve-out is exact.** `src/core/planning-home.ts`
   keeps resolving workspace view state (`workspaceStateFileExistsSync`,
   `readWorkspaceViewStateSync`, `getWorkspaceChangesDir`), so
   `src/core/workspace/foundation.ts`, `state-io.ts`, `legacy-state.ts`,
   and `src/core/store/binding.ts` (the view-state binding types) stay;
   the `actionContext.mode: "workspace-planning"` contract value stays;
   and the five workflow template guards stay. Existing on-disk view
   state created before this slice still produces workspace-planning
   mode. Precisely: the workspace **state model** and the
   `workspace-planning` mode die in 4.1; the zero-consumer opening
   helpers (`openers`, `open-surface`) die now because nothing can reach
   them once `workspace open` is gone. This narrows the roadmap's
   "opening machinery dies when 4.1 replaces it" wording — the
   controlling locked criterion is delete-don't-hide, and keeping
   unreachable files would recreate exactly the hidden state 5.1
   rejected; the narrowed wording is recorded in the roadmap changelog
   as a reviewable autonomous decision.
4. **Deliberate dead-export carve-outs are recorded, not hidden.** Some
   exports inside kept modules lose their last consumer with this slice
   (`findWorkspaceRoot`/`isWorkspaceRoot` in `state-io.ts`;
   `resolveStoreBinding` and the binding constructors in `binding.ts`).
   They are kept because they belong to the state model 4.1 replaces;
   the slice ledger lists them explicitly so the capstone's dead-code
   sweep reads them as deliberate carve-outs with a named owner (4.1),
   not as misses.
5. **Legacy display and rejection survive; one constraint string
   rewords.** Old initiative-linked changes remain displayable: the
   `InitiativeLink` change-metadata shape and the `status`/`instructions`
   legacy display lines read from change metadata (artifact-graph), not
   from the deleted collections code. `new change --initiative` keeps
   failing with `initiative_option_removed` (locked in 1.2).
   `test/commands/change-initiative-link.test.ts` covers exactly these
   survivors and is kept, not deleted. One surviving workspace-planning
   constraint string still steers toward the old model ("Use initiatives
   for durable coordination when initiative context exists.",
   `src/core/change-status-policy.ts:99`); it rewords to read-only
   compatibility language ("Treat existing initiative context as
   read-only coordination context.") — a string edit inside a kept
   module, not a contract change.
6. **A deletion ledger is committed.** `deletion-ledger.md` in this slice
   folder records (a) the 39 `workspace_*`/`initiative_*` diagnostic
   codes removed with the commands (verified by sweep; the sole survivor
   is `initiative_option_removed`), and (b) the dead-export carve-outs
   from decision 4 — so the capstone's agent-contract inventory and
   dead-code sweep can verify the surface shrank deliberately.
7. **Docs about nothing get deleted, not updated.** `docs/cli.md` loses
   its workspace and initiative sections and summary-table rows;
   `docs/workspaces-beta/` (which documents only the deleted groups) is
   deleted whole; `docs/concepts.md` loses its entire "Coordination
   Workspaces" section (the mental model, layout, and its ~17 dead
   invocations — deleting only the command lines would strand the
   prose). This supersedes the 1.4 decision that parked the beta docs
   for the Phase 5 remainder — with the commands gone, every line in
   them is a dead invocation.

## User Experience

A user (or agent) exploring the CLI sees roots, stores, and the
lifecycle — nothing else:

```text
$ openspec --help
  ... init, update, list, view, validate, show, archive, status,
  instructions, templates, schemas, new, store, completion ...
$ openspec workspace list
error: unknown command 'workspace'
$ openspec initiative list
error: unknown command 'initiative'
```

Nothing points at the dead groups: no help text, no completions, no
docs, no generated guidance (1.4 already cleaned those), no error hint
anywhere in the surviving CLI names a `workspace` or `initiative`
command.

A team with old beta data loses no files: initiative folders inside
their store and workspace view directories are still on disk, old
initiative-linked changes still show their `Initiative: <store>/<id>`
line in `status`/`instructions`, and an agent standing in a leftover
workspace view directory still gets the guarded workspace-planning
behavior until Phase 4 replaces opening.

## Scope

In scope — deletions:

- **Command layer**: `src/commands/workspace.ts`,
  `src/commands/workspace/` (all 11 files), `src/commands/initiative.ts`;
  their imports and registrations in `src/cli/index.ts` (lines ~21, 23,
  349, 351) and the `findWorkspaceRoot` update-detection block
  (~205-210).
- **The `config` command's workspace-profile integration** (decision 2b):
  `src/commands/config.ts` workspace context resolution, drift warnings,
  apply-to-workspace exec flow, and the corresponding tests in
  `test/commands/config-profile.test.ts` (the drift checks and the
  apply-to-workspace flow tests, ~lines 422-441 and related).
- **Orphaned core**: `src/core/workspace/{registry,openers,open-surface,skills,link-input}.ts`;
  `src/core/collections/` (whole tree: `initiatives/`, `runtime.ts`,
  `index.ts`); all barrel exports of the deleted modules
  (`src/core/index.ts`, `src/core/workspace/index.ts`). `binding.ts`
  stays (decision 1). Implementation must re-verify each orphan's
  consumer list at deletion time (the compiler plus a grep for each
  deleted export).
- **Completions**: the `workspace` and `initiative` group entries in
  `src/core/completions/command-registry.ts` (~250-407, ~502-589).
- **Tests of deleted surfaces**: `test/commands/workspace.test.ts`,
  `workspace.interactive.test.ts`, `workspace-open.test.ts`,
  `workspace-initiative-open.test.ts`, `initiative.test.ts`;
  `test/core/workspace/skills.test.ts`;
  `test/core/collections/` (whole tree); the deleted-module portions of
  `test/core/workspace/foundation.test.ts`; the initiatives-collection
  portions of `test/core/store/registry.test.ts` (~615-623; its binding
  tests stay with the kept module); the orphaned
  `test/helpers/path-env.ts` (its only importers are deleted test
  files).
- **Docs**: `docs/cli.md` workspace and initiative sections plus their
  summary-table rows; `docs/workspaces-beta/` deleted;
  `docs/concepts.md` "Coordination Workspaces" section deleted whole.
- **Constraint rewording** (decision 5): the "Use initiatives…" line in
  `src/core/change-status-policy.ts:99` becomes read-only compatibility
  language; its test expectations update.
- **Ledger**: commit `deletion-ledger.md` in this slice folder
  (decisions 4 and 6).

In scope — survivors that need deliberate care:

- `src/core/planning-home.ts` and its workspace state dependencies
  (`foundation.ts`, `state-io.ts`, `legacy-state.ts`) keep working;
  `test/core/planning-home.test.ts` and
  `test/core/workspace/legacy-state.test.ts` stay green.
- Legacy initiative display in `status`/`instructions` and the
  `initiative_option_removed` rejection; `change-initiative-link.test.ts`
  stays green unchanged.
- The store group, root selection, the 1.3 journey, and the 1.4
  vocabulary sweep stay green unchanged.

Out of scope:

- `schemas/workspace-planning/` content and the `workspace-planning`
  schema name (Phase 5 remainder decides its fate).
- The `actionContext.mode` contract, planning-home behavior changes, or
  any opening/assembly replacement (4.1).
- Deleting or migrating user data: initiative dirs, view state,
  workspace changes dirs.
- Any change to surviving command behavior beyond the two named in
  decision 2 (`openspec update` detection-block removal; `config`
  workspace-profile integration removal) and the constraint-string
  rewording in decision 5.
- The store feature and references (Phase 3).

## Acceptance Criteria

### The Groups Are Gone

#### Scenario: Unknown Commands, Everywhere

- **WHEN** the user runs `openspec workspace <anything>` or
  `openspec initiative <anything>`
- **THEN** the CLI fails with Commander's unknown-command error, exit 1,
  no alias, no redirect stub
- **AND** `openspec --help` lists neither group
- **AND** the completions registry contains no `workspace` or
  `initiative` entries (the registry/Commander parity test enforces both
  sides)

#### Scenario: Nothing Points At The Dead Groups

- **WHEN** the surviving CLI prints any help, error, hint, or fix text,
  and when `docs/` (and `.codex/` guidance on disk) are grepped for
  `openspec workspace` and `openspec initiative`
- **THEN** no live surface instructs running a deleted command
- **AND** the only remaining `workspace` vocabulary in generated
  guidance is the five template guards quoting the still-live
  `actionContext.mode: "workspace-planning"` contract

### The Orphans Went With Them

#### Scenario: No Hidden-Not-Deleted Code

- **WHEN** the deleted modules' former exports are grepped across `src/`
- **THEN** no consumer remains and no deleted-module file remains
  (`src/core/collections/` and the five deleted workspace core modules:
  `registry`, `openers`, `open-surface`, `skills`, `link-input`)
- **AND** the build compiles with no unused-import or missing-module
  errors
- **AND** the barrel files export no deleted symbols

#### Scenario: The Contract Surface Shrank Deliberately

- **WHEN** the capstone's agent-contract inventory and dead-code sweep
  run later
- **THEN** `deletion-ledger.md` in this slice folder lists the 39
  `workspace_*`/`initiative_*` diagnostic codes removed with the
  commands (sole survivor: `initiative_option_removed`) and the
  dead-export carve-outs kept for 4.1
- **AND** no surviving code path emits any removed code

### The Survivors Still Work

#### Scenario: Planning-Home Behavior Is Byte-Stable

Ground truth discovered during implementation: `workspace-planning`
mode has been **unreachable from the CLI since slice 1.2** — every
supported command derives its planning home via `toPlanningHome`, which
hardcodes `kind: 'repo'` (`src/core/root-selection.ts:320-327`), and the
one remaining `resolveCurrentPlanningHomeSync` reference is a default
parameter whose only caller always overrides it. The carve-out this
slice preserves is the planning-home **library** contract, which 4.1
owns:

- **GIVEN** a directory carrying pre-existing workspace view state
- **WHEN** `status --json` runs there
- **THEN** it reports `repo-local`, exactly as it did before this slice
  (the 1.2 demotion already made the workspace branch CLI-unreachable)
- **AND** the planning-home library still resolves the view state to
  `kind: 'workspace'` (existing `planning-home.test.ts` coverage) and
  `buildActionContext` still maps that to `workspace-planning` with the
  reworded read-only initiative-context constraint (pinned by a new
  unit test)
- **AND** the five template guards stay byte-identical (they quote the
  library contract that 4.1 deletes)

#### Scenario: Legacy Initiative Links Still Display

- **GIVEN** a change with legacy initiative metadata in
  `.openspec.yaml`
- **WHEN** `status`/`instructions` run on it
- **THEN** the `Initiative: <store>/<id>` legacy display still appears
- **AND** `new change --initiative x` still fails with
  `initiative_option_removed`

#### Scenario: User Data Survives

- **GIVEN** a store containing an `initiatives/` directory and an XDG
  data dir containing workspace view state
- **WHEN** the representative surviving command set runs — `store list`,
  `store doctor`, `store remove` of an *unrelated* store,
  `openspec update`, `status`, and `new change` in that store
- **THEN** the initiative directory and the view state are
  byte-identical afterward (hash the trees before and after)
- **AND** no surviving command offers to delete them

#### Scenario: Update Falls Through Cleanly

- **GIVEN** the working directory is a workspace view dir with no
  OpenSpec project
- **WHEN** the user runs `openspec update`
- **THEN** the standard no-project error appears, with no mention of
  workspace commands

### Nothing Else Moves

#### Scenario: The Rest Of The Suite Is Byte-Stable

- **WHEN** the full suite runs after the deletion
- **THEN** every kept test passes unchanged — store group, root
  selection, the 1.3 two-checkout journey, the 1.4 vocabulary sweep and
  guards, `change-initiative-link` (unchanged — new assertions about the
  legacy display live in the new test file, never here), planning-home,
  legacy-state, and the binding tests in
  `test/core/store/registry.test.ts`
- **AND** the only test diffs are whole-file deletions, the named
  partial edits (`config-profile.test.ts` workspace-profile coverage
  including its helper and the core-preset case, ~134-172 and 422-516;
  `registry.test.ts` initiatives-collection removal;
  `foundation.test.ts` deleted-module portions;
  `command-registry.test.ts` removal of the now-obsolete initiative
  carve-out in the `--store` description walk), and the **additions**:
  the new removal-coverage test file and the planning-home mode pin
- **AND** the net LOC delta of the slice is reported in the changelog
  (expected on the order of −13k lines including tests)
