# Design

## Context

This is a bug-fix bundle, not a feature. The three issues are grouped because they share one structural defect: a read/validate command forks its own resolution or validation logic instead of reusing the canonical implementation a sibling command already gets right. Fixing them together lets the implementation converge the divergent paths onto shared helpers in one pass, and lets a single set of *parity tests* guard all three against future drift.

The unifying invariant this change establishes:

> A command that reports on or validates a change MUST agree with `openspec status` (for resolution and artifact detection) and with the change-delta validator (for requirement-quality messages). Divergence is a bug, and parity is asserted by test.

## Root causes (verified against source at `546224e`)

| # | Symptom | Canonical path (correct) | Divergent path (bug) | Anchor |
|---|---------|--------------------------|----------------------|--------|
| #1182 | `validate <change>` → `Unknown item` for a workspace-home change | `status` / `instructions` resolve via `planning-home` (repo **and** managed workspace homes) | `validate` resolves via `resolveRootForCommand` + `getActiveChangeIds`, repo-home only | `src/commands/validate.ts:41`, `src/commands/validate.ts:129`; `src/core/planning-home.ts:74,92` |
| #1202 | `view` shows a 4/4 change as `Draft` | `status` tests the schema `tasks` artifact **output glob** | `getTaskProgressForChange` hardcodes `changes/<name>/tasks.md` | `src/utils/task-progress.ts:28`; caller `src/core/view.ts:100` |
| #1156 | Main-spec SHALL-in-header-only → generic error; delta → targeted hint | Delta validator runs `containsShallOrMust` + `buildMissingShallOrMustMessage` | Main-spec requirement validation falls through to generic `REQUIREMENT_NO_SHALL` | `src/core/validation/validator.ts:167-189,443-463`; `src/core/validation/constants.ts:19`; `src/core/schemas/base.schema.ts:13` |

## Decisions

### Decision 1 — Converge, don't re-implement

Each fix points the divergent path at the *existing* canonical implementation rather than writing a second copy. This is the whole thesis of the bundle: a second copy is what created the bugs.

- **#1182:** `validate` calls the shared `planning-home` resolution first (as `status`/`instructions` do), then falls back to existing repo discovery only when no planning home resolves the name. The not-found / ambiguity / `--type` override behavior is preserved for repo homes.
- **#1202:** `getTaskProgressForChange` resolves candidate `tasks.md` files through the schema's `tasks` artifact output glob (the same resolution `status` uses to mark the artifact done), then aggregates checkbox counts across all matches. A project with a single top-level `tasks.md` is the degenerate one-match case and is unchanged.
- **#1156:** the header-only-keyword detection is lifted so a single helper serves both the delta path and the main-spec path. The delta-path message text is unchanged; the main-spec path stops emitting the generic constant when the keyword is present in the header only.

### Decision 2 — No behavior change to the canonical paths

The fixes are strictly additive coverage. Repo-home resolution, single-file `tasks.md` counting, and delta-spec validation produce byte-identical output before and after. This keeps the blast radius to "cases that were previously wrong" and makes the parity tests a complete description of the change.

### Decision 3 — Parity is the test strategy

Rather than only asserting each fixed output in isolation, the tests assert *agreement*:

- a workspace-home change that `status --change <name>` resolves is also resolved by `validate <name>` (no `Unknown item`);
- for a schema whose `tasks` artifact glob is `**/tasks.md`, `view` task counts equal `status` task counts across nested files;
- a requirement with SHALL/MUST in the header only yields the same targeted hint whether it appears in `openspec/specs/**` or in a change delta.

Parity assertions fail loudly if a future refactor re-forks either path.

### Decision 4 — Scope boundary against the sibling proposals

This bundle is deliberately carved to not overlap adjacent in-flight work:

- #1112 (delta header absent from base passing `validate`, aborting at `archive`) is an *authoring* false-positive resolved by the deterministic `sync --check` gate in the sync/unarchive proposal — **out of scope here**.
- Artifact *completeness* gaps (a half-written or skipped artifact reported as done, #1084/#1260) belong to the artifact-graph/update-workflow proposal — **out of scope here**. #1202 is narrower: it is purely about *where* `view` looks for `tasks.md`, not whether the tasks are complete.

## Risks and mitigations

- **Risk:** `validate`'s fallback ordering changes ambiguity behavior when a name exists in both a workspace home and the repo home. **Mitigation:** preserve the existing ambiguity/`--type` semantics; only add workspace resolution as an additional source, mirroring how `status` already orders resolution.
- **Risk:** glob-based task aggregation double-counts or mis-aggregates when multiple `tasks.md` files exist. **Mitigation:** define aggregation as the sum of completed and total checkboxes across all glob matches, matching the artifact-done semantics `status` uses; cover the multi-file case in tests.
- **Risk:** lifting the SHALL/MUST helper perturbs the delta-path message. **Mitigation:** keep the delta-path message string identical; assert it with an unchanged snapshot test.
