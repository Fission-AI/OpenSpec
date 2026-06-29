# Design: deterministic spec-merge engine — `sync` (forward), `unarchive` (reverse)

## Context

OpenSpec's spec merge (delta → `specs/`) is reached two ways today: deterministically but only *inside* `openspec archive` (fused to the folder move), or by an AI agent in `/opsx:sync` that "directly edits main specs." The standalone deterministic apply (`applySpecs()`, [src/core/specs-apply.ts:391](../../../src/core/specs-apply.ts)) has zero callers. The Discord thread (samholmes ↔ Clay, 2026-06) worked from "add unarchive" to a single root cause: **the merge must be deterministic, idempotent, and reversible pure code, exposed as commands** — then unarchive, a code-only CI drift gate, a `sync --fix` pre-commit hook, and crumb-free re-merge all fall out of one primitive.

This design covers that primitive and the commands built on it. It supersedes the earlier "unarchive + separable CI companion" framing of this PR: the deterministic engine is no longer a companion, it is the spine.

## Goals / Non-Goals

**Goals**
- A deterministic merge: same (delta + base) → byte-identical `specs/`, in pure code, on every platform.
- Idempotent: re-running `sync` is a no-op; revising a delta regenerates `specs/` with no crumbs.
- Reversible: `unarchive` restores `specs/` exactly and moves the folder back, atomically.
- Code-only drift detection (`sync --check`) usable by CI and a pre-commit hook — no model, no API keys.
- Skills delegate the merge to the CLI; the agent never performs it.
- Backward compatible with changes archived (and specs synced) before this feature.

**Non-Goals**
- Removing or replacing the `archive` lifecycle boundary (Decision 5).
- Folding the spec merge into `apply` (Decision 5).
- Wiring a specific hook runner or CI job into this repo (primitives in scope; config staged — Decision 4).
- A scenario-granular "smart" merge (Decision 8 — the conventions mandate whole-requirement deltas; whole-block apply is the correct, deterministic semantics).
- Bulk `sync`/`unarchive`, archive-folder prefix scheme, lifecycle timestamps — out of scope, accommodated.

## Decision 1 — One primitive: the applied-delta baseline

**Decision.** When a change's deltas are merged into `specs/` (by `sync` or `archive`), record a per-change **applied-delta baseline**: for each affected spec, the **pre-merge file content** (the pre-image, or an explicit `absent` marker when the spec is created) and a **digest of the applied result** (newline-normalized CRLF→LF, scheme-tagged). The baseline lives with the change; when archived, it travels into the archive folder.

**Why one primitive.** The three asks in the thread are the same computation viewed three ways:
- **Reverse** (`unarchive`) = restore the pre-image. Deterministic for *every* op, including the REMOVED/MODIFIED ones the delta alone cannot invert.
- **Idempotent re-merge** (`sync` after a delta revision) = `specs_new = apply(delta_new, base)` where `base = current specs with delta_old reversed` (via the pre-image). This is the "no leftover crumbs" guarantee — the prior revision's contribution is removed, not layered over.
- **Drift** (`sync --check`, the hook, CI) = current `specs/` digest ≠ baseline digest. This is samholmes' "track the hash of the changes/ state applied to the spec," made precise.

Building three mechanisms would invite three drift bugs. Building one — the pre-image + digest — and deriving the rest is why this is the spine.

**Form.** Store the whole pre-image (not a reverse-diff), so restore is a byte copy with no re-parsing. Cost is a copy of each affected spec's prior bytes per merge — negligible, and only for changes that touch specs. Coordinate the digest convention with [#1278](https://github.com/Fission-AI/OpenSpec/pull/1278)'s artifact-graph digest ledger so the two drift layers (artifact staleness vs. spec-merge drift) speak the same digest dialect.

## Decision 2 — Deterministic sync is pure parser code; the agent never merges

**Decision.** Promote `applySpecs()`/`buildUpdatedSpec` into the canonical merge and expose it as `openspec sync`. The merge is a pure function of (delta files + base spec bytes) producing byte-identical output across runs and platforms (stable requirement ordering, newline normalization, deterministic recomposition). `archive` calls the same function. `/opsx:sync` is rewritten to **invoke the CLI**, not edit specs itself.

**Why.** This is the thread's keystone verbatim: *"Moving it out of the agent prompt and into plain parser code that always produces byte-identical output for the same delta + base."* The agent path isn't just non-deterministic; its stated reason for existing — "intelligent merging (e.g., adding a scenario without copying the entire requirement)" — is precisely how [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246) silently drops sibling scenarios. The conventions spec already requires deltas to carry "the complete modified requirement, not a diff," so whole-block apply is the *correct* semantics and the agent's cleverness is the bug. Deterministic code is therefore more faithful, not less (Decision 8).

