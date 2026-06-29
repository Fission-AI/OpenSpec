# Design: `openspec unarchive`

## Context

`openspec archive` ([src/core/archive.ts](../../../src/core/archive.ts)) is a one-way, non-transactional door: it merges a change's delta specs into `openspec/specs/` via `buildUpdatedSpec` ([src/core/specs-apply.ts:240-307](../../../src/core/specs-apply.ts)) and moves the change folder to `openspec/changes/archive/YYYY-MM-DD-<name>/`. This design covers the inverse command, the one archive-side change required to make the inverse deterministic, and a separable CI companion.

The governing constraint is the reversibility asymmetry established in the proposal: **ADDED and RENAMED are invertible from the archived delta; REMOVED and MODIFIED are not**, because the forward merge discards the pre-image. Every decision below follows from deciding *where the pre-image comes from*.

## Goals / Non-Goals

**Goals**
- A deterministic, code-only `openspec unarchive` that restores `specs/` exactly and moves the folder back.
- Never silently corrupt `specs/`: when a faithful reversal is not possible, refuse with a clear, actionable message.
- Atomic: success or "no files were changed."
- `--keep-specs` as an always-safe escape hatch.
- Backward compatibility with changes archived before this feature.

**Non-Goals**
- Re-deriving `specs/` from git history as the *primary* mechanism (git is an optional assist only).
- Multi-change / bulk unarchive (mirror of bulk-archive) — future, not here.
- Archive/unarchive lifecycle **hooks** (#704/#682) and lifecycle **timestamps** (#1245) — accommodated, not built.
- Choosing the archive-folder prefix scheme (#409/#787/#1192) — unarchive is tolerant of all of them.

## Decision 1 — The reversibility guarantee comes from a snapshot at archive time, not from inverting the delta

**Decision.** Make `openspec archive` write a self-contained **reversal snapshot** into the change folder whenever it rewrites `specs/`. For each affected spec, record the **pre-merge file content** (the exact pre-image, or an explicit "absent" marker when archive *creates* a new spec) and the **post-merge content digest**. `unarchive` reverses by restoring the recorded pre-image; the digest is the drift guard (Decision 3).

**Why.** The pre-image is the only thing that makes REMOVED/MODIFIED reversible, and it exists only at archive time. Capturing the whole pre-image (rather than a diff or a hash) makes reversal a byte-exact file restore — uniform across ADDED/MODIFIED/REMOVED/RENAMED/created/deleted, with zero re-parsing and zero inference. It is the most robust and the simplest thing that can possibly work. The snapshot lives *inside the change folder* so it moves into `archive/` with everything else, is self-contained, and survives in git without extra plumbing.

**Alternatives considered.**
- **(A) Reconstruct the pre-image from git** (`git show <pre-archive-sha>:specs/...`). Rejected as the foundation: it requires a git repo and a clean pre-archive commit, and the motivating case is exactly when the archive is buried in a multi-file commit (the maintainer's "am I in a bind?" scenario). Kept as an *optional* recovery assist for pre-snapshot archives (Decision 5), never required.
- **(B) Invert the delta only** (no new state). Faithfully reverses ADDED/RENAMED; cannot reverse REMOVED/MODIFIED. Rejected as the foundation because it cannot meet the "deterministic reversal" bar; retained as the graceful-degradation path for pre-snapshot archives (Decision 5).
- **(C) Store a base *hash* per requirement** ([#1246](https://github.com/Fission-AI/OpenSpec/issues/1246)'s proposal). A hash detects drift but cannot *restore* content. The snapshot is the strict generalization: it both detects (digest) and restores (pre-image). If #1246's fingerprint lands first, the snapshot subsumes it.

**Cost.** A copy of each affected spec's prior bytes per archive — negligible, and only for changes that touch specs.

## Decision 2 — Resolution is prefix-tolerant and never auto-picks among ambiguous matches

**Decision.** `unarchive` accepts either the change `<name>` or a full archived directory id. It locates candidates under `changes/archive/` by treating the leading prefix as **opaque up to `<name>`** — stripping a `YYYY-MM-DD-` prefix today, and tolerating `NNN-`/ISO/configurable prefixes ([#409](https://github.com/Fission-AI/OpenSpec/issues/409)/[#787](https://github.com/Fission-AI/OpenSpec/pull/787)/[#1192](https://github.com/Fission-AI/OpenSpec/issues/1192)). When more than one archived entry matches a bare `<name>`:
- **interactive**: list candidates (most-recent first) and prompt — never auto-select;
- **`--json` / non-interactive**: error with the candidate list and require the full archived id.

**Why.** Multiple archives of one name already happen today (same name archived on two different days), and the proposed sequence scheme makes it routine. Silent selection is the kind of guess that produces the wrong outcome on the rare-but-costly path. Resolution reuses `getArchivedChangesData()` ([#399](https://github.com/Fission-AI/OpenSpec/pull/399)) rather than re-reading the archive dir.

## Decision 3 — Drift guard + atomicity: refuse rather than clobber, and never leave a partial state

**Decision.** Before un-merging, compare each affected spec's current content to the **post-merge digest** the snapshot recorded. If any spec has drifted (a later change touched the same requirement — the stacked-archive hazard of [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246) and [add-change-stacking-awareness](../add-change-stacking-awareness/proposal.md)), unarchive **refuses** the spec reversal and points the user to `--keep-specs`. The whole operation is staged and validated first; on any failure it aborts with *"Abort. No files were changed."* — matching archive's existing contract and the failure surface [#1112](https://github.com/Fission-AI/OpenSpec/issues/1112) describes, and supplying the rollback [#682](https://github.com/Fission-AI/OpenSpec/issues/682) noted archive lacks.

**Why.** Restoring a pre-image over a spec that a *later* change has since modified would silently delete that later change's contribution — exactly the data loss the project guards against. Detecting drift and stopping is strictly safer than a best-effort merge, and the user always has `--keep-specs` to proceed without spec changes. Atomicity matters because unarchive mutates both `specs/` and the folder location; a half-applied reversal is worse than none.

**Order of operations (commit phase, after all checks pass):** restore/delete spec files → move folder `archive/<dir>` → `changes/<name>`. The move is last so that a move failure (e.g. destination appearing) does not strand rewritten specs without a matching active change; if the move fails after specs are restored, roll the spec writes back from the still-present snapshot.

## Decision 4 — `--keep-specs`: semantics, and naming vs. archive's `--skip-specs`

**Decision.** `--keep-specs` moves the folder back and leaves `specs/` **untouched** — always deterministic, always safe. Primary spelling is `--keep-specs` (the request's, and it reads naturally for the inverse: "keep the specs as they are"). Accept `--skip-specs` as a **hidden alias** so muscle memory from archive transfers. When unarchive *cannot* safely reverse specs (drift, or a pre-snapshot REMOVED/MODIFIED) and `--keep-specs` was not given, it refuses and *recommends* `--keep-specs` — it does not silently fall back.

**Why.** `--skip-specs` on archive means "move the folder, don't merge in" ([#28](https://github.com/Fission-AI/OpenSpec/pull/28)); `--keep-specs` on unarchive means "move the folder, don't un-merge." Same shape, inverse direction. Honoring the requested spelling while aliasing the familiar one is the low-surprise choice. **Open for owner confirmation:** if strict CLI symmetry is preferred, make `--skip-specs` the primary and `--keep-specs` the alias — purely a naming call.

## Decision 5 — Backward compatibility: graceful degradation for pre-snapshot archives

**Decision.** Changes archived before this feature have no snapshot. Unarchive then:
1. reverses **ADDED** and **RENAMED** by delta inversion (the self-invertible half), and
2. for any **REMOVED**/**MODIFIED**, **refuses to guess** — it names each requirement it cannot safely restore and directs the user to `--keep-specs` (optionally noting the git-based manual recovery for the pre-image).

It never silently emits a wrong spec. If git is available and a clean pre-archive commit can be identified, it *may* offer to recover the pre-image from git as an assist — strictly opt-in, never assumed.

**Why.** The feature must be useful the day it ships, including for already-archived changes, without ever degrading into corruption. Reversing the half that is provably reversible, and stopping honestly on the half that is not, is the correct contract.

## Decision 6 — Companion: a model-free CI drift gate (separable)

**Context.** The motivating Discord thread ended on: letting archive's `sync` run through the agent makes merged `specs/` non-deterministic (wording drift), so a CI gate would seem to need a model.

**Decision / recommendation.** Don't run a model in CI. The delta merge is mechanical and already deterministic in code (`buildUpdatedSpec`); only the agent path drifts. Let the agent author locally, and have CI verify the deterministic output as a plain binary. The enabling gap: `applySpecs()` ([src/core/specs-apply.ts:391](../../../src/core/specs-apply.ts)) — the standalone deterministic apply — has **zero callers**; the engine is reachable only inside `archive`, fused to the folder move. Expose it as `openspec sync [change]` (apply deltas to `specs/` without archiving) with a `--check` mode that exits non-zero when committed `specs/` diverge from the regenerated output — a codegen/IaC-style drift gate. This PR's reversal snapshot makes `archive → unarchive` a byte-exact round-trip, which is the determinism property such a gate relies on and a ready-made test of it.

**Scope.** Separable. No `cli-sync` spec delta is included here; it is captured so the owner can decide whether it rides this PR or a fast follow-up. The unarchive core does not depend on it.

## Decision 7 — Move strategy and lifecycle metadata

- **Move**: reuse `moveDirectory()`/`copyDirRecursive()` ([src/core/archive.ts:96-128](../../../src/core/archive.ts)) for the Windows EPERM/EXDEV fallback ([#605](https://github.com/Fission-AI/OpenSpec/pull/605)). A future switch to `git mv` ([#709](https://github.com/Fission-AI/OpenSpec/issues/709)) would cover both directions through this one helper.
- **Metadata**: today archive persists no `archived` timestamp (only the folder-name prefix), so there is nothing to clear. If [#1245](https://github.com/Fission-AI/OpenSpec/issues/1245) lands an `archived` field, unarchive should null it on restore — noted, not built.

## Risks / trade-offs

- **Round-trip is not guaranteed identity in the forward direction.** Unarchive restores the exact pre-archive `specs/` from the snapshot, but a *subsequent re-archive* re-runs the forward merge, which is itself lossy across stacked MODIFIED changes ([#1246](https://github.com/Fission-AI/OpenSpec/issues/1246)) and may reorder ADDED requirements. Unarchive is faithful; re-archiving inherits archive's existing caveats. Documented, not solved here.
- **Snapshot adds a small artifact to archived folders.** Acceptable; it is the price of reversibility and is inert for changes that touch no specs.
- **Pre-snapshot archives get partial reversal.** Mitigated by honest refusal + `--keep-specs`; fully resolved for any change archived after this ships.

## Migration / rollout

Purely additive. Archive gains snapshot-writing (forward-only, no behavior/output change). Unarchive is a new command + skill in the expanded profile. Existing archives keep working under Decision 5.
