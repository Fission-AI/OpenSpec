# Tasks

## 1. #1182 — validate resolves workspace planning homes

- [ ] 1.1 Reproduce: create a managed workspace planning home, add a change with `--schema workspace-planning`, confirm `status --change <name>` resolves it but `validate <name>` prints `Unknown item`.
- [ ] 1.2 In `src/commands/validate.ts`, resolve the named item through the shared `planning-home` resolution (`resolveCurrentPlanningHomeSync` / `getChangeDir` in `src/core/planning-home.ts`) before falling back to repo discovery, mirroring `src/commands/workflow/status.ts`.
- [ ] 1.3 Preserve repo-home not-found, ambiguity, and `--type` override behavior unchanged.
- [ ] 1.4 Tests: a workspace-home change resolved by `status` is also resolved by `validate` (no `Unknown item`); repo-home behavior is byte-identical.

## 2. #1202 — view counts tasks through the schema glob

- [ ] 2.1 Reproduce: project-local schema with `tasks` glob `**/tasks.md`; a change with `backend/tasks.md` + `frontend/tasks.md`; confirm `status` shows complete while `view` shows `Draft`.
- [ ] 2.2 In `src/utils/task-progress.ts`, change `getTaskProgressForChange` to resolve `tasks.md` via the schema `tasks` artifact output glob instead of the hardcoded `path.join(changesDir, changeName, 'tasks.md')`; aggregate completed/total checkbox counts across all matches.
- [ ] 2.3 Confirm `src/core/view.ts:100` caller passes through the resolved counts; keep the single-file path as the one-match degenerate case.
- [ ] 2.4 Tests: nested-glob change aggregates both files and is not mislabeled `Draft`; `view` counts equal `status` counts; single-file `tasks.md` unchanged.

## 3. #1156 — SHALL/MUST hint on main specs

- [ ] 3.1 Reproduce: a main spec requirement with SHALL/MUST in the header only emits the generic message while the equivalent delta emits the targeted hint.
- [ ] 3.2 In `src/core/validation/validator.ts`, apply the header-only-keyword detection (`containsShallOrMust` + `buildMissingShallOrMustMessage`) on the main-spec requirement path so it no longer falls through to the generic `REQUIREMENT_NO_SHALL` constant (`src/core/schemas/base.schema.ts:13`) when the keyword is in the header only.
- [ ] 3.3 Keep the delta-path message string identical (snapshot-stable).
- [ ] 3.4 Tests: header-only keyword in a main spec yields the targeted hint; main-spec and delta hints are identical for the same mistake; a requirement with no keyword at all still reports the existing required-keyword error.

## 4. Parity guard and verification

- [ ] 4.1 Add the cross-command parity assertions from design Decision 3 as regression tests.
- [ ] 4.2 Run `openspec validate fix-validate-view-resolution-parity --strict` and the full test suite; confirm no behavior change on the canonical paths.
