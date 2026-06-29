## Why

Three commands silently give a wrong or incomplete answer about the spec source of truth, because sibling read/validate paths reimplement narrower logic than the canonical path each should share.

- `openspec validate <change>` returns `Unknown item` for a change in a workspace planning home, though `status`/`instructions`/`new` resolve it — so spec checks are skipped for exactly the newest, most error-prone schema (#1182).
- `openspec view` labels a fully-tasked change `Draft` when its tasks live in nested/glob `tasks.md` files, contradicting `openspec status` for the same change (#1202).
- `openspec validate` gives the targeted "move SHALL/MUST onto the body line" hint for deltas, but only the generic "must contain SHALL or MUST" message for the same mistake in a main spec (#1156).

Each is deterministic, individually testable, and fixed by converging a divergent path onto the canonical one — no new surface, no behavior change to the path already correct.

## Background: one root cause, three commands

OpenSpec sells one promise — the specs are the source of truth, and the CLI tells you the truth about them. These three bugs break that promise in the same way: a command that *reads* or *validates* state quietly forks its own resolution logic instead of reusing the canonical implementation that a sibling command already gets right. The fork is invisible until the two paths disagree, and then the tool reports a confident falsehood (`Unknown item`, `Draft`, a worse error message) with no signal that anything diverged.

- **Resolution parity (#1182).** `validate` resolves items through `resolveRootForCommand` + `getActiveChangeIds`, which only ever look at a repo planning root. `status` and `instructions` resolve through the shared `planning-home` module, which also understands managed *workspace* planning homes. So `status --change <name>` finds a workspace change and `validate <name>` cannot. The two should share one resolver.
- **Glob parity (#1202).** `status` decides whether the `tasks` artifact exists by testing the schema's artifact **output glob** (e.g. `**/tasks.md`). `view` decides the same thing by hardcoding `changes/<name>/tasks.md`. Under a project-local schema that emits `backend/tasks.md` + `frontend/tasks.md`, `status` says `4/4 done` and `view` says `Draft`. Task counting should run through the resolved glob, like everything else that respects the schema.
- **Validation parity (#1156).** The change-delta requirement validator already detects "SHALL/MUST is in the header but not the body line" and emits a precise, actionable hint. The main-spec requirement validator never runs that detection — it falls through to the generic Zod message. The same authoring mistake deserves the same guidance regardless of which file it lives in.

## What Changes

- **`validate` shares planning-home resolution (#1182).** `openspec validate <change>` resolves the named item through the same planning-home resolution that `status`/`instructions` use, so a change created in a managed workspace home validates from the workspace root instead of failing `Unknown item`. Repo-home behavior is unchanged.
- **`view` counts tasks through the schema glob (#1202).** Task progress for a change is resolved through the schema's `tasks` artifact output glob (counting every matching `tasks.md`), so `view`'s Draft/Active/Completed classification matches `status`. A single-file `tasks.md` continues to resolve exactly as before.
- **The SHALL/MUST body-keyword hint applies to main specs (#1156).** Main-spec requirement validation reuses the same header-only-keyword detection as the delta path, so a requirement whose normative keyword sits only in the `### Requirement:` header gets the targeted "move it to the body line" hint in both `openspec/specs/**` and change deltas.

### What this deliberately does *not* change

- The canonical paths (`status`, `instructions`, the delta-spec validator) are not touched in behavior — the divergent paths are moved onto them.
- No new command, flag, schema field, or output format. Existing JSON shapes are preserved; only the values they carry become correct.
- Resolution semantics for repo planning homes, single-file `tasks.md` projects, and delta-spec validation are byte-for-byte unchanged — these fixes only add coverage where a path was previously blind.
- This does not address the *authoring* false-positive in #1112 (a delta MODIFIED/REMOVED header absent from the base spec); that is handled deterministically by the `sync --check` gate in the separate sync/unarchive proposal. The overlap is intentionally avoided.

## Capabilities

### Modified Capabilities

- `cli-validate`: validate resolves changes through shared planning-home resolution (workspace homes included), and the main-spec requirement validator emits the same targeted SHALL/MUST body-keyword remediation hint as the delta path.
- `cli-view`: the dashboard resolves task progress through the schema's `tasks` artifact output glob, so Draft/Active/Completed classification agrees with `openspec status`.

## Impact

- **Affected specs:** `cli-validate` (2 added requirements), `cli-view` (1 added requirement).
- **Affected code (implementation follow-up, not in this planning PR):**
  - `src/commands/validate.ts` — resolve the item through `src/core/planning-home.ts` (`resolveCurrentPlanningHomeSync` / `getChangeDir`) before falling back to repo discovery, mirroring `src/commands/workflow/status.ts`.
  - `src/utils/task-progress.ts` — `getTaskProgressForChange` resolves `tasks.md` via the schema artifact output glob rather than the hardcoded `path.join(changesDir, changeName, 'tasks.md')` at line 28; `src/core/view.ts:100` is the caller.
  - `src/core/validation/validator.ts` — lift the header-only-keyword detection (`containsShallOrMust` + `buildMissingShallOrMustMessage`, lines 443-463) so the main-spec requirement path uses it instead of the generic `REQUIREMENT_NO_SHALL` constant emitted via `src/core/schemas/base.schema.ts:13`.
- **Risk:** low. Each fix narrows a divergence by pointing a command at logic that already exists and is already tested for the canonical path. Regression risk is bounded by adding parity tests that assert `validate`/`view`/the main-spec validator agree with their canonical counterparts.

## Issues addressed

- [#1182](https://github.com/Fission-AI/OpenSpec/issues/1182) — `openspec validate` cannot resolve changes in a workspace planning home (`status`/`instructions`/`new` can).
- [#1202](https://github.com/Fission-AI/OpenSpec/issues/1202) — `openspec view` does not detect nested/glob `tasks.md`, classifying complete changes as `Draft`.
- [#1156](https://github.com/Fission-AI/OpenSpec/issues/1156) — the 1.4.0 SHALL/MUST body-keyword hint applies to change deltas but not main specs.
