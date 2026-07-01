# Design: the deterministic spec-merge engine — `sync` + the applied-delta baseline

## Context

OpenSpec's spec merge (delta → `specs/`) is reached two ways today: deterministically but only *inside* `openspec archive` (fused to the folder move), or by an AI agent in `/opsx:sync` that "directly edits main specs." The standalone deterministic apply (`applySpecs()`, [src/core/specs-apply.ts:391](../../../src/core/specs-apply.ts)) has zero callers. The design discussion (2026-06) worked from "add unarchive" to a single root cause: **the merge must be deterministic, idempotent, and reversible pure code, exposed as commands** — then a code-only CI drift gate, a `sync --fix` pre-commit hook, crumb-free re-merge, and (later) reverse all fall out of one primitive.

**Scope of this PR (the first slice).** Per review on [#1279](https://github.com/Fission-AI/OpenSpec/pull/1279), the proposal was narrowed to the load-bearing spine so it ships in one reviewable pass: the applied-delta **baseline**, the deterministic **merge engine**, `openspec sync` (+ `--check`/`--fix`), `archive` routed through the engine, and `/opsx:sync` delegating to the CLI. The commands that build on the baseline — `unarchive`, `format`, `diff`, and the unified `check` gate — are specified in the **follow-up** change `add-spec-tooling-suite` (design Decisions 6–10, 14–16 live there). This document keeps the decisions that define and constrain the primitive.

## Goals / Non-Goals

**Goals**
- A deterministic merge: same (delta + base) → byte-identical `specs/`, in pure code, on every platform.
- Idempotent: re-running `sync` is a no-op; revising a delta regenerates `specs/` with no crumbs.
- Code-only drift detection (`sync --check`) usable by CI and a pre-commit hook — no model, no API keys.
- Early, deterministic conflict detection (delta-vs-base and cross-change) at commit/PR time, not at archive (Decision 11).
- Per-edit provenance and a delta↔spec correspondence check, within the delta model (Decision 12).
- Hash-optimized incremental checking: `--check` re-checks only specs whose digest changed, without changing any verdict (Decision 13).
- `archive` records the baseline so a later change can reverse it deterministically (the follow-up `unarchive`).
- Skills delegate the merge to the CLI; the agent never performs it.
- Backward compatible with changes archived (and specs synced) before this feature.

**Non-Goals (here)**
- Removing or replacing the `archive` lifecycle boundary, or editing `specs/` in place instead of via deltas (Decisions 5, 11).
- Folding the spec merge into `apply` (Decision 5).
- The reverse command `unarchive` and its resolution / drift-guard / atomicity / pre-baseline handling — **follow-up** (`add-spec-tooling-suite`).
- The `format` canonicalizer-for-authoring, the spec-aware `diff` driver, and the unified `check` gate + hook/CI wiring — **follow-up**.
- Inference-based "align spec to implementation" / code-vs-spec checking — that needs a model and is the `verify` direction (#880).
- Reducing the committed artifact set (commit-only-the-spec) — a separate product question served by schema flexibility (Decision 13).
- A scenario-granular "smart" merge — the conventions mandate whole-requirement deltas; whole-block apply is the correct, deterministic semantics (Decision 2).

## Decision 1 — One primitive: the applied-delta baseline

**Decision.** When a change's deltas are merged into `specs/` (by `sync` or `archive`), record a per-change **applied-delta baseline**: for each affected spec, the **pre-merge file content** (the pre-image, or an explicit `absent` marker when the spec is created), a **digest of the applied result** (newline-normalized CRLF→LF, scheme-tagged), and the **provenance** of each edit (originating change + delta operation). The baseline lives with the change; when archived, it travels into the archive folder.

**Why one primitive.** The asks in the thread are the same computation viewed several ways:
- **Idempotent re-merge** (`sync` after a delta revision) = `specs_new = apply(delta_new, base)` where `base = current specs with delta_old reversed` (via the pre-image). This is the "no leftover crumbs" guarantee — the prior revision's contribution is removed, not layered over.
- **Drift** (`sync --check`, the hook, CI) = current `specs/` digest ≠ baseline digest. This is the discussion's "track the hash of the changes/ state applied to the spec," made precise.
- **Reverse** (the follow-up `unarchive`) = restore the pre-image. Deterministic for *every* op, including the REMOVED/MODIFIED ones the delta alone cannot invert. This PR **records** the baseline that makes reverse possible; the reverse command itself is the follow-up.

Building separate mechanisms would invite separate drift bugs. Building one — the pre-image + digest + provenance — and deriving the rest is why this is the spine.

**Form.** Store the whole pre-image (not a reverse-diff), so a future restore is a byte copy with no re-parsing. Cost is a copy of each affected spec's prior bytes per merge — negligible, and only for changes that touch specs. Coordinate the digest convention with [#1278](https://github.com/Fission-AI/OpenSpec/pull/1278)'s artifact-graph digest ledger so the two drift layers (artifact staleness vs. spec-merge drift) speak the same digest dialect.

## Decision 2 — Deterministic sync is pure parser code; the agent never merges

**Decision.** Promote `applySpecs()`/`buildUpdatedSpec` into the canonical merge and expose it as `openspec sync`. The merge is a pure function of (delta files + base spec bytes) producing byte-identical output across runs and platforms (stable requirement ordering, newline normalization, deterministic recomposition). `archive` calls the same function. `/opsx:sync` is rewritten to **invoke the CLI**, not edit specs itself.

**Why.** This is the thread's keystone verbatim: *"Moving it out of the agent prompt and into plain parser code that always produces byte-identical output for the same delta + base."* The agent path isn't just non-deterministic; its stated reason for existing — "intelligent merging (e.g., adding a scenario without copying the entire requirement)" — is precisely how [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246) silently drops sibling scenarios. The conventions spec already requires deltas to carry "the complete modified requirement, not a diff," so whole-block apply is the *correct* semantics and the agent's cleverness is the bug. Deterministic code is therefore more faithful, not less.

**Alternatives.** Keep agent sync and only diff its output in CI — rejected: needs a model in CI, the exact thing the thread set out to avoid.

## Decision 3 — Idempotency and "no crumbs"

**Decision.** `sync` is idempotent: running it on an already-synced, unchanged change writes nothing (`--check` is clean). When a delta is revised, `sync` reverses the prior revision's contribution via the baseline pre-image, then applies the new delta, then refreshes the baseline — so `specs/` equals `apply(current delta, original base)` with zero residue from the old revision.

**Why.** Directly answers *"a revised delta should let sync regenerate the spec output from scratch, idempotently, no leftover crumbs."* Without the baseline, re-applying a revised delta against already-merged `specs/` either conflicts (ADDED now exists) or layers (renamed-then-renamed) — crumbs. The baseline makes regeneration a clean reverse-then-apply.

**Edge.** If `specs/` drifted from the baseline since the last sync (a later change touched the same requirement), `sync` does not silently reverse-then-apply over someone else's edit — it reports drift and requires `--check`-style acknowledgement. Consistency over cleverness. (The follow-up `unarchive` applies the same drift guard on reverse.)

## Decision 4 — `--check` and `--fix`: the gate and the auto-fixer

**Decision.** `sync --check` is read-only and exits non-zero when the change's deltas are not cleanly appliable to the base, or — when the team commits merged `specs/` during review — when committed `specs/` ≠ the regenerated output. `sync --fix` (and bare `sync`) regenerates `specs/`.

- **CI drift gate**: a job runs `openspec sync --check` (fan out over active changes) and fails the PR on drift — "the same pattern as a codegen or IaC drift gate," as a plain binary, no model.
- **pre-commit hook**: `openspec sync --check` detects drift before commit; `openspec sync --fix` is the eslint-`--fix`-style auto-remediation.

**Relationship to the follow-up `check` gate.** The per-tool `--check`/`--fix` modes shipped here are the primitives. The **follow-up** adds `openspec check`, a single command that composes `sync --check` with `format --check` and `validate` behind one exit-code/JSON contract, plus an opt-in hook installer and a CI template. Until that lands, CI and hooks invoke `openspec sync --check` directly — the verdict is identical, just not yet bundled behind one entrypoint.

## Decision 5 — Keep the `archive` boundary; reject folding the merge into `apply`

**Decision.** The lifecycle boundary stays: `specs/` is written at `sync`/`archive`, and `archive` remains the "fold finished change into shipped specs, then move the folder" step. Reject the proposal to remove `archive`, keep every change in a dated archive dir for its whole life, and make `apply` do both code and spec application.

**Why.** The invariant that pays for OpenSpec's value is **`specs/` describes only shipped reality**. Folding the merge into `apply` would (a) pollute the source of truth with proposed-but-unmerged or abandoned changes, and (b) let parallel changes overwrite each other's specs before any lands. The thread's own resolution: the awkwardness of the "final archive step" is not the boundary's fault, it is the *non-determinism* of crossing it. Make the crossing deterministic and reversible (Decisions 1–3, and the follow-up `unarchive`) and the boundary becomes cheap in both directions — which is the actual fix. This is why determinism, not deletion, is the spine.

**Consequence for `sync` on active changes.** Because of the invariant, the *default* workflow still merges at archive. Standalone `sync` serves: the engine archive uses; `--check` (read-only, never pollutes `specs/`); and the opt-in "generated-artifact" workflow where a team chooses to commit merged `specs/` mid-review and gate it. The tool enables both policies; it does not force early merge.

## Decision 11 — Keep deltas; don't edit specs in place — and get early conflict resolution anyway

**Context.** The discussion pushed a deeper question than "remove archive": *are we simulating deltas above git when git already stores deltas?* The proposed alternative: edit `specs/` in place (the git diff **is** the delta), drop the delta folder, and keep the "why" in a sidecar reasoning log. Its sharpest argument is about **timing**: if in-flight changes are deltas applied at archive, conflicts surface late; editing the spec first "forces conflict resolution immediately."

**Decision.** Keep the delta layer; do **not** make in-flight edits directly to `specs/`. But **adopt the timing argument's goal** by moving conflict detection earlier with `sync --check` (Decision 12).

**Why keep deltas.** The delta layer is exactly what a raw git diff cannot give you: a clean separation between **proposed** and **shipped**. `specs/` always describes reality; multiple in-flight changes stay isolated and independently reviewable until each lands. Edit-in-place collapses that — proposed-but-unmerged or abandoned edits sit in the source of truth, and N parallel changes mutate the same files, so the only place conflicts can be resolved is one big merge at the end. The delta model makes each change a self-contained, reviewable unit and is what makes reversing one change (the follow-up `unarchive`) and isolation-preserving parallelism *possible at all*. Git stores byte deltas; OpenSpec's deltas are behavioral agreements one level up — they answer *why* and *what-should-be* before code exists, which a diff cannot.

**The synthesis — adopt the valid kernel.** Rather than discovering at archive that a delta no longer applies (or that two changes touched the same requirement), `sync --check` surfaces those conflicts at commit/PR time, deterministically, as a plain binary (Decision 12, "Cross-Change Conflict Detection"). So we get "resolve conflicts immediately" **without** sacrificing proposed-vs-shipped isolation. Same shape as Decision 5: adopt the goal, reject the mechanism that would break the invariant.

## Decision 12 — Provenance and delta↔spec correspondence

**Context.** The discussion wanted the "why" to travel with the "what": a consistency lint where a spec change with no delta — or a delta with no spec change — fails.

**Decision.** Record **provenance** as part of the applied-delta baseline: when the engine writes a spec change, it records which change and which delta operation produced it. Expose it (e.g. `openspec sync --explain` / a provenance entry). Use it for a deterministic **delta↔spec correspondence** check in `sync --check`: every committed `specs/` edit for a change must trace to one of its delta operations (no orphan edits), and every delta operation must have landed (no unapplied deltas). The prose "why" is not re-authored — provenance links each spec edit to its change, whose `proposal.md` already holds the rationale.

**Why this is the right slice.** Provenance falls out of the merge for free (the engine already knows exactly what it applied), and correspondence reuses the baseline. Together they answer the discussion's consistency lint *within the delta model* (deltas are the source; specs are generated) rather than inverting it (specs as source, deltas as sidecar log) — which would reintroduce the edit-in-place problems of Decision 11.

**Consumed by the follow-up.** The presentation side — a `git diff` driver that follows the provenance link and splices the change's rationale inline — is the follow-up's `openspec diff`. It needs no new data store because it consumes exactly the provenance recorded here.

## Decision 13 — Incremental checking (hash-optimized)

**Context.** The discussion asked for "hashes to optimize when checks are needed."

**Decision.** The applied-delta baseline already carries a per-spec digest. So `sync --check` (and any gate built on it) can skip any spec whose content digest is unchanged since it was last reconciled, and re-check only what changed. The correctness invariant: a skip is allowed *only* on an exact digest match against a recorded baseline; a mismatch, a missing baseline, or an unknown digest scheme forces a full check. So incremental mode is an optimization that can **never change a verdict** versus a full check — important for a gate. This makes the gate cheap enough to run on every commit even in a repo with hundreds of specs.

**Out of scope (recorded for the "just commit the spec" question).** The wish to commit "only the spec" and treat design/tasks as disposable runs against the reason those artifacts exist: in OpenSpec they *are* the reviewable, resumable product. The valid kernel — that not every change needs the full artifact set — is already served *outside this PR* by schema flexibility (a change can run a minimal schema). This PR neither needs nor changes that. The `format` canonicalizer that the same discussion asked for ("how the spec looks and reads") reuses this PR's canonicalizer and ships in the **follow-up** (`add-spec-tooling-suite`).

## Risks / trade-offs

- **Behavior shift for `/opsx:sync` users.** Replacing agent merge with deterministic merge changes output for anyone who relied on the agent's scenario-level merges. This is intended (it fixes [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246)), but it is a real change; call it out in the changeset and docs, and keep the conventions' "complete requirement, not a diff" rule prominent so deltas are authored to merge cleanly.
- **Baseline storage in the change folder.** Adds a small artifact; inert for spec-less changes. Format is scheme-tagged so canonicalization can evolve without silent mis-compares.
- **Baseline is forward-only.** Changes synced/archived before this feature have no baseline; `sync` establishes one on its next run, and the follow-up `unarchive` degrades gracefully for pre-baseline archives (specified there).

## Migration / rollout

Additive and phased (see tasks). The engine + baseline land first (no user-visible change to `archive` output). `openspec sync` is a new command in the expanded profile. `/opsx:sync` delegation ships with a changeset noting the determinism shift. The follow-up PR (`add-spec-tooling-suite`) adds `unarchive`, `format`, `diff`, and the unified `check` gate on top of the baseline this PR establishes.
