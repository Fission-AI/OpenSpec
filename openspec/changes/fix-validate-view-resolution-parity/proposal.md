## Why

Three commands silently give a wrong or incomplete answer about the spec source of truth, because sibling read/validate paths reimplement narrower logic than the canonical path each should share.

- `openspec validate <change>` rejects a change as `Unknown item` whenever `proposal.md` is absent (a scaffolded or still-authoring change, in a repo or a store), though `status`/`instructions` resolve it by directory existence — so spec checks are skipped for the changes most likely to be malformed (#1182).
- `openspec view` labels a fully-tasked change `Draft` when its tasks live in nested/glob `tasks.md` files, contradicting `status`; the same blind spot lets `archive` silently archive an unfinished change (#1202).
- `openspec validate` gives the targeted "move SHALL/MUST onto the body line" hint for deltas, but only the generic message for the same mistake in a main spec (#1156).

Each is deterministic and fixed by converging a divergent path onto the canonical one.

## Background: one root cause, three commands

OpenSpec sells one promise — the specs are the source of truth and the CLI tells you the truth about them. These three bugs break that promise the same way: a command that *reads* or *validates* state quietly forks its own resolution logic instead of reusing the canonical implementation a sibling command already gets right. The fork is invisible until the two paths disagree, and then the tool reports a confident falsehood (`Unknown item`, `Draft`, a clean archive of an unfinished change, a worse error message) with no signal that anything diverged.

This proposal was hardened by tracing each path to source (anchors in `design.md`). Two framings changed during that review and are called out so reviewers can check them:

- **#1182 is a membership-gate bug, not a "home" bug.** Planning homes are repo-only today (`PlanningHomeKind = 'repo'`); the "managed workspace planning home" from the 1.4.1 issue is the feature since renamed **stores**, and `validate` already accepts `--store`. The real divergence is narrower and reproducible at HEAD: `status`/`instructions` resolve a change by **directory existence** (`validateChangeExists`), while `validate` resolves it through `getActiveChangeIds`, which **requires `proposal.md`**. `createChange` does not write `proposal.md`, so a scaffolded change — including a store change still being authored — resolves everywhere except `validate`. Sharing the canonical resolution covers the reported store/workspace symptom transitively, because the store root is already resolved identically by all three commands.
- **#1202 is wider than `view`.** The buggy helper `getTaskProgressForChange` is consumed by `view`, `list`, and the `archive` incomplete-task gate. The `archive` case is a correctness/data-safety risk, not a cosmetic mislabel: under a glob-tasks schema it reads zero tasks, finds nothing incomplete, and archives a change whose work is not done. A second, independent hardcoded copy lives in `openspec change list`.

## What Changes

- **`validate` shares the canonical change-resolution rule (#1182).** `openspec validate <change>` resolves a change by directory existence — the same rule `status`/`instructions` use — instead of requiring `proposal.md`. This applies to targeted `validate <name>`, bulk `validate --all`/`--changes`, **and** the interactive "pick one" selector, within both the repo root and a `--store`-selected root. Spec/change ambiguity handling and `--type` overrides are preserved. Delta discovery is extended to the nested `specs/<area>/<capability>/spec.md` layout so a resolved multi-area change actually validates its deltas instead of reporting "no deltas found."
- **`view`/`archive`/`list` resolve tasks through the tracked-tasks artifact glob (#1202).** Task progress for a change is resolved through the tracked-tasks artifact's `generates` glob — the same file-resolution `status` uses — counting every matching `tasks.md` scoped to the change directory, with the single-file `tasks.md` and no-resolvable-schema cases preserved as today. (The tracked artifact is selected via `apply.tracks`, which is a filename, not a glob; the glob is that artifact's `generates`.) As a result `view`'s Draft/Active/Completed classification stops being blind to nested files, and `archive`'s incomplete-task gate no longer passes an unfinished glob-tasks change. The second hardcoded copy in `openspec change list` is folded onto the same shared resolution. Because `status` checks task-file *existence* (not checkboxes), the guarantee is that these commands resolve the *same files* `status` resolves — not that they reproduce a count `status` does not compute.
- **The SHALL/MUST body-keyword hint applies to main specs (#1156).** A main-spec requirement whose normative keyword sits only in the `### Requirement:` header receives the same targeted "move it to the body line" remediation as a change delta, instead of the generic message — emitted exactly once (no duplicate generic error), across every main-spec surface (`validate <spec>`, `--all`, JSON, `spec validate`, and rebuilt-spec validation).

### What this deliberately does *not* change

- The canonical paths (`status`, `instructions`, the delta-spec validator) are not changed in behavior — the divergent paths are moved onto them.
- No new command, flag, schema field, or output format. Existing JSON shapes are preserved; only the values they carry become correct.
- Resolution for changes that already have `proposal.md`, single-file `tasks.md` projects, projects with no resolvable schema, and delta-spec validation are byte-for-byte unchanged — these fixes only add coverage where a path was previously blind.
- It does not address the #1112 authoring false-positive (a delta MODIFIED/REMOVED header absent from the base spec passing `validate`, aborting at `archive`); that is handled by the deterministic `sync --check` gate in the separate sync/unarchive proposal. The overlap is intentionally avoided.
- It does not change artifact *completeness* semantics (whether a half-written artifact counts as done, #1084/#1260); #1202 here is strictly about *where* task counts are read from, not whether the tasks are complete.

## Capabilities

### Modified Capabilities

- `cli-validate`: resolves a change by directory existence (matching `status`/`instructions`) for targeted, bulk, and interactive-selector validation in repo and store roots; discovers deltas under nested `specs/**` layouts; and emits the targeted SHALL/MUST body-keyword hint for main specs, once, across all surfaces.
- `cli-view`: resolves task progress through the tracked-tasks artifact's `generates` glob (the same file-resolution `status` uses), so Draft/Active/Completed classification stops being blind to nested `tasks.md` files.
- `cli-archive`: the incomplete-task gate reads task progress through the same tracked-tasks resolution, so a glob-tasks change with unfinished work cannot pass the gate.

## Impact

- **Affected specs:** `cli-validate` (2 added requirements), `cli-view` (1 added requirement), `cli-archive` (1 added requirement).
- **Affected code (implementation follow-up, not in this planning PR):**
  - `src/commands/validate.ts` — replace the `getActiveChangeIds` membership gate with directory-existence resolution mirroring `validateChangeExists` (`src/commands/workflow/shared.ts:168-170`) at all three sites: targeted (line 120), bulk (line 238), interactive selector (line 97). Reconcile with `getSpecIds` for the change/spec ambiguity path (leave `getSpecIds` unchanged — it is correct). Sibling `src/commands/show.ts:81,115,121` shares the gate and should be folded in or explicitly scoped out; the deprecated noun-form `change validate` is out of scope.
  - `src/core/validation/validator.ts` — extend delta discovery (`validateChangeDeltaSpecs`, lines 115-138) to recurse the nested `specs/<area>/<capability>/spec.md` layout.
  - `src/utils/task-progress.ts` — `getTaskProgressForChange` gains a `projectRoot` param, identifies the tracked-tasks artifact (artifact whose `generates` equals the schema `apply.tracks`, fallback id `tasks`), counts checkboxes across `resolveArtifactOutputs(changeDir, artifact.generates)` (`src/core/artifact-graph/outputs.ts:17`, de-duped, change-rooted). `apply.tracks` selects the artifact; the glob is its `generates`. Catch `resolveSchema` failure → fall back to single-file `tasks.md` (never throw). Update all four call sites (`src/core/view.ts:100`, `src/core/list.ts:112`, `src/core/archive.ts:342`, `:540`) for the new arg; fold the second copy in `src/commands/change.ts:111,164` onto the helper.
  - `src/core/validation/validator.ts` + `src/core/parsers/requirement-blocks.ts` — recover the requirement header (lost at `markdown-parser.ts:220-226`) via `extractRequirementsSection` so the main-spec rule in `applySpecRules` can detect "keyword in header only" and emit the targeted hint via a prefix-generalized `buildMissingShallOrMustMessage` (lines 443-463); **remove** the Zod refine (`src/core/schemas/base.schema.ts:11-14`) once the imperative rule owns both the header-only and no-keyword cases (deltas validate imperatively and never used the refine, so removal cannot regress them).
- **Risk:** low-to-moderate. Each fix points a command at logic that already exists for the canonical path; the larger surface is the task-progress signature change (six sites incl. schema-failure fallback) and the validator header recovery. Regression risk is bounded by parity tests asserting `validate`/`view`/`archive`/the main-spec validator agree with their canonical counterparts, plus explicit no-regression scenarios for the unchanged cases.

## Issues addressed

- [#1182](https://github.com/Fission-AI/OpenSpec/issues/1182) — `openspec validate` cannot resolve a change that `status`/`instructions` resolve (reported for a managed workspace/store home; root cause is the `proposal.md` membership gate).
- [#1202](https://github.com/Fission-AI/OpenSpec/issues/1202) — `openspec view` does not detect nested/glob `tasks.md`, classifying complete changes as `Draft` (and the same helper silently weakens the `archive` incomplete-task gate).
- [#1156](https://github.com/Fission-AI/OpenSpec/issues/1156) — the 1.4.0 SHALL/MUST body-keyword hint applies to change deltas but not main specs.
