# Tasks: deterministic spec-merge engine — `sync` (forward) + `unarchive` (reverse)

> Phased so the keystone ships first and each phase is independently testable and shippable. Phase 1 (engine + baseline) and Phase 2 (`sync` + `--check`) deliver the deterministic, model-free drift path on their own; Phase 3 (`unarchive`) and Phase 4 (idempotency) build on the same baseline; Phase 5 (skills) removes the model from the merge; Phase 6 (integration) is the staged hook/CI follow-up. Cross-platform concerns (`path.join`, Windows `moveDirectory`, newline-normalized digests) are called out per [openspec/config.yaml](../../config.yaml).

## 1. The engine: deterministic, byte-stable merge + applied-delta baseline

- [ ] 1.1 Make the merge byte-deterministic: audit `buildUpdatedSpec` ([src/core/specs-apply.ts:240-307](../../../src/core/specs-apply.ts)) for any nondeterministic ordering/whitespace; guarantee stable requirement ordering and newline normalization so the same (delta + base) yields byte-identical output on macOS/Linux/Windows.
- [ ] 1.2 Define the **applied-delta baseline** format (per design Decision 1): per affected spec, the pre-merge content (or `absent` marker) plus a scheme-tagged, newline-normalized digest of the applied result. Store it with the change (e.g. `.openspec/merge-baseline/`); document the location.
- [ ] 1.3 Add baseline read/write helpers (safe read-modify-write, preserving unrelated fields), coordinating the digest convention with [#1278](https://github.com/Fission-AI/OpenSpec/pull/1278)'s ledger.
- [ ] 1.4 Add the inverse merge in `specs-apply.ts`: delta-inversion for ADDED (remove by name) and RENAMED (rename TO→FROM, rewriting the header line); pre-image restore for all ops when a baseline exists. No change to forward behavior for existing callers.
- [ ] 1.5 Tests: same delta+base → byte-identical output across repeated runs and simulated CRLF/LF + Windows paths; baseline round-trips through read/write; inverse of a forward apply restores the base exactly (ADD/MODIFY/REMOVE/RENAME/create).

## 2. `openspec sync` + the drift gate (the keystone command)

- [ ] 2.1 Create `src/core/sync.ts` `SyncCommand` mirroring `ArchiveCommand`'s human + `--json` shape (`resolveOpenSpecRoot`, blocked-error → diagnostic, exit codes); default/`--fix` writes `specs/` from the deltas and refreshes the baseline.
- [ ] 2.2 `--check`: read-only; exit non-zero when deltas are not cleanly appliable to the base, or (when `specs/` was synced) when committed `specs/` ≠ regenerated output. Never writes `specs/`. Support `--all`/`--changes` style fan-out for CI (or document the loop).
- [ ] 2.3 Register `sync [change]` in [src/cli/index.ts](../../../src/cli/index.ts) (`--check`, `--fix`, `--json`, `--store`, hidden store-path), mirroring archive (326-343).
- [ ] 2.4 Tests: write produces deterministic `specs/`; `--check` clean vs drifted exit codes; `--check` never mutates; unknown/ambiguous change diagnostics; JSON shape on success and each blocked path.

## 3. `openspec unarchive` (reverse, built on the baseline)

- [ ] 3.1 Create `src/core/unarchive.ts` `UnarchiveCommand` (human + `--json`, blocked-error → diagnostic).
- [ ] 3.2 Resolver: bare `<name>` or full archived id; treat prefix as opaque up to `<name>` (strip `YYYY-MM-DD-`; tolerate `NNN-`/ISO/configurable, #409/#787/#1192); reuse `getArchivedChangesData()` (#399). Ambiguity → interactive prompt (most-recent first, never auto-pick) / `--json` error with candidates.
- [ ] 3.3 Reverse from baseline: restore each affected spec's pre-image (rewrite modified, recreate deleted, delete archive-created), under the drift guard (current content vs baseline applied-result digest); on drift, refuse and direct to `--keep-specs`.
- [ ] 3.4 Destination-collision guard (`changes/<name>/` exists → abort, no overwrite). Atomicity: stage + validate first; commit order restore specs → move folder (`moveDirectory`, Windows fallback); on failure *"Abort. No files were changed."*, rolling specs back from the baseline if the move fails.
- [ ] 3.5 `--keep-specs` (with hidden `--skip-specs` alias): pure folder move, no spec work, no drift/reversal checks.
- [ ] 3.6 Register `unarchive [change-name]` in `src/cli/index.ts` (`--keep-specs`/`--skip-specs`, `-y/--yes`, `--no-validate`, `--json`, `--store`).
- [ ] 3.7 Tests: byte-exact archive→unarchive round-trip for ADD/MODIFY/REMOVE/RENAME/create; drift refusal (no writes); destination collision abort; `--keep-specs` leaves `specs/` untouched; atomic abort leaves zero partial state; Windows move path; `--json` blocked-path diagnostics.

## 4. Idempotency & "no crumbs"

- [ ] 4.1 `sync` on an already-synced, unchanged change writes nothing and `--check` is clean (idempotent no-op).
- [ ] 4.2 Revised-delta re-merge: reverse the prior revision via the baseline, apply the new delta, refresh the baseline — assert `specs/` equals `apply(current delta, original base)` with no residue from the prior revision.
- [ ] 4.3 Drift-on-resync: if `specs/` drifted from the baseline since last sync, do not silently reverse-then-apply over the edit — report drift and require acknowledgement (consistent with unarchive's guard).
- [ ] 4.4 Tests: double-sync no-op; add→sync→revise(add+remove a requirement)→sync yields exactly the new delta's result, no crumbs; drift-on-resync refusal.

## 5. Skills delegate to the deterministic CLI (no model in the merge)

- [ ] 5.1 Rewrite `src/core/templates/workflows/sync-specs.ts` so `/opsx:sync` invokes `openspec sync` (drop the "agent-driven… directly edit main specs" instructions); skill does selection/confirmation/output only.
- [ ] 5.2 Create `src/core/templates/workflows/unarchive-change.ts` (`getUnarchiveChangeSkillTemplate()` + `getOpsxUnarchiveCommandTemplate()`) delegating to `openspec unarchive`; surface the CLI's drift refusal and `--keep-specs` option verbatim; never hand-move folders or hand-edit specs.
- [ ] 5.3 Export from `skill-templates.ts`; add `unarchive` to `ALL_WORKFLOWS` ([src/core/profiles.ts:19](../../../src/core/profiles.ts)) and `WORKFLOW_TO_SKILL_DIR` ([src/core/init.ts:65](../../../src/core/init.ts)); **not** to `CORE_WORKFLOWS` (#913/#762).
- [ ] 5.4 Tests: template snapshots assert `/opsx:sync` and `/opsx:unarchive` call the CLI and contain no manual merge/move instructions (anti-#863/#1246 guard).
- [ ] 5.5 Changeset + docs note: `/opsx:sync` is now deterministic; the agent no longer performs scenario-level merges (fixes #1246); author deltas as complete requirements per the conventions.

## 6. Integration surface (staged): CI gate + pre-commit hook

- [ ] 6.1 Document the CI drift-gate pattern (`openspec sync --check` as a plain binary, no model/API keys) in `docs/`; provide a copy-paste job snippet. (Wiring the actual workflow file is the owner's call.)
- [ ] 6.2 Document the pre-commit hook pattern (`sync --check` to detect, `sync --fix` to auto-remediate before `git commit --amend`), eslint-`--fix` style. (Choosing husky/lefthook/native is a separable follow-up; none exists in the repo today.)

## 7. Docs & supersession

- [ ] 7.1 `docs/opsx.md`: add `/opsx:unarchive`; update `/opsx:sync` to note CLI delegation + determinism; document `openspec sync` and `--check`/`--fix`.
- [ ] 7.2 Note the `specs/` = shipped-reality invariant and why `archive` is retained (design Decision 5), so the "why not just remove archive" question has a documented answer.

## 8. End-to-end verification

- [ ] 8.1 E2E determinism: scaffold a change with ADDED/MODIFIED/REMOVED/RENAMED; `openspec sync` twice → byte-identical `specs/`; `sync --check` clean.
- [ ] 8.2 E2E round-trip: `archive` then `unarchive` → `specs/` byte-identical to pre-archive, folder back under `changes/<name>/`.
- [ ] 8.3 E2E stacked drift: change A MODIFIES req X and is archived; a second change re-MODIFIES X and is archived; `unarchive A` refuses spec reversal; `unarchive A --keep-specs` succeeds untouched.
- [ ] 8.4 E2E no-crumbs: sync, revise the delta, re-sync → `specs/` reflects only the current delta.
- [ ] 8.5 Validation: `openspec validate add-deterministic-sync-and-unarchive --strict` passes; `openspec status` shows artifacts complete.
- [ ] 8.6 Run the suite on macOS, Linux, and Windows CI.