**Alternatives.** Keep agent sync and only diff its output in CI — rejected: needs a model in CI, the exact thing the thread set out to avoid.

## Decision 3 — Idempotency and "no crumbs"

**Decision.** `sync` is idempotent: running it on an already-synced, unchanged change writes nothing (`--check` is clean). When a delta is revised, `sync` reverses the prior revision's contribution via the baseline pre-image, then applies the new delta, then refreshes the baseline — so `specs/` equals `apply(current delta, original base)` with zero residue from the old revision.

**Why.** Directly answers *"a revised delta should let sync regenerate the spec output from scratch, idempotently, no leftover crumbs."* Without the baseline, re-applying a revised delta against already-merged `specs/` either conflicts (ADDED now exists) or layers (renamed-then-renamed) — crumbs. The baseline makes regeneration a clean reverse-then-apply.

**Edge.** If `specs/` drifted from the baseline since the last sync (a later change touched the same requirement), `sync` does not silently reverse-then-apply over someone else's edit — it reports drift and requires `--check`-style acknowledgement, mirroring `unarchive`'s drift guard (Decision 7). Consistency over cleverness.

## Decision 4 — `--check` and `--fix`: the gate and the auto-fixer (wiring staged)

**Decision.** `sync --check` is read-only and exits non-zero when the change's deltas are not cleanly appliable to the base, or — when the team commits merged `specs/` during review — when committed `specs/` ≠ the regenerated output. `sync --fix` (and bare `sync`) regenerates `specs/`. This PR ships both CLI modes and documents two integration patterns; it does **not** add a hook runner or CI job to this repo (none exists today).

- **CI drift gate**: a job runs `openspec sync --check` (or `--all`) and fails the PR on drift — "the same pattern as a codegen or IaC drift gate," as a plain binary.
- **pre-commit hook**: `openspec sync --check` detects drift before `git commit --amend`; `openspec sync --fix` is the eslint-`--fix`-style auto-remediation, after which the amend proceeds with `specs/` canonical.

**Why staged.** The primitives are the reusable, testable part and belong here. Choosing husky vs. lefthook vs. native hooks, and the CI matrix, are repo-policy calls better made as a focused follow-up than bundled into a foundational engine PR. Keeping them separable also keeps this PR reviewable.

## Decision 5 — Keep the `archive` boundary; reject folding the merge into `apply`

**Decision.** The lifecycle boundary stays: `specs/` is written at `sync`/`archive`, and `archive` remains the "fold finished change into shipped specs, then move the folder" step. Reject samholmes' proposal to remove `archive`, keep every change in a dated archive dir for its whole life, and make `apply` do both code and spec application.

**Why.** The invariant that pays for OpenSpec's value is **`specs/` describes only shipped reality**. Folding the merge into `apply` would (a) pollute the source of truth with proposed-but-unmerged or abandoned changes, and (b) let parallel changes overwrite each other's specs before any lands. The thread's own resolution: the awkwardness of the "final archive step" is not the boundary's fault, it is the *non-determinism* of crossing it. Make the crossing deterministic and reversible (Decisions 1–3) and the boundary becomes cheap in both directions — which is the actual fix. This is why determinism, not deletion, is the spine of this PR.

**Consequence for `sync` on active changes.** Because of the invariant, the *default* workflow still merges at archive. Standalone `sync` serves: the engine archive uses; `--check` (read-only, never pollutes `specs/`); and the opt-in "generated-artifact" workflow where a team chooses to commit merged `specs/` mid-review and gate it. The tool enables both policies; it does not force early merge.

## Decision 6 — `unarchive`: resolution, prefix-tolerance, never auto-pick

