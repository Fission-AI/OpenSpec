# Delete Legacy Command Groups Plan

## Status

Spec locked 2026-06-11 after two parallel adversarial rounds (both
initially rejected; all findings verified against code and folded: the
config-command integration, the binding.ts carve-out, the narrowed 5.1
wording, the concepts.md section, the constraint rewording). Plan
drafted 2026-06-11. Implementation not started.

The main move:

```text
Delete the workspace and initiative command groups and everything only
they consumed — about −13k lines — while the planning-home contract,
legacy metadata display, and all user data stay byte-identical.
```

## Source Of Truth

Start from `spec.md` (this folder). Also keep nearby:

- `../../roadmap.md` (5.1 criteria with the narrowed sequencing wording,
  Rules We Should Not Forget)
- `../store-rename-and-guidance/spec.md` (the 1.4 surfaces this slice
  must not regress: vocabulary sweep, store teaching, template guards)

Sequencing: stacks on the 1.4 tip. Phase 3 slices assume these groups
are gone (no more second meanings to design around).

## User-Facing Frame

- "Show me only the product that exists: roots, stores, the lifecycle."
- "Don't touch my files — old initiative folders and workspace state
  stay where they are."
- "If an old change carries initiative metadata, keep showing it to me."

## Goals

- Delete the command layer (15 files), the orphaned core (5 workspace
  modules + the collections tree), the completions entries, the
  workspace-profile integration in `config`, the dead docs, and the
  tests of all of it.
- Keep planning-home, legacy display, `initiative_option_removed`, the
  store group, and the 1.3/1.4 guarantees green and unchanged.
- Commit `deletion-ledger.md` (39 removed diagnostic codes + the
  dead-export carve-outs owned by 4.1).
- Report the net LOC delta.

## Non-Goals

- No changes to `schemas/workspace-planning/`, the `workspace-planning`
  mode value, planning-home behavior, or the template guards.
- No user-data deletion or migration; no doctor warnings about orphaned
  view state (4.1's problem space).
- No behavior changes beyond the spec's three named ones (update
  detection block; config workspace integration; the constraint-string
  rewording).

## Deletion Map (from the spec, re-verified at execution time)

Every deletion below is executed with a grep-before-delete: list the
module's importers; if anything outside the deletion set imports it,
stop and re-plan rather than force.

**Wave 1 — command layer and registrations**

- `src/commands/workspace.ts`, `src/commands/workspace/` (11 files),
  `src/commands/initiative.ts`.
- `src/cli/index.ts`: imports (~21, 23), registrations (~349, 351), the
  `findWorkspaceRoot` update-detection block (~205-210) and its import
  (~24).
- `src/commands/config.ts`: the `WorkspaceConfigProfileContext`
  interface (49-52), workspace context resolution (199-211),
  drift-warning workspace branch (228-252), apply-guidance workspace
  branch (254-261), the core-preset call sites (523-524), the
  apply-to-workspace exec flow (674-697), and the workspace imports
  (25-29).

**Wave 2 — orphaned core and barrels**

- `src/core/workspace/{registry,openers,open-surface,skills,link-input}.ts`;
  prune `src/core/workspace/index.ts` exports to the kept pair
  (foundation, state-io — legacy-state is not barrel-exported; its
  consumers import it directly).
- `src/core/collections/` whole tree; remove its barrel line from
  `src/core/index.ts`.
- Keep: `binding.ts` (foundation depends on it), `foundation.ts`,
  `state-io.ts`, `legacy-state.ts`, `planning-home.ts`.
- Reword the constraint string at `src/core/change-status-policy.ts:99`.

**Wave 3 — completions and docs**

- `src/core/completions/command-registry.ts`: delete the `workspace`
  (~251-407) and `initiative` (~502-589) group entries (the parity test
  enforces lockstep with Wave 1).
- `docs/cli.md`: workspace section (~179-349), the six
  `openspec workspace ...` rows in the agent-compatible table (51-56),
  initiative rows/sections (~63-64, ~444-491), summary-table rows (~10
  — and the kept Stores row's cell text, which lists
  `initiative create/show/list`, gets an in-row edit), and the two
  `openspec workspace update` instructions in the Configuration
  Commands section (1178, 1180).
- `docs/workspaces-beta/` deleted; `docs/concepts.md` "Coordination
  Workspaces" section (~52-194) deleted.

**Wave 4 — tests**

- Delete whole: `test/commands/workspace.test.ts`,
  `workspace.interactive.test.ts`, `workspace-open.test.ts`,
  `workspace-initiative-open.test.ts`, `initiative.test.ts`,
  `test/core/workspace/skills.test.ts`, `test/core/collections/` (tree),
  `test/helpers/path-env.ts`.
