## Context

Completion in OpenSpec is judged by **file existence** (`artifact-graph/state.ts`), and the workflow **skills make correctness-critical decisions by agent judgment**. The result is that a spec-driven change can finish with `openspec/specs/` silently stale. A forensic read of the cluster (below) shows four reinforcing layers; this design fixes each at the most deterministic layer available.

### Evidence that prompt-level reasoning is the fault

- PR #1250's author **could not reproduce** #1212 on a greenfield project — propose *did* create delta specs there. The failure is **agent- and path-dependent**, i.e. non-deterministic. #1250's reviewer (alfred-openspec) approved the apply fix but **explicitly required an archive-side guard as the "last line of defense"** and deferred it. This change is that guard.
- The archive skill (`archive-change.ts`) and its spec (`opsx-archive-skill`) **reimplement archive agent-side**: assess sync "by judgment," optionally call a separate `openspec-sync-specs` skill, then `mkdir`+`mv`. `grep "openspec archive" archive-change.ts` → no match. Filed as #656 and #863.
- The Discord report is the **format-drop case**: `specs/<cap>/spec.md` was written as a full spec; `archive.ts:274`'s `/^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements/` regex did not match, so `hasDeltaSpecs=false` and sync was skipped. The agent's "no delta specs to sync" was the skill working as written (`archive-change.ts:60`).

### The validate/archive inconsistency (the seam)

`validateChangeDeltaSpecs` (`validator.ts:115`) already errors when `totalDeltas === 0` (`CHANGE_NO_DELTAS`) and when a present spec file has no delta headers (`missingHeaderSpecs` → "No delta sections found", `validator.ts:264`). `openspec validate` calls it unconditionally (`validate.ts:186`); `openspec archive` calls it only inside `if (hasDeltaSpecs)` (`archive.ts:282`). So the validator is *already correct* for total drop and the format-drop case — archive just never reaches it.

## Goals / Non-Goals