**Decision.** `unarchive [change-name]` accepts a bare `<name>` or a full archived directory id, treating the leading prefix as **opaque up to `<name>`** — strips `YYYY-MM-DD-` today, tolerates `NNN-`/ISO/configurable ([#409](https://github.com/Fission-AI/OpenSpec/issues/409)/[#787](https://github.com/Fission-AI/OpenSpec/pull/787)/[#1192](https://github.com/Fission-AI/OpenSpec/issues/1192)). Multiple matches for a bare name → interactive prompt (most-recent first, never auto-select); `--json`/non-interactive → error listing candidates, require the full id. Reuse `getArchivedChangesData()` ([#399](https://github.com/Fission-AI/OpenSpec/pull/399)).

**Why.** Multiple archives of one name already happen (different dates), and the proposed sequence scheme makes it routine. Silent selection is a guess on the rare, costly path.

## Decision 7 — Reverse under a drift guard, atomically

**Decision.** Before reversing any spec, compare its current content to the baseline's applied-result digest. On drift (a later change touched the same requirement — [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246), [add-change-stacking-awareness](../add-change-stacking-awareness/proposal.md)), **refuse** and point to `--keep-specs`. Stage and validate the whole reversal first; commit order = restore/delete specs → move folder (`moveDirectory`, Windows EPERM/EXDEV fallback). On any failure: *"Abort. No files were changed."*, rolling restored specs back from the still-present baseline if the move fails.

**Why.** Restoring a pre-image over a requirement a later change modified would silently delete that change's contribution — the loss OpenSpec guards against. Refusing is strictly safer, and `--keep-specs` always lets the user proceed. Atomicity gives archive the rollback [#682](https://github.com/Fission-AI/OpenSpec/issues/682) noted it lacks, and matches the abort contract [#1112](https://github.com/Fission-AI/OpenSpec/issues/1112) describes.

## Decision 8 — `--keep-specs` and naming vs. `--skip-specs`

**Decision.** `--keep-specs` moves the folder back and leaves `specs/` untouched — always deterministic, always safe. Primary spelling `--keep-specs` (the request's; reads naturally for the inverse). Accept `--skip-specs` as a hidden alias for muscle-memory symmetry with archive ([#28](https://github.com/Fission-AI/OpenSpec/pull/28)). When `unarchive` cannot safely reverse specs (drift, or pre-baseline REMOVED/MODIFIED) and `--keep-specs` was not given, it refuses and *recommends* `--keep-specs` — it does not silently fall back. **Open for owner confirmation:** if strict symmetry is preferred, swap which spelling is primary.

## Decision 9 — Backward compatibility: pre-baseline archives and synced specs

**Decision.** Changes archived/synced before baselines existed have none. `unarchive` then reverses **ADDED**/**RENAMED** by delta inversion (the self-invertible half) and, for any **REMOVED**/**MODIFIED**, **refuses to guess** — naming each requirement it cannot safely restore and directing to `--keep-specs` (optionally offering opt-in git recovery of the pre-image). `sync` on a pre-baseline change establishes a baseline on its next run. Never silently emit a wrong spec.

**Why.** The feature must be useful on day one, including for already-archived changes, without ever degrading into corruption. Reverse what is provably reversible; stop honestly on the rest.

## Decision 10 — Move strategy and lifecycle metadata

- **Move**: reuse `moveDirectory()`/`copyDirRecursive()` ([src/core/archive.ts:96-128](../../../src/core/archive.ts)) and their Windows fallbacks ([#605](https://github.com/Fission-AI/OpenSpec/pull/605)). A future `git mv` ([#709](https://github.com/Fission-AI/OpenSpec/issues/709)) covers both directions through this one helper.
- **Metadata**: archive persists no `archived` timestamp today (only the folder-name prefix). If [#1245](https://github.com/Fission-AI/OpenSpec/issues/1245) lands one, `unarchive` should null it on restore — noted, not built.

## Risks / trade-offs

- **Behavior shift for `/opsx:sync` users.** Replacing agent merge with deterministic merge changes output for anyone who relied on the agent's scenario-level merges. This is intended (it fixes [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246)), but it is a real change; call it out in the changeset and docs, and keep the conventions' "complete requirement, not a diff" rule prominent so deltas are authored to merge cleanly.
- **Baseline storage in the change folder.** Adds a small artifact; inert for spec-less changes. Format is scheme-tagged so canonicalization can evolve without silent mis-compares.
- **Forward round-trip is not guaranteed identity.** `unarchive` restores the exact pre-archive `specs/`; a *subsequent* re-archive re-runs the forward merge, which inherits archive's existing cross-change caveats ([#1246](https://github.com/Fission-AI/OpenSpec/issues/1246)). Documented, not solved here.
- **Scope.** This is larger than a lone `unarchive` command. It is intentionally the foundational engine the thread converged on; tasks phase it so the keystone (engine + `sync --check`) is independently shippable before reverse, idempotency, and skill delegation.

## Migration / rollout

Additive and phased (see tasks). The engine + baseline land first (no user-visible change to `archive` output). `sync` and `unarchive` are new commands in the expanded profile. `/opsx:sync` delegation ships with a changeset noting the determinism shift. Pre-baseline changes degrade per Decision 9. Hook/CI wiring is a follow-up.
