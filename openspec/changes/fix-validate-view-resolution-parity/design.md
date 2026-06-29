# Design

## Context

This is a bug-fix bundle, not a feature. The three issues are grouped because they share one structural defect: a read/validate command forks its own resolution or validation logic instead of reusing the canonical implementation a sibling command already gets right. Fixing them together lets the implementation converge the divergent paths onto shared helpers in one pass, and lets one set of *parity tests* guard all three against future drift.

The unifying invariant this change establishes:

> A command that reports on or validates a change MUST agree with `openspec status` (for change resolution and artifact/task detection) and with the change-delta validator (for requirement-quality messages). Divergence is a bug, and parity is asserted by test.

Every claim below was verified against source at the base commit `546224e` by tracing each path end to end. The two framings that changed under that review (#1182 mechanism; #1202 blast radius) are flagged inline.

## Root causes (verified)

| # | Symptom | Canonical path (correct) | Divergent path (bug) | Anchor |
|---|---------|--------------------------|----------------------|--------|
| #1182 | `validate <change>` → `Unknown item` for a change `status` resolves | `status`/`instructions` resolve by **directory existence** (`validateChangeExists`) | `validate` resolves via `getActiveChangeIds`, which **requires `proposal.md`** | `src/commands/validate.ts:120,238`; `src/utils/item-discovery.ts:11-16`; `src/commands/workflow/shared.ts:168-170`; scaffolder omits proposal.md `src/utils/change-utils.ts:121-210` |
| #1182b | resolved nested-layout change → "No delta sections found" | spec-driven specs glob is `specs/**/*.md` | `validateChangeDeltaSpecs` discovers deltas one level deep only | `src/core/validation/validator.ts:115-138,265` |
| #1202 | `view` shows a 4/4 change as `Draft`; `archive` archives an unfinished change | `status` tests the schema tracked-tasks **output glob** via `resolveArtifactOutputs` | `getTaskProgressForChange` hardcodes `changes/<name>/tasks.md` | `src/utils/task-progress.ts:28`; callers `src/core/view.ts:100`, `src/core/list.ts:112`, `src/core/archive.ts:342,540`; 2nd copy `src/commands/change.ts:111,164`; helper `src/core/artifact-graph/outputs.ts:17` |
| #1156 | Main-spec SHALL-in-header-only → generic error; delta → targeted hint | Delta validator runs `containsShallOrMust` + `buildMissingShallOrMustMessage` | Main-spec requirement validation falls through to generic `REQUIREMENT_NO_SHALL`; header is discarded before validation | `src/core/validation/validator.ts:167-189,443-463`; `src/core/schemas/base.schema.ts:11-14`; `src/core/parsers/markdown-parser.ts:220-226` |

## Decisions

### Decision 1 — Converge, don't re-implement

Each fix points the divergent path at the *existing* canonical implementation rather than writing a second copy. A second copy is what created every one of these bugs.

### Decision 2 — #1182: the lever is the membership gate, not "workspace homes"

The original framing (validate doesn't understand workspace planning homes) is wrong at HEAD: planning homes are repo-only (`PlanningHomeKind = 'repo'`), the workspace feature is now **stores**, and `validate` already accepts `--store` and resolves the store root through the same `resolveRootForCommand` as `status`. The actual, reproducible divergence is that `validate` gates change membership on `proposal.md` (`getActiveChangeIds`) while `status`/`instructions` gate on directory existence (`validateChangeExists`). Since `createChange` writes `.openspec.yaml` but not `proposal.md`, any scaffolded or still-being-authored change resolves everywhere except `validate`.

The fix: `validate` resolves a change by directory existence within the already-resolved root, for both targeted and bulk modes. This is store-correct for free, because the store root is resolved identically by all three commands — so the reported store/workspace symptom is covered transitively. `getChangeDir`/`resolveCurrentPlanningHomeSync` are **not** the lever (the former is a pure path join with no membership decision); naming them would yield a no-op "fix."

### Decision 3 — #1182: nested delta discovery is in scope

Resolution success is not validation success. `validateChangeDeltaSpecs` discovers deltas exactly one directory deep (`changeDir/specs/<dir>/spec.md`), but the multi-area layout that motivates stores/workspaces is `changeDir/specs/<area>/<capability>/spec.md`. Without recursing, a resolved multi-area change reports "No delta sections found" — the bug merely moves from resolution to discovery. So delta discovery is extended to the nested layout in this change; otherwise the #1182 fix does not actually let the reported change validate.

### Decision 4 — #1202: fix the shared helper and spec the data-safety consumer

`getTaskProgressForChange` is consumed by four call sites. The fix lands in the helper, so all four are corrected at once, but the spec pins two consumers explicitly:

- `cli-view` — the filed symptom (Draft mislabel).
- `cli-archive` — the **incomplete-task gate** (`archive.ts:348-353`). Under a glob-tasks schema the gate currently reads zero tasks and lets an unfinished change archive. This is a correctness/data-safety regression and gets a first-class requirement, not just a passing mention.

`openspec list` is corrected by the same helper and covered by a parity assertion (Decision 7); the independent second copy in `openspec change list` (`change.ts:111,164`, its own `countTasks`) is folded onto the shared helper by a task — it is not left as an orphan.

Resolution keys off **`apply.tracks`** (the schema's "file with checkboxes for progress", `types.ts:18`), not the literal artifact id `tasks`, so custom schemas that name the artifact differently still resolve. Counting reuses `resolveArtifactOutputs(changeDir, ...)`, which roots `fast-glob` at the change directory (so a sibling `changes/archive/` or another change's `tasks.md` cannot be matched) and de-dups matches via a `Set` (so no double counting). When no schema or no tracked-tasks artifact resolves, the helper falls back to the current single-file behavior unchanged.

### Decision 5 — #1156: recover the header, emit once, pin an exact (not byte-identical) message

The targeted delta hint works because the delta parser keeps the requirement header (`RequirementBlock.name`) separate from the body. The **main-spec parser overwrites the header with the first body line** (`markdown-parser.ts:220-226`) before validation, so the Zod refine that emits `REQUIREMENT_NO_SHALL` never sees the header and *cannot* detect "keyword in header only." Two consequences:

1. **Header recovery is mandatory.** The implementation recovers the header for main-spec requirements (reuse the header-preserving parser in `src/core/parsers/requirement-blocks.ts`, which already yields header+body pairs and is the same source the delta path trusts) and runs the existing `containsShallOrMust`/`buildMissingShallOrMustMessage` detection in the imperative main-spec rules (`applySpecRules`, validator.ts:290-329), which already loops requirements and has the raw content.
2. **No double emission.** If the Zod refine is left as-is, a header-only requirement yields *both* the generic Zod error and the new targeted one. The refine is relaxed so the header-only case is owned solely by the imperative hint, while a requirement missing the keyword in *both* header and body still fails with the generic required-keyword error.

The main-spec message is **not byte-identical** to the delta message: the delta message is prefixed `ADDED "<name>" ...`/`MODIFIED "<name>" ...`, which is meaningless for a main spec. Parity is defined on the **actionable sentence**, which must be byte-identical: `... must contain SHALL or MUST in the requirement body, not only in the header. Move the SHALL/MUST statement to the line immediately after the "### Requirement: ..." header.` The spec pins that sentence and leaves the prefix main-spec-appropriate.

### Decision 6 — No behavior change to the canonical paths or the unchanged cases

The fixes are strictly additive coverage. Changes that already have `proposal.md`, single-file `tasks.md` projects, projects with no resolvable schema, and delta-spec validation produce byte-identical output before and after. This keeps the blast radius to "cases that were previously wrong" and makes the parity + no-regression tests a complete description of the change.

### Decision 7 — Parity is the test strategy

Tests assert *agreement*, not just fixed outputs in isolation:

- a change that `status --change <name>` resolves (including a proposal-less and a store change) is also resolved by `validate <name>` and included by `validate --all`;
- for a schema whose tracked-tasks glob is `**/tasks.md`, `view`, `list`, and the `archive` gate compute the same counts as `status` across nested files;
- a requirement with SHALL/MUST in the header only yields the same actionable sentence whether it appears in `openspec/specs/**` or a change delta, emitted exactly once.

Parity assertions fail loudly if a future refactor re-forks any path.

### Decision 8 — Scope boundary against sibling proposals

- #1112 (delta header absent from base passing `validate`, aborting at `archive`) is an *authoring* false-positive resolved by the deterministic `sync --check` gate in the sync/unarchive proposal — out of scope here.
- Artifact *completeness* gaps (a half-written or skipped artifact reported as done, #1084/#1260) belong to the artifact-graph/update-workflow proposal — out of scope here. #1202 is narrower: *where* task counts are read from, not whether the tasks are complete.

## Risks and mitigations

- **Risk:** relaxing the change membership gate changes ambiguity behavior when a name exists as both a change directory and a spec. **Mitigation:** preserve the existing ambiguity/`--type` semantics; only swap the change-membership predicate (proposal.md → directory existence), mirroring `validateChangeExists`, and keep `getSpecIds` as the spec predicate. Covered by an ambiguity scenario.
- **Risk:** the task-progress signature change breaks the other three call sites. **Mitigation:** update all four call sites in the same change; assert `view`/`list`/`archive` parity with `status` in tests; keep the no-schema fallback path.
- **Risk:** the glob over-matches or the archive gate regresses. **Mitigation:** reuse `resolveArtifactOutputs` (rooted at the change dir, de-duped); add scope-containment and archive-gate scenarios.
- **Risk:** the #1156 header recovery perturbs the delta-path message or swallows the no-keyword error. **Mitigation:** keep the delta-path message string identical (snapshot); assert single emission, the no-keyword regression, and that a body-keyword requirement is not falsely flagged.