**Goals**
- One deterministic definition of completeness, enforced in the CLI and reachable by agents.
- Block total, partial, and format spec drops before archive moves anything.
- Skills delegate the critical action (archive + sync) and the loop termination to the CLI/schema, not agent judgment.
- Do not force deltas on schemas that legitimately have none (#997).
- Detect already-accumulated drift so it is recoverable.

**Non-Goals**
- Authoring spec content, or regenerating spec content for changes already archived without it (agent-assisted; out of scope — we detect, we do not auto-write).
- Merge-time scenario loss when two changes modify the same requirement (#1246/#1112).
- Flagging delivered-but-undeclared specs (not data loss).

## Decisions

### Decision 1 (PRIMARY): fix the loop in the schema, then harden the skill

`spec-driven` `apply.requires: [specs, tasks]`. The apply gate is a **non-transitive presence check**: `generateApplyInstructions` iterates `apply.requires` directly (`instructions.ts` ~359) and checks each named artifact's file existence — it does **not** walk transitive `requires`. That is exactly why the bug exists: under today's `apply.requires: [tasks]`, a change with `tasks.md` but no `specs/` is reported *ready*, because only `tasks` is checked and `tasks.md` exists. Adding `specs` to `apply.requires` is therefore the precise, deterministic fix — now `specs` is checked directly and a specs-less change is blocked. The apply skill's existing `state: blocked` handler (`apply-change.ts:52`) then fires. This is the fix #1212's reporter calls "Primary" and #1250 implemented for apply.

This non-transitivity also resolves the conditional-`design` story: `design` is deliberately **not** in `apply.requires`, so a change without `design.md` stays apply-ready — "skip design for simple changes" keeps working precisely because the gate is non-transitive. We do **not** add `design` to `apply.requires`.

The propose/ff skill loop already re-runs `openspec status` and continues until every `apply.requires` artifact is `done`; with `specs` now in that set, the loop cannot stop while `specs` is absent. The skill-template hardening is therefore narrow and concrete: **define termination as "every `apply.requires` artifact has status `done`"** (reading the live `applyRequires`), and never treat `tasks.md`'s existence alone as apply-ready. The schema change is the deterministic guarantee; the skill change just removes any lingering "stop at tasks" shortcut.

Note: the `Artifact` schema (`artifact-graph/types.ts`) has no `optional` field, but that is irrelevant to the apply gate (which is non-transitive over `apply.requires`, not "all artifacts"). Earlier framing that called every artifact "transitively required, nothing to skip" was wrong — corrected here.

### Decision 2 (KEYSTONE): the archive skill calls the CLI

Rework the archive workflow so the skill:

1. Resolves the change, then runs `openspec archive --json` (and `--yes` only to suppress *interactive* prompts — never `--skip-specs` or `--no-validate`, both of which are silent-drop bypasses).
2. On success, reports the structured result (specs synced, totals, archive path) **from the CLI's output** — it does not self-certify "specs look synced" and proceed.
3. On `ArchiveBlockedError` (missing/partial/non-delta specs, incomplete tasks, etc.), surfaces the diagnostic and **helps the user create or fix the delta spec**, then re-runs `openspec archive` and **trusts its exit** — it does not bypass with `--skip-specs`/`--no-validate`.

**All archive surfaces must be reworked, not just one (this was a real gap):** `archive-change.ts` exports **two** templates — `getArchiveChangeSkillTemplate` (the `openspec-archive-change` skill) *and* `getOpsxArchiveCommandTemplate` (the `/opsx:archive` command) — and **both** contain the judgment-based sync step and a raw `mkdir`+`mv`. `bulk-archive-change.ts` contains the **same raw `mv`** in its two templates. If any of these is left calling `mv` directly, `/opsx:archive` or the bulk path still bypasses the CLI and the keystone is only half-applied (#863 persists). All four templates are in scope, each with a template-parity assertion.

This deletes the agent-judged "assess sync state / proceed without sync" step and the raw `mv`. The CLI's deterministic `findSpecUpdates → buildUpdatedSpec → writeUpdatedSpec` becomes the only archive path. Without this, Decisions 3–5 never execute for agents — which is why every prior prompt-only fix (#1268/#1271/#1241/#1233) failed. (Note: `--no-validate` remains a *human* escape hatch on the CLI; the skill is forbidden from using it, and the recovery audit in Decision 6 flags any change archived with `specsUpdated: false`.)

### Decision 3: the schema-aware delta gate applies to BOTH `validate` and `archive`

The delta requirement (`CHANGE_NO_DELTAS` + coverage) is gated on a single shared predicate, `schemaProducesDeltaSpecs(schema)` — true iff *any artifact's `generates` glob writes under `specs/`* (in `spec-driven`, the `specs` artifact with `generates: specs/**/*.md`). Not a hardcoded schema name. This predicate is applied in **both** commands so they agree by construction:

- **`archive`** — replace `if (hasDeltaSpecs)` with `if (!options.skipSpecs && schemaProducesDeltaSpecs(schema))`, then run `validateChangeDeltaSpecs` + coverage; failures flow through the existing `hasValidationErrors → ArchiveBlockedError` (JSON) / `return null` + exit-1 (text) path (`archive.ts:299-310`).
- **`validate`** — on current `main`, `src/commands/validate.ts` calls `validateChangeDeltaSpecs(changeDir)` **unconditionally** in single (`:186`) and bulk (`:252`) validation, and that emits `CHANGE_NO_DELTAS` whenever there is no `specs/`. So a proposal-only schema would *fail* `validate` even though `archive` now lets it through — re-introducing the very validate/archive disagreement this change exists to remove (raised by review, the #997 gap). Fix: `validate` resolves the change's schema and runs delta-spec validation (and coverage) **only when `schemaProducesDeltaSpecs(schema)` is true**.

Result, by construction:
- `spec-driven` (has a `specs` artifact) + no specs → `CHANGE_NO_DELTAS` in **both** `validate` and `archive`.
- proposal-only (no `specs` artifact) + no specs → **passes both**.

Both commands resolve the schema the same way the instructions/status commands already do — from `.openspec.yaml` via `loadChangeContext`/`resolveSchema` — so no new plumbing. **Fail-safe:** "indeterminate" means schema *resolution throws* (e.g. `SchemaLoadError` on a malformed project schema), **not** "metadata absent" — a change with no `.openspec.yaml` already resolves to `spec-driven` by default (`change-metadata.ts`), so it correctly gets the strict gate. When resolution throws, default to `schemaProducesDeltaSpecs = true` (require deltas), preserving today's strict behavior rather than silently relaxing it.

**Performance:** `schemaProducesDeltaSpecs` must be **memoized by schema name within a command run** (the schema set is effectively constant). `listSchemas`/`resolveSchema` do ~20 `readdirSync`/`existsSync` calls each; recomputing per change in the bulk `validate` loop (`validate.ts:248-256`, concurrency 6) would be a real regression. Resolve once per distinct schema, not once per change.

This single change blocks all three drop modes:
- **Total** → `CHANGE_NO_DELTAS`.
- **Format** → `missingHeaderSpecs` "No delta sections found" (already implemented; now reached).
- **Partial** → Decision 4.

### Decision 4: deterministic, schema-aware capability coverage

`validateChangeCapabilityCoverage(changeDir)` reads `proposal.md`, extracts declared capabilities, and requires each to have `specs/<id>/spec.md` **present**. Separation of concerns: coverage checks *presence*; delta well-formedness (including the format-drop case) is left to `validateChangeDeltaSpecs`, so a present-but-non-delta file yields one precise "No delta sections found" error, not two.

#### The deterministic parsing contract (`extractDeclaredCapabilities`)

Implemented on `ChangeParser`, reusing its section + code-fence machinery. Pure function of the proposal text:

1. Locate the top-level `## Capabilities` section (bounded by the next `## `). Absent → no declarations (back-compatible with the 65/93 proposals without it).
2. Within it, only `### New Capabilities` and `### Modified Capabilities` subsections.
3. A capability id is the **first inline-code span** (`` `id` ``) of a top-level `- ` bullet there.
4. A capability id is the first inline-code span matching `^[a-z0-9]+(?:-[a-z0-9]+)*$`. The schema already mandates kebab-case ids; a bullet whose inline-code token is non-kebab (uppercase, non-ASCII) is **reported as a malformed-capability warning**, not silently dropped — silent dropping would let a partial drop survive vacuously (raised by review, m3). The author fixes the casing or the parser would otherwise miss it.
5. `None` / `_None_` / HTML-comment / empty subsections declare nothing.

The contract keys on `### New Capabilities` / `### Modified Capabilities` **headings**. All 28 declaring proposals in the corpus use that heading form, but the schema's proposal-template instruction only describes **bold-label** form (`**New Capabilities**:`). To make the parser's contract enforceable rather than a silent guess: (a) Decision 7 tightens the proposal-template instruction to **mandate** the `## Capabilities` + `### New/Modified Capabilities` heading shape; and (b) the parser **also accepts the bold-label form** as a fallback, so a well-formed proposal under the documented instruction is never under-extracted. Without both, a future proposal could declare capabilities the parser doesn't see → coverage passes vacuously.

Coverage applies only when the schema graph produces delta specs (same gate as Decision 3).

**Declared id vs spec folder name (M1):** for a Modified capability the schema instructs authors to "use the existing spec folder name." Coverage therefore requires the declared id to equal the change's delta-spec folder (`specs/<id>/`), which `findSpecUpdates` also keys on — so they stay aligned. When they diverge (proposal names a capability differently than its on-disk folder), coverage errors; the error message **states the rule and suggests aligning the `## Capabilities` id to the existing spec folder name** rather than just "missing." This is intentional (it is a real inconsistency) but must be actionable, not cryptic.

**Capability deletion / rename (M2):** removing a capability's requirements is expressed as a `## REMOVED Requirements` delta against the existing folder — that still produces `specs/<id>/spec.md`, so coverage and delta validation both pass. Deleting or renaming a whole capability/spec folder has no natural delta and is an explicit-intent operation: the **user** passes `--skip-specs` (the skill never does so on its own). This is documented and given a test scenario so the keystone skill does not deadlock on a legitimate deletion.

#### Validated against the full corpus

A prototype of this exact contract was run over all 93 in-repo proposals before finalizing: 28 declare capabilities (68 total); **zero false extractions**; **7 changes have a declared capability with no delta spec** — all genuine proposal↔spec inconsistencies (e.g. active `unify-template-generation-pipeline` declares 3 Modified capabilities, ships none). Two borderline shapes (docs/meta capabilities; naming mismatches where the spec folder differs from the declared id) are ERRORs by design — a listed-but-unspec'd capability is exactly the inconsistency a cohesive audit should surface. The fix is to align the two; the escape is the user passing `--skip-specs`.

### Decision 5: apply exit-1 (earlier guardrail)

`instructions apply` sets a non-zero exit when `state === 'blocked'` (text and JSON; JSON prints the payload first). Lets propose/fast-path loops and CI stop instead of reading a printed "Blocked" as success. Incorporates #1250.

### Decision 6: recovery is detection, not regeneration

`openspec validate --changes` already flags *active* drift once Decisions 3–4 land. Add an audit that flags **archived** changes whose declared capabilities have no corresponding `openspec/specs/<id>/spec.md` (and, equivalently, changes recorded as archived with `specsUpdated: false`), so existing silent debt (#1212's "no recovery path") is discoverable. This audit is a **new, specced** capability (a requirement in `cli-validate`), not just prose — surfaced via `openspec validate` (e.g. an `--archived`/audit mode). Reconstructing the lost spec content from a finished implementation is agent-assisted and out of scope; the audit points the user at what to rebuild.

The audit is **forward-only**: it parses archived proposals with the same `extractDeclaredCapabilities` contract, which most pre-contract archives do not satisfy. It therefore reports *detectable* drift (canonical-shape proposals) and explicitly notes that pre-contract archives are not auditable — it must not claim completeness it cannot deliver.

### Decision 7: delta-vs-full-spec clarity, and a stricter proposal-template contract (coherence)

Tighten two prompts so the parser/coverage contract is something authors actually produce: (a) the `specs` artifact instruction and the apply/archive skill text so "delta spec" is unambiguous (it lives at `changes/<name>/specs/<cap>/spec.md` and uses `## ADDED/MODIFIED/REMOVED/RENAMED Requirements`, never `## Purpose`/`## Requirements`), and the archive skill never says "no sync needed" — the CLI decides; and (b) the **proposal** artifact instruction so the `## Capabilities` section uses `### New Capabilities` / `### Modified Capabilities` headings with kebab-case ids matching the spec folder name (the shape Decision 4's parser enforces). This is the non-deterministic layer; the CLI gate is the guarantee behind it. (These prompt edits touch templates that are not separately specced as capabilities — `propose.ts`, `apply-change.ts`, `sync-specs.ts`, and the schema artifact instructions — so they are tasks without delta specs, by nature; the specced behavior lives in the CLI capabilities. `openspec-sync-specs`/`/opsx:sync` survives unchanged and is intentionally still agent-driven for the sync-without-archive intent — this change only removes archive's reliance on it.)

## Coordination with in-flight work

This change shares files and concepts with several active changes/PRs; it is designed to compose with them, not collide.

- **`unify-template-generation-pipeline`** (introduces `WorkflowManifest` + `ArtifactSyncEngine` over `src/core/templates/*`). This change edits the *content* of six workflow templates (the four archive surfaces + `propose`/`ff-change` and the clarity edits); that change restructures *how* templates are assembled. They touch the same directory and will need rebasing whichever lands first, but the concerns are orthogonal (content vs. assembly). If the manifest lands first, the archive-template rework becomes a manifest entry; if this lands first, the manifest absorbs the reworked templates. Sequence by review readiness; flag for the maintainer.
- **`add-change-stacking-awareness`** (adds structured `provides`/`requires`/`touches` change metadata + overlap warnings). Two alignments: (1) its `provides` markers are the eventual **structured** source for "what capabilities does this change declare," which Decision 4 currently parses from the `## Capabilities` prose — the coverage check should be written so it can later read `provides` when present, with prose as the fallback; (2) its "**overlap warning when active changes touch the same capability**" is the *preventive* complement to the #1246/#1252 merge-drift fix — together they cover author-time warning, merge-time correctness, and (here) missing/partial/format completeness. Document the convergence so the two efforts don't grow divergent capability-declaration models.
- **`add-artifact-regeneration-support`** (mtime staleness at `/opsx:apply` → offer to regenerate downstream artifacts). Complementary and out of scope here: it addresses *intra-change* staleness (design edited after tasks), not specs dropped at archive. It is the original "update the proposal" concept; this change does not block or duplicate it.
- **#1252 / #1246** — complementary merge-drift fix; **land #1252 first** (see proposal). This change never touches `buildUpdatedSpec`.

### Open-PR landscape for the 13 source files (verified 2026-06-29)

A scan of all open PRs against the files this change will edit found no competing implementation of the deterministic gate, but real mechanical overlap to sequence around:

- **Rebase onto these (APPROVED, in our files — likely land first):** #1186 (validate + validator: workspace/nested delta routing — re-verify coverage composes with nested delta discovery), #1151 (validator: ignore fenced code in delta specs), #1153 (apply-change template dedupe), #1252 (specs-apply.ts). Implement #1277's source edits *after* these to avoid the sharpest conflicts.
- **Fold in / supersede:** #1250 (apply exit-1 — fold in), #1271/#1241/#1233 (prompt-only archive/greenfield guidance on `archive-change.ts` — supersede).
- **Design-reconcile (same files, overlapping intent):** #977 (allow-specless-changes — reconciled via the schema-aware gate + `--skip-specs`; see proposal) and #902 (propose/ff spec discovery — compose the loop change). Both must be coordinated, not merged blindly.
- **Coordinate (independent features overlapping our templates/schema):** #1062 and #887 (config injection into apply/archive instruction templates — let #1277 define the archive template structure first, then they rebase their injection points), #844 (front-matter for archive/sync + `sync-specs.ts`), #1121/#1269 (schema.yaml prose conventions). #843 (large delta-merge rework across `change-parser.ts`/`specs-apply.ts`/`validator.ts`/`schema.yaml`) is the biggest raw overlap but is stale (Apr 2026) — flag its author to rebase after #1277.

**Implementation-sequencing takeaway:** #1277 ships as proposal docs first (dogfooded). Before the source edits land, rebase onto the APPROVED set above; the conflict surface only becomes live when the source changes. None of these alters #1277's design — they affect ordering and line-level placement only.

## Risks / Trade-offs

- **[Risk] Reworking the archive skill changes a core workflow.** → Mitigation: the CLI already supports `--json`/`--yes`/`ArchiveBlockedError`; the skill becomes simpler and strictly safer. Template-parity tests guard the change. This is the highest-value, and highest-blast-radius, part — sequence it first and test heavily.
- **[Risk] Schema-awareness mis-detects which schemas need specs.** → Mitigation: drive it off the resolved artifact graph (`specs` artifact presence), with tests for spec-driven (required) and a proposal-only schema (#997, not required).
- **[Risk] False positive on an intentionally spec-less declared capability.** → Mitigation: it doesn't belong under `## Capabilities`; remove the line or use `--skip-specs`. Bounded to capabilities the proposal itself declares.
- **[Risk] Stricter archive surprises automation.** → Mitigation: `--skip-specs` is the one-flag migration, documented in the changeset.
- **[Trade-off] One-directional coverage** leaves delivered-but-undeclared specs unflagged — accepted (not data loss).

## Migration Plan

Minor behavior change shipped with a changeset note. No data migration. `openspec archive` now blocks the same changes `openspec validate` rejects (total/partial/format), but only for schemas with a `specs` artifact. Automation archiving intentionally spec-less changes adds `--skip-specs`. The drift audit lets existing projects find pre-existing debt.

## Sequencing (for implementation)

1. Decision 3 + 4 + 5 (deterministic CLI gate) — the guarantee.
2. Decision 1 (schema + propose/ff loop) — stops the drop at the source.
3. Decision 2 (archive skill → CLI) — makes 1–5 reachable by agents; test heavily.
4. Decision 6 (audit) + Decision 7 (docs) — recovery and coherence.

## Build-readiness verification

Each load-bearing assumption was checked against current `main` (rebuilt CLI; the committed `bin` bundle was stale) before committing to build:

- **Bug reproduces on current code.** `openspec validate <no-delta>` exits 1 (`CHANGE_NO_DELTAS`); `openspec archive <no-delta> --json --yes` exits 0 with `"specsUpdated": false` and moves the change — the silent drop, confirmed post-stores-refactor.
- **The keystone interface exists.** `openspec archive` already supports `--json` / `--yes` / `--skip-specs` / `--no-validate`, returns a structured `{ archive: { change, archivedAs, path, specsUpdated }, root }` on success, and throws `ArchiveBlockedError` (machine-readable diagnostic, non-zero exit) on block. The reworked skill can consume this directly — no new CLI surface required.
- **The validator already does the hard part.** `validateChangeDeltaSpecs` emits `CHANGE_NO_DELTAS` (total) and `missingHeaderSpecs` "No delta sections found" (the format-drop case); the fix is to stop gating it behind `hasDeltaSpecs`.
- **Coverage parsing is feasible and deterministic.** `ChangeParser` already has section + code-fence parsing; the extraction contract was prototyped over all 93 in-repo proposals (zero false extractions, 7 real inconsistencies).
- **Apply gate verified non-transitive.** `generateApplyInstructions` iterates `apply.requires` directly (not transitive `requires`), so a `tasks`-only `apply.requires` lets a specs-less change read ready; adding `specs` to `apply.requires` is the precise fix, and `design` (absent from `apply.requires`) stays optional. The loop fix is well-defined and does not depend on a non-existent `optional` field.
- **Reference accuracy verified (2026-06-29).** #1250 not merged (main is `apply.requires: [tasks]`); #194 and #1268 are closed (treated as prior art, not addressed/superseded); #913 is resolved by the keystone; #164 demoted to clarity.

Residual implementation risks are captured in Risks/Trade-offs above; none are blockers.

## Open Questions

- **Greenfield ADDED-only ergonomics.** When the first change archives, the guard forces delta specs; archive then creates the main specs from ADDED deltas. Confirm the reworked archive skill makes creating ADDED deltas the obvious path, not `--skip-specs`.
- **Should the conceptual delta-vs-full-spec docs (#194/#426) be a separate docs change?** Leaning yes — keep this change's docs edits minimal and targeted, and file a focused docs follow-up.
