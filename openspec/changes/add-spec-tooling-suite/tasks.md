# Tasks: spec tooling on the merge baseline — `unarchive` + `format` + `diff` + `check`

> Builds on [add-deterministic-spec-sync (#1279)](https://github.com/Fission-AI/OpenSpec/pull/1279): the merge engine, applied-delta baseline (pre-image + digest + provenance), shared `src/core/spec-canonical.ts`, and `sync --check`. **Merge #1279 first.** Phases are independently testable: Phase 1 (`unarchive`) needs only the baseline + inverse; Phase 2 (`format`) reuses the canonicalizer; Phase 3 (`diff`) reuses provenance; Phase 4 (`check`) composes `sync --check` + `format --check` + `validate`. Cross-platform concerns (`path.join`, Windows `moveDirectory`, newline-normalized digests) are called out per [openspec/config.yaml](../../config.yaml).

## 0. Prerequisite wiring (from #1279)

- [ ] 0.1 Add the inverse merge in `specs-apply.ts`: delta-inversion for ADDED (remove by name) and RENAMED (rename TO→FROM, rewriting the header line); pre-image restore for all ops when a baseline exists. No change to forward behavior. (This is the reverse half of the engine #1279 records the baseline for.)
- [ ] 0.2 Confirm the baseline read API from #1279 exposes pre-image, applied-result digest, and provenance per affected spec; rebase on its final shape.

## 1. `openspec unarchive` (reverse, built on the baseline)

- [ ] 1.1 Create `src/core/unarchive.ts` `UnarchiveCommand` (human + `--json`, blocked-error → diagnostic).
- [ ] 1.2 Resolver: bare `<name>` or full archived id; treat prefix as opaque up to `<name>` (strip `YYYY-MM-DD-`; tolerate `NNN-`/ISO/configurable, #409/#787/#1192); reuse `getArchivedChangesData()` (#399). Ambiguity → interactive prompt (most-recent first, never auto-pick) / `--json` error with candidates.
- [ ] 1.3 Reverse from baseline: restore each affected spec's pre-image (rewrite modified, recreate deleted, delete archive-created), under the drift guard (current content vs baseline applied-result digest); on drift, refuse and direct to `--keep-specs`.
- [ ] 1.4 Destination-collision guard (`changes/<name>/` exists → abort, no overwrite). Atomicity: stage + validate first; commit order restore specs → move folder (`moveDirectory`, Windows fallback); on failure *"Abort. No files were changed."*, rolling specs back from the baseline if the move fails. (design Decision 7)
- [ ] 1.5 `--keep-specs` (with hidden `--skip-specs` alias): pure folder move, no spec work, no drift/reversal checks. (design Decision 8)
- [ ] 1.6 Pre-baseline degradation, all-or-nothing (design Decision 9): reverse by delta-inversion iff every op is ADDED/RENAMED; if any MODIFIED/REMOVED, refuse the whole spec reversal naming the un-restorable requirements and directing to `--keep-specs`.
- [ ] 1.7 Register `unarchive [change-name]` in `src/cli/index.ts` (`--keep-specs`/`--skip-specs`, `-y/--yes`, `--no-validate`, `--json`, `--store`).
- [ ] 1.8 Tests: byte-exact archive→unarchive round-trip for ADD/MODIFY/REMOVE/RENAME/create; drift refusal (no writes); destination collision abort; `--keep-specs` leaves `specs/` untouched; pre-baseline all-or-nothing; atomic abort leaves zero partial state; Windows move path; `--json` blocked-path diagnostics.

## 2. `openspec format` — the formatter (reuses the #1279 canonicalizer)

- [ ] 2.1 Create `src/core/format.ts` `FormatCommand` (human + `--json`); default/`--fix` rewrites targets via `spec-canonical.ts`; `--check` is read-only.
- [ ] 2.2 Target resolution: no target → all main specs + active-change delta files; explicit path → just that file/dir. Handle both spec and delta formats.
- [ ] 2.3 `--check`: list non-canonical files, exit non-zero, write nothing; default/`--fix`: write canonical form.
- [ ] 2.4 Register `format [target]` in `src/cli/index.ts` (`--check`, `--fix`, `--json`), mirroring archive's shape. No skill (pure code).
- [ ] 2.5 Incremental: reuse the baseline digest skip (design Decision 13, #1279) so `--check` only re-reads changed files; skip never changes the verdict.
- [ ] 2.6 Tests: determinism (same input → same bytes; CRLF/LF; Windows); idempotency (`format(format(x))==format(x)`); **behavior-preserving** (`parse-before==parse-after`; requirement/scenario order and prose unchanged); **shared-canonicalizer invariant** — `sync`/`archive` output passes `format --check`; `--check` exit codes; `--json` shape.

## 3. `openspec diff` — spec-aware diff driver (consumes #1279 provenance)

- [ ] 3.1 Create `src/core/diff.ts` `DiffCommand` (human + `--json`, `--base <ref>`): render requirement-level spec/delta changes; resolve provenance from the applied-delta baseline and rationale from the originating change's `proposal.md`.
- [ ] 3.2 Annotate each changed requirement with originating change + rationale reference; when a change is unattributable (no provenance, e.g. pre-baseline), show it honestly without inventing rationale.
- [ ] 3.3 Deterministic rendering: pure function of git diff + provenance + proposal text; byte-identical across runs/platforms; no inference.
- [ ] 3.4 Git diff driver integration: provide the renderer in a form usable as a git `diff`/`textconv` driver, plus a documented opt-in `.gitattributes` snippet for spec paths. Never modify the user's git config automatically.
- [ ] 3.5 Register `diff [target]` in `src/cli/index.ts` (`--base`, `--json`). No skill (pure code).
- [ ] 3.6 Tests: deterministic output (repeat/CRLF/Windows); annotation resolves from proposal + provenance; unattributable change shown without invented rationale; no git-config mutation without opt-in; `--json` shape.

## 4. `openspec check` — the unified gate (pre-commit + CI)

- [ ] 4.1 Create `src/core/check.ts` `CheckCommand` (`--fix`, `--all`, `--json`, incremental): compose `format --check`, `sync --check`, and `validate` into one run with a single exit-code/JSON contract; `--fix` runs `format --fix` + `sync --fix` and never invents non-mechanical resolutions (cross-change conflicts / un-appliable deltas still fail).
- [ ] 4.2 Register `check` in `src/cli/index.ts` (`--fix`, `--all`, `--install-hook`, `--json`).
- [ ] 4.3 Hook installer: `openspec check --install-hook` installs a pre-commit hook that runs `openspec check`; runner-agnostic; composes with an existing hook; never installs automatically or alters git config without the explicit flag.
- [ ] 4.4 CI template: add a committed, copy-paste CI step (e.g. a GitHub Actions job) that runs `openspec check` as a drift gate — no model, no API keys.
- [ ] 4.5 Assert the pre-commit/CI symmetry: the same repo state yields the same `openspec check` verdict whether invoked from the hook or the CI step (one binary, one contract).
- [ ] 4.6 Document the **opt-in git diff driver** registration for `openspec diff` (the `.gitattributes` snippet for spec/delta paths), making clear OpenSpec never alters git config without consent (design Decision 15).
- [ ] 4.7 Tests: `check` aggregates the sub-gates and exit codes; `--fix` remediates mechanical drift but still fails on conflicts; `--all` runs cross-change checks; incremental skip never changes the verdict; hook installer composes with an existing hook and is never automatic; `--json` shape.

## 5. Skill + docs

- [ ] 5.1 Create `src/core/templates/workflows/unarchive-change.ts` (`getUnarchiveChangeSkillTemplate()` + `getOpsxUnarchiveCommandTemplate()`) delegating to `openspec unarchive`; surface the CLI's drift refusal and `--keep-specs` option verbatim; never hand-move folders or hand-edit specs.
- [ ] 5.2 Export from `skill-templates.ts`; add `unarchive` to `ALL_WORKFLOWS` ([src/core/profiles.ts:19](../../../src/core/profiles.ts)) and `WORKFLOW_TO_SKILL_DIR` ([src/core/init.ts:65](../../../src/core/init.ts)); **not** to `CORE_WORKFLOWS` (#913/#762).
- [ ] 5.3 Tests: template snapshot asserts `/opsx:unarchive` calls the CLI and contains no manual merge/move instructions (anti-#863 guard).
- [ ] 5.4 `docs/opsx.md` + CLI docs: add `/opsx:unarchive`; document `openspec unarchive`, `openspec format`, `openspec diff`, and `openspec check` with their flags (and that `format`/`diff`/`check` need no agent/skill); document running `check` as a pre-commit hook and in CI.

## 6. End-to-end verification

- [ ] 6.1 E2E round-trip: `archive` (with #1279's baseline) then `unarchive` → `specs/` byte-identical to pre-archive, folder back under `changes/<name>/`.
- [ ] 6.2 E2E stacked drift: change A MODIFIES req X and is archived; a second change re-MODIFIES X and is archived; `unarchive A` refuses spec reversal; `unarchive A --keep-specs` succeeds untouched.
- [ ] 6.3 E2E formatter: mangle a spec's whitespace → `format --check` fails → `format` fixes it → `--check` passes; and `sync`/`archive` output passes `format --check` unchanged (shared-canonicalizer invariant).
- [ ] 6.4 E2E diff: edit a change's delta and proposal → `openspec diff <change>` shows the requirement change annotated with the proposal's rationale; a synced spec change is annotated with the originating change via provenance; a pre-baseline edit is shown without invented rationale.
- [ ] 6.5 E2E check gate: introduce drift (un-synced delta + non-canonical whitespace) → `openspec check` fails naming both gates → `openspec check --fix` remediates → `check` passes; then introduce a cross-change conflict → `check --all` still fails (not auto-fixable); confirm identical verdict whether run via the installed hook or the CI step.
- [ ] 6.6 Validation: `openspec validate add-spec-tooling-suite --strict` passes; `openspec status` shows artifacts complete.
- [ ] 6.7 Run the suite on macOS, Linux, and Windows CI.
