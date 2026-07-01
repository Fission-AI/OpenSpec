# Tasks: the deterministic spec-merge engine — `sync` + the applied-delta baseline

> Phased so the keystone ships first and each phase is independently testable. Phase 1 (engine + baseline + shared canonicalizer) and Phase 2 (`sync` + `--check`) deliver the deterministic, model-free drift path; Phase 3 (idempotency) and Phase 4 (skill delegation) build on the same baseline. Cross-platform concerns (`path.join`, newline-normalized digests) are called out per [openspec/config.yaml](../../config.yaml). The follow-up change `add-spec-tooling-suite` builds `unarchive`, `format`, `diff`, and the unified `check` gate on the baseline established here.

## 1. The engine: deterministic, byte-stable merge + applied-delta baseline

- [ ] 1.1 Make the merge byte-deterministic: audit `buildUpdatedSpec` ([src/core/specs-apply.ts:240-307](../../../src/core/specs-apply.ts)) for any nondeterministic ordering/whitespace; guarantee stable requirement ordering and newline normalization so the same (delta + base) yields byte-identical output on macOS/Linux/Windows.
- [ ] 1.1a Extract the canonicalizer: factor the recomposition/normalization `buildUpdatedSpec` performs ([specs-apply.ts:311-348](../../../src/core/specs-apply.ts)) into a shared `src/core/spec-canonical.ts` used by the merge engine (and, in the follow-up, the formatter), so their output cannot diverge. Cover spec files and delta files (ADDED/MODIFIED/REMOVED/RENAMED sections). Behavior-preserving: assert `parse(canonicalize(x)) == parse(x)`.
- [ ] 1.2 Define the **applied-delta baseline** format (per design Decision 1): per affected spec, the pre-merge content (or `absent` marker), a scheme-tagged, newline-normalized digest of the applied result, and provenance (originating change + delta op). Store it with the change (e.g. `.openspec/merge-baseline/`); document the location.
- [ ] 1.3 Add baseline read/write helpers (safe read-modify-write, preserving unrelated fields), coordinating the digest convention with [#1278](https://github.com/Fission-AI/OpenSpec/pull/1278)'s ledger.
- [ ] 1.4 Tests: same delta+base → byte-identical output across repeated runs and simulated CRLF/LF + Windows paths; baseline round-trips through read/write; canonicalizer is behavior-preserving (`parse(canonicalize(x)) == parse(x)`) for spec and delta files.

## 2. `openspec sync` + the drift gate (the keystone command)

- [ ] 2.1 Create `src/core/sync.ts` `SyncCommand` mirroring `ArchiveCommand`'s human + `--json` shape (`resolveOpenSpecRoot`, blocked-error → diagnostic, exit codes); default/`--fix` writes `specs/` from the deltas and refreshes the baseline.
- [ ] 2.2 `--check`: read-only; exit non-zero when deltas are not cleanly appliable to the base, or (when `specs/` was synced) when committed `specs/` ≠ regenerated output. Never writes `specs/`. Support `--all`/`--changes` style fan-out for CI (or document the loop).
- [ ] 2.3 Register `sync [change]` in [src/cli/index.ts](../../../src/cli/index.ts) (`--check`, `--fix`, `--all`, `--json`, `--store`, hidden store-path), mirroring archive (326-343).
- [ ] 2.4 Tests: write produces deterministic `specs/`; `--check` clean vs drifted exit codes; `--check` never mutates; unknown/ambiguous change diagnostics; JSON shape on success and each blocked path.
- [ ] 2.5 Provenance: record, with the baseline, the originating change + delta operation for each applied spec change; add an `--explain` (and JSON) output that maps each affected requirement to its source delta. Do not re-author rationale (link to the change's `proposal.md`). (design Decision 12)
- [ ] 2.6 Delta↔spec correspondence in `--check`: fail on an orphan spec edit (attributable to the change but matching no delta op) and on an unapplied delta (delta op not reflected in `specs/`); pass when both directions hold. (design Decision 12)
- [ ] 2.7 Cross-change conflict detection in `--check` (design Decision 11): (a) delta-vs-base — a MODIFIED/REMOVED/RENAMED-from header absent from the current base (surfaces #1112 early); (b) cross-change — two active changes targeting the same requirement; report specifics, non-zero exit, no writes. Coordinate the cross-change check with [add-change-stacking-awareness](../add-change-stacking-awareness/proposal.md).
- [ ] 2.8 Tests: provenance recorded + `--explain` mapping; orphan-edit and unapplied-delta both fail `--check`; delta-vs-base conflict fails with the right requirement; two active changes on one requirement flagged; clean case passes.
- [ ] 2.9 Incremental checking (design Decision 13): `--check` skips a spec whose current digest matches the recorded baseline; re-checks on mismatch; forces a full check when the baseline is missing or its scheme is unrecognized. Add an escape hatch to disable skips (e.g. `--no-incremental`) for the equivalence test.
- [ ] 2.10 Tests: unchanged spec skipped; changed spec re-checked; missing/unknown-scheme baseline → full check; **incremental verdict == full verdict** on the same input (the correctness invariant); a touched spec in a large fixture is the only one re-checked.

## 3. Idempotency & "no crumbs"

- [ ] 3.1 `sync` on an already-synced, unchanged change writes nothing and `--check` is clean (idempotent no-op).
- [ ] 3.2 Revised-delta re-merge: reverse the prior revision via the baseline pre-image, apply the new delta, refresh the baseline — assert `specs/` equals `apply(current delta, original base)` with no residue from the prior revision.
- [ ] 3.3 Drift-on-resync: if `specs/` drifted from the baseline since last sync, do not silently reverse-then-apply over the edit — report drift and require acknowledgement.
- [ ] 3.4 Tests: double-sync no-op; add→sync→revise(add+remove a requirement)→sync yields exactly the new delta's result, no crumbs; drift-on-resync refusal.

## 4. `archive` integration + skill delegation (no model in the merge)

- [ ] 4.1 Route `archive`'s spec merge through the shared engine and persist the applied-delta baseline before `moveDirectory` ([src/core/archive.ts](../../../src/core/archive.ts) ~414-506), so the baseline travels into the archive. No behavior/output change; existing archive tests stay green.
- [ ] 4.2 Rewrite `src/core/templates/workflows/sync-specs.ts` so `/opsx:sync` invokes `openspec sync` (drop the "agent-driven… directly edit main specs" instructions); skill does selection/confirmation/output only.
- [ ] 4.3 Tests: archive still produces identical merged `specs/` and output, and now writes a baseline; `/opsx:sync` template snapshot asserts it calls the CLI and contains no manual merge instructions (anti-#863/#1246 guard).
- [ ] 4.4 Changeset + docs note: `/opsx:sync` is now deterministic; the agent no longer performs scenario-level merges (fixes #1246); author deltas as complete requirements per the conventions.

## 5. Docs

- [ ] 5.1 `docs/opsx.md` + CLI docs: document `openspec sync` and its flags; update `/opsx:sync` to note CLI delegation + determinism.
- [ ] 5.2 Note the `specs/` = shipped-reality invariant and why `archive` is retained (design Decision 5), so the "why not just remove archive" question has a documented answer. Point to the follow-up `add-spec-tooling-suite` for `unarchive`/`format`/`diff`/`check`.

## 6. End-to-end verification

- [ ] 6.1 E2E determinism: scaffold a change with ADDED/MODIFIED/REMOVED/RENAMED; `openspec sync` twice → byte-identical `specs/`; `sync --check` clean.
- [ ] 6.2 E2E no-crumbs: sync, revise the delta, re-sync → `specs/` reflects only the current delta.
- [ ] 6.3 E2E drift gate: introduce an un-synced delta → `openspec sync --check` fails naming the drift → `sync --fix` remediates → `--check` passes; then a delta-vs-base conflict still fails (not auto-fixable).
- [ ] 6.4 E2E archive baseline: `archive` a change → merged `specs/` unchanged from today's output, and a baseline is recorded in the archived folder (the artifact the follow-up `unarchive` reverses from).
- [ ] 6.5 Validation: `openspec validate add-deterministic-spec-sync --strict` passes; `openspec status` shows artifacts complete.
- [ ] 6.6 Run the suite on macOS, Linux, and Windows CI.
