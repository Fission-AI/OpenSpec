# Design

## Context

This is a bug-fix bundle, not a feature. The three issues are grouped because they share one structural defect: a read/validate command forks its own resolution or validation logic instead of reusing the canonical implementation a sibling command already gets right. Fixing them together lets the implementation converge the divergent paths onto shared helpers in one pass, and lets one set of *parity tests* guard all three against future drift.

The unifying invariant this change establishes:

> A command that reports on or validates a change MUST resolve files the same way `openspec status` does, and MUST produce the same requirement-quality messages the change-delta validator does. Divergence is a bug, and parity is asserted by test.

Every claim below was verified against source at the base commit `546224e` **and reproduced empirically against the built (pre-fix) CLI**. The reproductions are summarized under "Empirical evidence." The framings that changed under this review are flagged inline; two of them (the #1202 `apply.tracks` mechanism and the "agrees with status" count claim) were corrections to an earlier draft of this very proposal.

## Root causes (verified)

| # | Symptom | Canonical path (correct) | Divergent path (bug) | Anchor |
|---|---------|--------------------------|----------------------|--------|
| #1182 | `validate <change>` → `Unknown item`; `--all` → "No items found" | `status`/`instructions` resolve by **directory existence** (`validateChangeExists`) | `validate` resolves via `getActiveChangeIds`, which **requires `proposal.md`** | `src/commands/validate.ts:97,120,238`; `src/utils/item-discovery.ts:11-16`; `src/commands/workflow/shared.ts:168-170`; scaffolder omits proposal.md `src/utils/change-utils.ts:121-210` |
| #1182b | resolved nested-layout change → "No delta sections found" | spec-driven specs glob is `specs/**/*.md` | `validateChangeDeltaSpecs` discovers deltas one level deep only | `src/core/validation/validator.ts:115-138,265` |
| #1202 | `view` shows a tasked change as `Draft`; `archive` archives an unfinished change | `status` tests the tasks **artifact's `generates` glob** via `resolveArtifactOutputs` | `getTaskProgressForChange` hardcodes `changes/<name>/tasks.md` | `src/utils/task-progress.ts:28`; callers `src/core/view.ts:100`, `src/core/list.ts:112`, `src/core/archive.ts:342,540`; 2nd copy `src/commands/change.ts:111,164`; helper `src/core/artifact-graph/outputs.ts:17`; tracks type `src/core/artifact-graph/types.ts:18` |
| #1156 | Main-spec SHALL-in-header-only → generic error; delta → targeted hint | Delta validator runs `containsShallOrMust` + `buildMissingShallOrMustMessage` | Main-spec requirement validation falls through to generic `REQUIREMENT_NO_SHALL`; header is discarded before validation | `src/core/validation/validator.ts:167-189,443-463`; `src/core/schemas/base.schema.ts:11-14`; `src/core/parsers/markdown-parser.ts:220-226` |

## Empirical evidence (built pre-fix CLI, fresh `init`'d projects)

- **#1182:** `new change foo` writes `changes/foo/.openspec.yaml` only. `status --change foo` resolves (exit 0); `validate foo` → `Unknown item 'foo'` (exit 1); `validate --all` with foo as the sole change → `No items found to validate` (**exit 0**, a silent CI failure). Writing `proposal.md` flips `validate` to resolve — confirming the exact lever. A valid two-level `specs/<area>/<cap>/spec.md` change → `No deltas found` (#1182b); one-level control validates clean.
- **#1202:** project-local schema with tasks `generates: "**/tasks.md"`; change `foo` = `backend/tasks.md` (2/2) + `frontend/tasks.md` (1/3) = 3/5, no top-level file. `status` → `4/4 artifacts complete, isComplete:true` (file existence, not checkboxes); `view` → **Draft**; `list` → `No tasks`; `list --json` → `totalTasks:0`. `archive foo --skip-specs --no-validate --yes` **moved the unfinished change into `changes/archive/`** — the incomplete-task gate was wholly bypassed. Baselines (default schema top-level `tasks.md`; bare project) classify correctly and are preserved by the fix.
- **#1156:** main spec, SHALL in header only → generic `Requirement must contain SHALL or MUST keyword`. The same mistake as an ADDED/MODIFIED delta → the targeted hint. RENAMED delta → no error (no body). No-keyword-anywhere main spec → generic error. Lowercase `shall` → error on both paths. **Header-only with no body line at all → reported VALID today** (parser keeps `text` = header, which contains SHALL).

## Decisions

### Decision 1 — Converge, don't re-implement

Each fix points the divergent path at the *existing* canonical implementation rather than writing a second copy. A second copy is what created every one of these bugs.

### Decision 2 — #1182: the lever is the membership gate, not "workspace homes"

The original framing (validate doesn't understand workspace planning homes) is wrong at HEAD: planning homes are repo-only (`PlanningHomeKind = 'repo'`), the workspace feature is now **stores**, and `validate` already accepts `--store` and resolves the store root through the same `resolveRootForCommand` as `status`. The actual, reproducible divergence is that `validate` gates change membership on `proposal.md` (`getActiveChangeIds`) at **three** sites — targeted (validate.ts:120), bulk (validate.ts:238), and the interactive "pick one" selector (validate.ts:97) — while `status`/`instructions` gate on directory existence (`validateChangeExists`). Since `createChange` writes `.openspec.yaml` but not `proposal.md`, any scaffolded or still-authoring change resolves everywhere except `validate`.

The fix: `validate` resolves a change by directory existence within the already-resolved root, at all three sites. This is store-correct for free (the store root is resolved identically by all three commands), so the reported store/workspace symptom is covered transitively, and no store-specific scenario is needed. `getChangeDir`/`resolveCurrentPlanningHomeSync` are **not** the lever (the former is a pure path join with no membership decision).

Two boundaries confirmed empirically and held out of scope: (a) the **spec** side is correct — `getSpecIds` requires `spec.md`, and `spec show` agrees, so a spec dir without `spec.md` is correctly "not found"; no spec-side scenario is added. (b) The deprecated noun-form `openspec change validate <name>` already resolves a passed name by directory existence (change.ts:215) but is cwd-based (cannot reach a `--store` root) and its JSON mode does not set a non-zero exit on invalid — pre-existing noun-form defects, explicitly not addressed here.

### Decision 3 — #1182: nested delta discovery is in scope

Resolution success is not validation success. `validateChangeDeltaSpecs` discovers deltas exactly one directory deep (`changeDir/specs/<dir>/spec.md`), but the multi-area layout that motivates stores/workspaces is `changeDir/specs/<area>/<capability>/spec.md`. Without recursing, a resolved multi-area change reports "No delta sections found" (reproduced). So delta discovery is extended to the nested layout in this change; otherwise the #1182 fix does not actually let the reported change validate.

### Decision 4 — #1202: resolve via the tracked artifact's `generates` glob, and parity is resolution-only

The fix lands in the shared helper `getTaskProgressForChange`, correcting all four call sites at once; the spec pins two consumers explicitly (`cli-view` — the filed Draft symptom; `cli-archive` — the incomplete-task gate, a data-safety regression that lets an unfinished change archive). `openspec list` is corrected by the same helper; the independent second copy in `openspec change list` (`change.ts:111,164`, its own `countTasks`) is folded onto the shared helper by a task — not left as an orphan.

Two corrections to an earlier draft, both load-bearing:

- **`apply.tracks` is a filename that *selects* the artifact; it is not the glob.** `apply.tracks` is typed `string | null` and is consumed elsewhere as a literal path (`path.join(changeDir, tracks)` + `existsSync`), so `apply.tracks: "**/tasks.md"` cannot match nested files. The glob `status` actually uses is the tracked artifact's **`generates`**, resolved by `resolveArtifactOutputs(changeDir, artifact.generates)`. So the fix identifies the tracked-tasks artifact (the artifact whose `generates` equals `apply.tracks`, falling back to artifact id `tasks` when no `apply` block is present), then counts checkboxes across `resolveArtifactOutputs(changeDir, thatArtifact.generates)`. `resolveArtifactOutputs` roots `fast-glob` at the change directory (so a sibling `changes/archive/` or another change's `tasks.md` cannot match) and de-dups via a `Set` (so no double counting).
- **`status` checks file *existence*, not checkbox completion.** Empirically `status` calls a 3/5 change `4/4 complete, isComplete:true`. So the parity established here is **resolution-mechanism parity** (`view`/`archive` resolve the same set of files `status` resolves), not count parity — `view`/`archive` additionally count checkboxes. Any "view/archive task counts equal status" claim is false and is removed from the spec.

The signature gains `projectRoot` (needed to resolve project-local schemas via `resolveSchema`); all four call sites plus the two `change.ts` sites can derive it. `resolveSchema` **throws** on an unresolvable/misnamed schema, whereas the current helper never throws — so the helper MUST catch and fall back to single-file `tasks.md`, or `view`/`list`/`archive` would crash on a project whose config names a deleted schema. This fallback is specified and tested.

### Decision 5 — #1156: recover the header, remove the refine, pin an exact (not byte-identical) message

The targeted delta hint works because the delta parser keeps the requirement header (`RequirementBlock.name`) separate from the body. The **main-spec parser overwrites the header with the first body line** (`markdown-parser.ts:220-226`) before validation, so the Zod refine that emits `REQUIREMENT_NO_SHALL` never sees the header and cannot detect "keyword in header only."

The fix:

1. **Recover the header.** Reuse the header-preserving parser `src/core/parsers/requirement-blocks.ts` (`extractRequirementsSection`, which yields header+body pairs and is the same source the delta path trusts) and run the existing `containsShallOrMust` + `buildMissingShallOrMustMessage` detection in the imperative main-spec rules (`applySpecRules`, validator.ts:290-329), which already loops requirements and has the raw content.
2. **Remove the Zod refine, don't merely relax it.** Change deltas do **not** use the refine — they validate imperatively in `validateChangeDeltaSpecs` (proven: a no-keyword delta emits the imperative `must contain SHALL or MUST` base string, not the Zod `REQUIREMENT_NO_SHALL` string). So the refine is exercised only on the main-spec path. Once the imperative rule in `applySpecRules` owns **both** sub-cases — keyword-in-header-only → targeted hint, and keyword-nowhere → generic message — the `.refine` on `RequirementSchema` (base.schema.ts:11-14) is **removed entirely**. Keeping a conditional refine "for the no-keyword case only" risks double-emission on the header-only case, which the "exactly one issue" scenario forbids.
3. **Message.** The actionable sentence is byte-identical to the delta path; the prefix differs (main specs have no `ADDED`/`MODIFIED`). The main-spec message is: `Requirement "<name>" must contain SHALL or MUST in the requirement body, not only in the header. Move the SHALL/MUST statement to the line immediately after the "### Requirement: ..." header.` Generalize `buildMissingShallOrMustMessage` to accept the prefix so the actionable sentence lives in one place and cannot drift between paths. Lowercase is rejected via the shared `\b(SHALL|MUST)\b` regex (converging the main-spec path off the case-sensitive Zod `.includes`).

RENAMED requirements carry no body and are not subject to the hint (the `'ADDED' | 'MODIFIED'` action set is correct); a scenario pins this so it is not mistaken for a gap.

### Decision 6 — Additive coverage, with one intended behavior change called out

The fixes are additive coverage: changes that already have `proposal.md`, single-file `tasks.md` projects, projects with no resolvable schema, and delta-spec validation produce byte-identical output before and after. One main-spec case is an **intended** behavior change, not an unchanged case: a requirement with the keyword in the header and **no body line at all** is reported valid today and becomes a body-keyword hint under header recovery (the delta path already errors on this case). This is called out explicitly so it is not discovered as an accidental regression; every other previously-passing case is unchanged.

### Decision 7 — Parity is the test strategy

Tests assert *agreement*, not just fixed outputs in isolation:

- a change that `status --change <name>` resolves (including a proposal-less and a store change) is also resolved by `validate <name>`, included by `validate --all`, and listed by the interactive selector; a resolved-but-invalid change exits non-zero;
- for a schema whose tracked-tasks `generates` is `**/tasks.md`, `view`, `list`, and the `archive` gate resolve the **same set of files** `status` resolves (and additionally count checkboxes consistently with each other);
- a requirement with SHALL/MUST in the header only yields the same actionable sentence whether it appears in `openspec/specs/**` or a change delta, emitted exactly once.

Parity assertions fail loudly if a future refactor re-forks any path.

### Decision 8 — Scope boundary against sibling proposals

- #1112 (delta header absent from base passing `validate`, aborting at `archive`) is an *authoring* false-positive resolved by the deterministic `sync --check` gate in the sync/unarchive proposal — out of scope here.
- Artifact *completeness* gaps (a half-written or skipped artifact reported as done, #1084/#1260) belong to the artifact-graph/update-workflow proposal — out of scope here. #1202 is narrower: *where* task counts are read from, not whether the tasks are complete.

## Risks and mitigations

- **Risk:** relaxing the change membership gate changes ambiguity behavior when a name exists as both a change directory and a spec. **Mitigation:** preserve the existing ambiguity/`--type` semantics; only swap the change-membership predicate (proposal.md → directory existence) at all three sites, keeping `getSpecIds` as the spec predicate. Covered by an ambiguity scenario.
- **Risk:** the task-progress signature change breaks the other call sites, or crashes on an unresolvable schema. **Mitigation:** update all six sites (four helper callers + two `change.ts` copies) in the same change; catch `resolveSchema` failure and fall back to single-file `tasks.md`; assert `view`/`archive` resolve the same files as `status`.
- **Risk:** the glob over-matches or the archive gate regresses. **Mitigation:** reuse `resolveArtifactOutputs` (rooted at the change dir, de-duped); add scope-containment and archive-gate scenarios.
- **Risk:** removing the Zod refine drops the no-keyword error on the main-spec path. **Mitigation:** the imperative `applySpecRules` rule must own the no-keyword case before the refine is removed; assert the no-keyword regression and single emission. Delta validation is untouched (it never used the refine).
