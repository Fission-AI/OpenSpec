# OpenSpec Parallel Delta Remediation Plan

## Problem Summary
- Active changes apply requirement-level replacements when archiving. When two changes touch the same requirement, the second archive overwrites the first and silently drops scenarios (e.g., Windsurf vs. Kilo Code slash command updates).
- The archive workflow (`src/core/archive.ts:191` and `src/core/archive.ts:501`) rebuilds main specs by replacing entire requirement blocks with the content contained in the change delta. The delta format (`src/core/parsers/requirement-blocks.ts:113`) has no notion of base versions or scenario-level operations.
- The tooling cannot detect divergence between the change author’s starting point and the live spec, so parallel development corrupts the source of truth without warning.

## Observed Failure Mode
- Change A (`add-windsurf-workflows`) adds a Windsurf scenario under `Slash Command Configuration`.
- Change B (`add-kilocode-workflows`) adds a Kilo Code scenario to the same requirement, starting from the pre-Windsurf spec.
- After Change A archives, the main spec contains both scenarios.
- When Change B archives, `buildUpdatedSpec` sees a `MODIFIED` block for `Slash Command Configuration` and replaces the requirement with the four-scenario variant shipped in that change. Because that file never learned about Windsurf, the Windsurf scenario disappears.
- There is no warning, diff, or conflict indicator—the archive completes successfully, and the source-of-truth spec now omits a shipped scenario.

## Root Causes
1. **Replace-only semantics.** `buildUpdatedSpec` performs hash-map substitution of requirement blocks and cannot merge or compare individual scenarios (`src/core/archive.ts:455`-`src/core/archive.ts:526`).
2. **Missing base fingerprint.** Changes do not persist the requirement content they were authored against, so the archive step cannot tell if the live spec diverged.
3. **Single-level granularity.** The delta language only understands requirements. Even if we introduced scenario-level parsing, we would still lose sibling edits without an accompanying merge strategy.
4. **Lack of conflict UX.** The CLI never forces contributors to reconcile parallel updates. There is no equivalent of `git merge`, `git rebase`, or conflict markers.

## Design Objectives
- Preserve every approved scenario regardless of archive order.
- Detect and block speculative archives when the live spec diverges from the author’s base.
- Provide a deterministic, reviewable conflict resolution flow that mirrors source-control best practices.
- Keep the authoring experience ergonomic: deltas should remain human-editable markdown.
- Support incremental adoption so existing repositories can roll forward without breaking active work.

## Proposed Fix: Layered Remediation

### Phase 0 – Stop the Bleeding (Detection & Guardrails)
1. **Persist requirement fingerprints alongside each change.**
   - When scaffolding or validating a change, capture the current requirement body for every `MODIFIED`/`REMOVED`/`RENAMED` entry and write it to `changes/<id>/meta.json`.
   - Store a stable hash (e.g., SHA-256) of the base requirement content and the raw text itself for later merges.
2. **Validate fingerprints during archive.**
   - Before `buildUpdatedSpec` mutates specs, recompute the requirement hash from the live spec.
   - If the hash differs from the stored base, abort and instruct the user to rebase. This makes the destructive path impossible.
3. **Surface intent in CLI output.**
   - Show which requirements are stale, when they diverged, and which change last touched them.
4. **Document interim manual mitigation.**
   - Update `openspec/AGENTS.md` and docs so contributors know to rerun `openspec change sync` (see Phase 1) whenever another change lands.

_Outcome:_ We prevent data loss immediately while we work on a richer merge story.

### Phase 1 – Add a Rebase Workflow (Author-Side Merge)
1. **Introduce `openspec change sync <id>` (or `rebase`).**
   - Reads the stored base snapshot, the current spec, and the author’s delta.
   - Performs a 3-way merge per requirement. A naive diff3 on markdown lines is acceptable initially because we already operate on requirement-sized chunks.
   - If the merge is clean, rewrite the `MODIFIED` block with the merged text and refresh the stored fingerprint.
   - On conflict, write conflict markers inside the change delta (similar to Git) and require the author to hand-edit before re-running validation.
2. **Enrich validator messages.**
   - `openspec validate` should flag unresolved conflict markers or fingerprint mismatches so errors appear early in the workflow.
3. **Optional:** Offer a `--rewrite-scenarios` helper that merges bullet lists of scenarios to reduce manual editing noise.

_Outcome:_ Contributors can safely reconcile their work with the latest spec before archiving, restoring true parallel development.

### Phase 2 – Increase Delta Granularity
1. **Extend the delta language with scenario-level directives.**
   - Allow `## MODIFIED Requirements` + `## ADDED Scenarios` / `## MODIFIED Scenarios` sections nested under the requirement header.
   - Backed by stable scenario identifiers (explicit IDs or generated hashes) stored in `meta.json`. This lets the system reason about individual scenarios.
2. **Teach the parser to understand nested operations.**
   - Update `parseDeltaSpec` to emit scenario-level operations in addition to requirement blocks.
   - Update `buildUpdatedSpec` (or its replacement) to merge scenario lists, preserving order while inserting new entries in a deterministic fashion.
3. **Automate migration.**
   - Provide a one-time command that inspects each existing spec, injects scenario IDs, and rewrites in-flight change deltas into the richer format.
4. **Continue to rely on the Phase 1 rebase flow for conflicts when two changes edit the same scenario body or description.**

_Outcome:_ Most concurrent updates become commutative, drastically reducing the odds of human merges.

### Phase 3 – Structured Spec Graph (Long-Term)
1. **Define stable requirement IDs.**
   - Embed `Requirement ID: <uuid>` markers in specs so renames and moves are trackable.
   - This enables future features like cross-capability references and better diff visualizations.
2. **Model spec edits as operations over an AST.**
   - Build an intermediate representation (IR) for requirements/scenarios/metadata.
   - Use operational transforms or CRDT-like techniques to guarantee merge associativity.
3. **Integrate with Git directly.**
   - Offer optional `openspec branch` scaffolding that aligns spec changes with Git branches, letting teams leverage Git’s conflict editor for the markdown IR.

_Outcome:_ OpenSpec graduates from replace-based updates to a resilient, intent-preserving spec management platform.

## Migration & Product Impacts
- **Backfill metadata:** add hashes for all active changes and the current main specs during the initial rollout.
- **CLI UX:** new commands (`change sync`, enhanced `archive`) require documentation, help text, and release notes.
- **Docs & AGENTS updates:** reinforce the rebase workflow and explain conflict resolution to AI assistants.
- **Testing:** introduce fixtures covering divergent requirement fingerprints and merge resolution logic.
- **Telemetry (optional):** log fingerprint mismatches so we can see how often teams hit conflicts after the rollout.

## Open Questions / Risks
- How should we order scenarios when multiple changes insert at different points? (Consider optional `position` metadata or deterministic alphabetical fallbacks.)
- What is the graceful failure mode if contributors delete the `meta.json` file? (CLI should recreate fingerprints on demand.)
- Do we need to support offline authors who cannot easily re-run the sync command before archiving? (Potential `--accept-outdated` escape hatch for emergencies.)
- How will archived historical changes be handled? We may need a migration script to embed fingerprints retroactively so re-validation succeeds.

## Immediate Next Steps
1. Prototype fingerprint capture during `openspec change validate` and block archive on mismatches.
2. Ship `openspec change sync` with line-based diff3 merging and conflict markers.
3. Update contributor docs and AI instructions to mandate running `sync` before archiving.
4. Plan the scenario-level delta extension and migration path as a follow-up RFC.
