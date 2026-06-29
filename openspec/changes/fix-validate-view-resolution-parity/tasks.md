# Tasks

## 1. #1182 — validate resolves changes like status (membership gate)

- [ ] 1.1 Reproduce at HEAD: `openspec new change X` (creates dir + `.openspec.yaml`, no `proposal.md`); confirm `status --change X` resolves it but `validate X` prints `Unknown item`.
- [ ] 1.2 In `src/commands/validate.ts`, replace the `getActiveChangeIds` membership gate (line 120) for change resolution with directory-existence resolution mirroring `validateChangeExists` (`src/commands/workflow/shared.ts:168-170`); keep `getSpecIds` as the spec predicate.
- [ ] 1.3 Apply the same directory-existence rule to bulk enumeration (`validate --all` / `--changes`, line 238) so proposal-less changes are not silently skipped.
- [ ] 1.4 Confirm correctness within a `--store`-selected root (resolution already shares `resolveRootForCommand`); add a store-root resolution test.
- [ ] 1.5 Preserve change/spec ambiguity and `--type` override behavior; reconcile the directory-existence change predicate with the spec predicate.
- [ ] 1.6 Sibling `src/commands/show.ts:81,115,121` shares the `getActiveChangeIds` gate — fold it onto the same resolution or record an explicit out-of-scope note with rationale.
- [ ] 1.7 Tests: proposal-less change resolves (targeted + bulk); store change resolves; ambiguity/`--type` unchanged; changes with `proposal.md` byte-identical.

## 2. #1182b — nested multi-area delta discovery

- [ ] 2.1 Reproduce: a resolved change with deltas at `specs/<area>/<capability>/spec.md` reports "No delta sections found".
- [ ] 2.2 Extend delta discovery in `src/core/validation/validator.ts` `validateChangeDeltaSpecs` (lines 115-138) to recurse the nested `specs/**` layout (the spec-driven specs glob is `specs/**/*.md`).
- [ ] 2.3 Tests: nested-layout change discovers and validates its deltas; single-level layout unchanged.

## 3. #1202 — task progress through the tracked-tasks glob (view + archive + list)

- [ ] 3.1 Reproduce: schema with tracked-tasks glob `**/tasks.md`; a change with `backend/tasks.md` + `frontend/tasks.md`; confirm `status` shows complete while `view` shows `Draft` and `archive` would let it archive unfinished.
- [ ] 3.2 In `src/utils/task-progress.ts`, change `getTaskProgressForChange` to resolve `tasks.md` via `resolveArtifactOutputs(changeDir, tracks)` keyed off the schema `apply.tracks` glob (`src/core/artifact-graph/outputs.ts:17`, returns a de-duped path list); aggregate completed/total checkbox counts across all matches.
- [ ] 3.3 Identify the tracked-tasks artifact via `apply.tracks` (`src/core/artifact-graph/types.ts:18`), NOT the literal artifact id `tasks`, so custom schemas resolve.
- [ ] 3.4 Preserve the no-schema / no-tracked-artifact fallback (single top-level `tasks.md`) and the swallowed-missing-file behavior.
- [ ] 3.5 Update all four call sites for the new signature: `src/core/view.ts:100`, `src/core/list.ts:112`, `src/core/archive.ts:342`, `src/core/archive.ts:540`.
- [ ] 3.6 Fold the independent second copy in `src/commands/change.ts:111,164` (its own `countTasks`) onto the shared helper.
- [ ] 3.7 Tests: nested-glob change aggregates and is not `Draft`; `apply.tracks`-named artifact resolves; resolution scoped to the change dir (archive/ and sibling changes excluded); no double-count; single-file and no-schema unchanged; zero-match stays Draft.

## 4. #1202 — archive incomplete-task gate (data safety)

- [ ] 4.1 Confirm `src/core/archive.ts:342,540` feed the incomplete-task gate (`archive.ts:348-353`).
- [ ] 4.2 With the shared-helper fix in place, verify the gate sees nested/glob tasks.
- [ ] 4.3 Tests: a glob-tasks change with unchecked tasks is blocked (or requires explicit override); gate accounting equals `status`; single-file behavior unchanged.

## 5. #1156 — SHALL/MUST hint on main specs (header recovery + single emission)

- [ ] 5.1 Reproduce: a main spec requirement with SHALL/MUST in the header only emits the generic message while the equivalent delta emits the targeted hint.
- [ ] 5.2 Recover the requirement header for main specs (lost at `src/core/parsers/markdown-parser.ts:220-226`) by reusing the header-preserving parser `src/core/parsers/requirement-blocks.ts` (header+body pairs), so the header-only case is detectable.
- [ ] 5.3 In `src/core/validation/validator.ts` `applySpecRules` (lines 290-329), run `containsShallOrMust` + `buildMissingShallOrMustMessage` (lines 443-463) on the recovered header/body and emit the targeted hint for the header-only case.
- [ ] 5.4 Relax the Zod refine (`src/core/schemas/base.schema.ts:11-14`) so the header-only case is owned solely by the imperative hint (no duplicate generic error), while a requirement missing the keyword in both header and body still fails generically.
- [ ] 5.5 Pin the main-spec message: same actionable sentence as the delta path ("... must contain SHALL or MUST in the requirement body, not only in the header. Move the SHALL/MUST statement to the line immediately after the \"### Requirement: ...\" header."), with a main-spec-appropriate prefix (no `ADDED`/`MODIFIED`). Keep the delta-path message string unchanged.
- [ ] 5.6 Tests: header-only main spec → actionable sentence (byte-identical to delta); exactly one issue; no-keyword-anywhere still errors; body-keyword not flagged; lowercase `shall` does not trigger (matches `\b(SHALL|MUST)\b`); parity across `validate <spec>`, `--all`, JSON, `spec validate`, and rebuilt-spec validation (`validateSpecContent`).

## 6. Parity guard and verification

- [ ] 6.1 Add the cross-command parity assertions from design Decision 7 as regression tests (validate↔status resolution; view/list/archive↔status task counts; main-spec↔delta hint).
- [ ] 6.2 Run `openspec validate fix-validate-view-resolution-parity --strict` and the full test suite; confirm no behavior change on the canonical paths and the documented unchanged cases.