- Partial edits: `test/commands/config-profile.test.ts` (the
  workspace-profile helper at 134-172 and the four workspace cases at
  422-516; keep the project-apply coverage at ~402),
  `test/core/store/registry.test.ts` (initiatives-collection portions,
  ~615-624 plus the import at line 11; binding tests stay),
  `test/core/workspace/foundation.test.ts` (deleted-module portions
  only; state-shape tests stay), and
  `test/core/completions/command-registry.test.ts` (remove the
  now-obsolete initiative carve-out at ~157-161 in the `--store`
  description walk — a deliberate fourth partial edit named in the
  spec). No expectations currently pin the reworded constraint string;
  the new pin lives in the Wave 5 test, and
  `change-initiative-link.test.ts` stays unchanged.
- Keep green unchanged: `change-initiative-link.test.ts`,
  `test/core/planning-home.test.ts`,
  `test/core/workspace/legacy-state.test.ts`, store suite, journey,
  vocabulary sweep.

**Wave 5 — new tests and the ledger**

- New tests (in an existing suitable file or a small
  `test/commands/legacy-groups-removed.test.ts`):
  - `openspec workspace list` / `openspec initiative list` → unknown
    command, exit 1 (runCLI, built binary).
  - `--help` lists neither group (in-process registry/`program` checks
    are already enforced by parity; the e2e check covers help output).
  - Update fall-through: view-state dir, `openspec update` → standard
    no-project error, no workspace mention.
  - User-data survival: store with `initiatives/` + XDG view state;
    run `store list`, `store doctor`, `store remove <other>`, `update`,
    `status`, `new change`; compare trees before/after with the
    `snapshotDirectory` approach from
    `test/cli-e2e/store-lifecycle.test.ts:62-80` (relpath→content map).
  - Legacy display: the human-readable `Initiative: <store>/<id>` line
    is pinned nowhere today — assert it here over a legacy-metadata
    fixture (a plain `status` run). `change-initiative-link.test.ts`
    stays unchanged (it pins the JSON field and the flag rejection).
  - Planning-home mode pin: `status --json` over a
    `.openspec-workspace/view.yaml` fixture asserts
    `actionContext.mode === 'workspace-planning'` and the reworded
    read-only constraint string. (Plan-review finding: no existing test
    asserts the mode — `planning-home.test.ts` checks only
    `PlanningHome.kind`.)
- `deletion-ledger.md`: the 39 codes, generated with a precise
  `rg -o "(workspace|initiative)_[a-z_]+" src test | sort -u` inventory
  before and after (classifying data fields like `workspace_skills`
  separately from diagnostic codes), plus the dead-export carve-outs
  (`findWorkspaceRoot`, `isWorkspaceRoot`, `resolveStoreBinding`,
  `createPathStoreBinding`, `createRegisteredStoreBinding`) each with
  owner 4.1.

## Execution Order

One checkpoint, one commit (the waves are not independently shippable —
the build only compiles with all of them done):

1. Wave 1 + 2 together (compiler-driven: delete files, chase the import
   errors through barrels and config.ts).
2. Wave 3 (parity test forces completions lockstep; docs mechanical).
3. Wave 4 + 5 (test deletions, partial edits, new tests, ledger).
4. `pnpm run build`, full `pnpm test`, built-binary smoke
   (`workspace`/`initiative` unknown; `--help`; store group intact),
   and the explicit pointer gate:
   `grep -rn "openspec workspace\|openspec initiative" docs/ src/ .codex/`
   must return nothing (the vocabulary sweep does not police these —
   `workspace`/`initiative` are not retired tokens).
5. Capture net LOC delta (`git diff --shortstat HEAD~1`) for the
   changelog; commit.

If the suite reveals a consumer the grep missed, stop, record the
correction in the spec (ground truth), and re-run — never force a
deletion through by stubbing.

## Risks And Guardrails

- **Hidden consumers through barrels**: `src/core/index.ts` re-exports
  everything; a kept module may import a deleted symbol via the barrel
  rather than directly. The compiler catches imports; grep each deleted
  *export name* too (string-based access or re-export chains).
- **The config command edit is behavior, not just deletion**: keep
  `config profile` working globally; only the workspace branch goes.
  Its tests define the kept behavior — edit them deliberately.
- **registry.test.ts surgery**: the initiatives-collection block sits
  inside a kept file; delete only that describe/it scope and its
  imports, keep binding coverage.
- **Vocabulary sweep stays green**: deleted docs can't regress it, but
  the new test file must not introduce retired tokens (use the
  established concatenation constants if needed — likely unnecessary
  since `workspace`/`initiative` are not retired tokens).
- **User-data test isolation**: build the fixture store + view state in
  temp XDG dirs; hash with a stable tree walk (reuse the journey test's
  approach in `store-lifecycle.test.ts`).
- **LOC delta accuracy**: report `git diff --shortstat` of the single
  implementation commit, splitting src/test/docs in the changelog note.

## Done Definition

- All spec acceptance scenarios pass; the implementation commit is on
  `codex/store-root-parity` with the full suite green.
- `deletion-ledger.md` committed; net LOC delta recorded in the
  changelog.
- Roadmap 5.1 first-tranche boxes ticked (cleanup plan written, cleanup
  done, tests/review checks pass), pointer moved to 3.1.
