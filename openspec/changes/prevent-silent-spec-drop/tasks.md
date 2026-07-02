## 1. Deterministic CLI gate (the guarantee — do first)

### 1a. Capability extraction
- [x] 1.1 Add `extractDeclaredCapabilities(proposalMarkdown)` to `src/core/parsers/change-parser.ts` per the contract: scope to `## Capabilities` → `### New/Modified Capabilities` **and** the bold-label form (`**New Capabilities**:`); id = first inline-code span of a top-level `- ` bullet; ignore `None`/`_None_`/HTML-comment/empty; return non-kebab ids as a malformed-capability warning (do NOT silently drop). Pure function, no FS access
- [x] 1.2 Unit tests: heading form + bold-label form, first-inline-code rule with backticks in description, paths/globs ignored, None/comment/empty, missing section, non-kebab id → warning (not dropped), CRLF

### 1b. Schema-aware validation
- [x] 1.3 Add a helper `schemaProducesDeltaSpecs(schema)` — true iff any artifact's `generates` glob writes under `specs/` (drive off the resolved artifact graph, not a hardcoded schema name); archive resolves the schema via `.openspec.yaml`/`loadChangeContext`
- [x] 1.4 Add `validateChangeCapabilityCoverage(changeDir)` to `src/core/validation/validator.ts`: only when the schema produces delta specs; one ERROR per declared capability with no `specs/<id>/spec.md` present, message names the capability + expected path **and explains the id-must-equal-spec-folder-name rule** (for Modified capabilities, the existing `openspec/specs/<id>/` folder); presence-only (let delta validation handle non-delta format); one-directional; fail-open on unparseable proposal
- [x] 1.5 In `src/commands/validate.ts` single (`:186`) and bulk (`:252`): resolve the change schema and run BOTH `validateChangeDeltaSpecs` (the existing `CHANGE_NO_DELTAS` rule, currently unconditional) and the new coverage **only when `schemaProducesDeltaSpecs(schema)` is true**, so a proposal-only schema no longer fails `validate` for missing deltas (#997). **Memoize `schemaProducesDeltaSpecs` per schema name within the run** (not per change — the bulk loop must not re-`readdir` schemas per change). Preserve exit-code/JSON semantics; "indeterminate" = resolution throws (fail-safe to requiring deltas), distinct from absent metadata which defaults to `spec-driven`

### 1c. Archive parity (same shared gate)
- [x] 1.6 In `src/core/archive.ts`, replace the `if (hasDeltaSpecs)` gate (~lines 263-297) with `if (!options.skipSpecs && schemaProducesDeltaSpecs(schema))`, using the SAME helper as validate; run `validateChangeDeltaSpecs` + coverage. Confirm `--yes` does not bypass this gate (only confirmation prompts)
- [x] 1.7 Route failures through the existing `hasValidationErrors → ArchiveBlockedError` (JSON) / `return null` + exit-1 (text) path; remove the dead `hasDeltaSpecs` probe
- [x] 1.8 Confirm the format-drop case (present non-delta spec) and total/partial drops all block; confirm a proposal-only schema (#997) still archives
- [x] 1.8b Run the same proposal validation as `openspec validate` (`validateChangeProposal`) in archive and block on ERROR-level proposal issues in BOTH text and `--json` modes, so archive never syncs/moves a change validate rejects; warnings stay informative (review: validate/archive proposal parity)

### 1d. Apply enforcement + schema gate
- [x] 1.9 In `src/commands/workflow/instructions.ts`, set `process.exitCode = 1` when apply `state === 'blocked'` (text and JSON; payload first)
- [x] 1.10 Set `apply.requires: [specs, tasks]` in `schemas/spec-driven/schema.yaml`; update tests asserting the old `[tasks]` gate

- [x] 1.11 Structure `extractDeclaredCapabilities` so a future structured source (`provides` markers from `add-change-stacking-awareness`) can augment/replace prose parsing without changing the coverage rule — keep extraction behind a single function

## 2. Fix the loop at the source

- [x] 2.1 Harden `src/core/templates/workflows/propose.ts` and `ff-change.ts`: define loop termination as "every `apply.requires` artifact has status `done`" (read live from `openspec status`), so the loop cannot stop at `tasks.md` while `specs` is absent. The apply gate is non-transitive — the schema change (`apply.requires: [specs, tasks]`) is the deterministic lever; do NOT add `design` (it stays optional, by design)
- [x] 2.2 Verify the apply skill's existing `state: blocked` handler (`apply-change.ts:52`) now fires for missing specs via the schema gate; confirm a `design`-less change still passes apply (conditional-design preserved); adjust wording if needed

## 3. Keystone — archive skill calls the CLI (test heavily)

- [x] 3.1 Rework ALL archive templates — both `getArchiveChangeSkillTemplate` and `getOpsxArchiveCommandTemplate` in `archive-change.ts`, and both templates in `bulk-archive-change.ts` — replacing the agent-judged "assess sync state" step and the raw `mkdir`+`mv` with a single `openspec archive --json` invocation (`--yes` to suppress prompts; never `--skip-specs` or `--no-validate`)
- [x] 3.2 Handle the structured result: success summary (specs synced, totals, path) from the CLI output; on `ArchiveBlockedError`, surface the diagnostic and guide the user to create/fix the delta spec, then re-run and trust the exit; never self-certify
- [x] 3.3 Ensure `--skip-specs`/`--no-validate` are only ever used on explicit user intent, never to bypass a block
- [x] 3.4 Add a template-parity assertion for EACH of the four templates that it invokes `openspec archive` and contains no raw `mv`

## 4. Recovery audit (detection, not regeneration)

- [x] 4.1 Add a deterministic audit (the `cli-validate` "Archived Spec-Drift Audit" requirement) that flags archived changes whose declared capabilities have no corresponding `openspec/specs/<id>/spec.md` (surface via `openspec validate`, e.g. an `--archived`/audit mode). Forward-only: parse archived proposals with the same contract; note that pre-contract archives are not auditable rather than implying completeness
- [x] 4.2 Document that reconstructing lost spec content is agent-assisted and out of scope; the audit points at what to rebuild (fold the note into the audit help text / changeset)

## 5. Delta-vs-full-spec clarity (coherence)

- [x] 5.1 Tighten the `specs` artifact instruction (schema) and `apply-change.ts`/`sync-specs.ts` wording: a delta spec lives at `changes/<name>/specs/<cap>/spec.md` and uses `## ADDED/MODIFIED/REMOVED/RENAMED Requirements`, never `## Purpose`/`## Requirements`
- [x] 5.2 Remove any skill language implying the agent decides "no sync needed"; the CLI decides
- [x] 5.3 Tighten the **proposal** artifact instruction (schema) so `## Capabilities` uses `### New Capabilities` / `### Modified Capabilities` headings with kebab-case ids matching the spec folder name (the shape the coverage parser enforces)

## 6. Tests

- [x] 6.1 Archive total drop: no `specs/` → `CHANGE_NO_DELTAS`, non-zero, nothing moved
- [x] 6.2 Archive format drop: present non-delta `spec.md` → "No delta sections found", blocked
- [x] 6.3 Archive partial drop: declares `a`,`b`; only `specs/a` → coverage error for `b`, blocked
- [x] 6.4 Schema-aware: a **project-local proposal-only fixture schema** (no `specs` artifact — `spec-driven` can't test this) with no specs → archives (no block) (#997)
- [x] 6.5 Covered + valid → archives and syncs (no regression)
- [x] 6.6 `--skip-specs` bypasses; `--no-validate` (+ `--yes`) bypasses (human escape hatches)
- [x] 6.7 `--yes` alone (no `--skip-specs`/`--no-validate`) on a no-delta spec-driven change → still blocked with `CHANGE_NO_DELTAS`, non-zero, nothing moved
- [x] 6.8 Parity: a change `openspec validate` rejects (total/partial/format) is blocked by `openspec archive`
- [x] 6.9 Validate schema-aware: `openspec validate` on the proposal-only fixture with no specs → passes (no `CHANGE_NO_DELTAS`); on a spec-driven change with no specs → fails with `CHANGE_NO_DELTAS`; both single and bulk
- [x] 6.10 Unparseable/malformed `## Capabilities` → coverage fails open (no crash, no false missing); non-kebab id → warning (not dropped); bold-label form → extracted; resolution-throws → delta validation still applied (fail-safe)
- [x] 6.11 All four archive templates call `openspec archive` and contain no raw `mv` (parity assertion per template)
- [x] 6.12 Apply: blocked apply exits non-zero (text + JSON); spec-driven `tasks`-only reports `specs` missing; a `design`-less change still passes apply
- [x] 6.13 Capability deletion/rename: change with only `## REMOVED Requirements` under the existing folder → coverage passes; whole-capability deletion → requires explicit `--skip-specs`
- [x] 6.14 Archived-drift audit: archived change with an un-synced declared capability → flagged; pre-contract archive → not falsely flagged
- [x] 6.15 Extraction determinism fixtures; cross-platform `path.join()`
- [x] 6.16 E2E regression `test/cli-e2e/issue-1212-spec-drop.test.ts`: reproduces #1212 (apply blocks, archive refuses, audit detects) and asserts #1250 behaviors (apply exit 1 + spec-driven hint) against the real CLI
- [x] 6.17 Proposal parity: malformed proposal (missing `## Why`) + valid delta → archive blocked in text AND `--json` modes (`archive_validation_failed`, nothing moved); proposal-only schema + malformed proposal → blocked; valid proposals unaffected

## 7. Release

- [x] 7.1 Changeset describing the behavior change (archive now blocks total/partial/format spec drops for schemas with a `specs` artifact; archive skill uses the CLI; `--skip-specs` for intentional spec-less changes)
