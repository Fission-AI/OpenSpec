## Why

The spec merge (delta → `specs/`) is **the** load-bearing operation in OpenSpec, yet today it is reachable only two ways — buried *inside* `openspec archive` (fused to the folder move), or performed by an **AI agent** in `/opsx:sync` ("This is an agent-driven operation… you will read delta specs and directly edit main specs"). The agent path is non-deterministic: its "intelligent" scenario-merge is the very mechanism that silently drops scenarios in [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246). The deterministic engine `applySpecs()` ([src/core/specs-apply.ts:391](../../../src/core/specs-apply.ts)) has **zero callers** — it cannot be run on its own.

So you cannot gate spec drift in CI without a model, you cannot cleanly re-merge a revised delta, and you cannot catch merge conflicts before archive. One missing primitive sits under all of it. This change builds it: a deterministic, idempotent spec-merge **engine** plus a per-change **applied-delta baseline**, exposed as a first-class `openspec sync` command and shared by `archive`.

## Scope: the first slice (this PR)

This is deliberately the **spine**, not the whole toolchain. Per review ([@alfred-openspec on #1279](https://github.com/Fission-AI/OpenSpec/pull/1279): *"narrow the first slice to deterministic merge/baseline, sync check/fix, archive using that path, and CLI-delegated /opsx:sync, then split unarchive, format, and diff into follow-ups once the primitive is proven"*), this PR ships exactly that first slice:

1. the deterministic, idempotent merge **engine** + the **applied-delta baseline**;
2. `openspec sync` with its model-free `--check` gate and `--fix`;
3. `openspec archive` routed through the same engine (records the baseline);
4. `/opsx:sync` delegating to the CLI instead of merging in the agent.

The commands that **build on** this baseline — `unarchive` (reverse), `format` (canonical), `diff` (spec-aware review), and the unified `check` gate — ship as a **follow-up PR** once the primitive is proven. See "Follow-up" below.

## The primitive: one applied-delta baseline

When a change's deltas are merged into `specs/` (by `sync` or `archive`), record a per-change **applied-delta baseline**: for each affected spec, the **pre-merge content** (the pre-image, or an explicit `absent` marker when the spec is created) plus a **digest of the applied result** (newline-normalized, scheme-tagged), and the **provenance** of each edit (which change and delta op produced it). The baseline lives with the change; when archived, it travels into the archive folder.

One primitive, three payoffs (design Decision 1): idempotent crumb-free re-merge = reverse the old delta via the pre-image, then apply the new; deterministic drift detection = current `specs/` digest ≠ baseline digest; and (in the follow-up) byte-exact reverse for `unarchive`. Building one mechanism and deriving the rest is why this is the spine.

## What Changes

Design principle the whole thread converges on, and the one this project is already adopting elsewhere ([#1277](https://github.com/Fission-AI/OpenSpec/pull/1277), prevent-silent-spec-drop): **the merge is pure parser code that produces byte-identical output for the same delta + base; the agent never performs it.** Ordered by leverage:

1. **THE ENGINE — deterministic, idempotent merge core (`cli-sync` NEW, shared by archive).** Promote the existing `applySpecs()`/`buildUpdatedSpec` into a first-class, **byte-deterministic** apply that records the applied-delta baseline, and make it idempotent (re-running is a no-op; a revised delta regenerates `specs/` with no crumbs). `openspec archive` keeps merging-then-moving but routes its merge through this shared core and writes the baseline before moving, so it travels into the archive.

2. **FORWARD COMMAND + DRIFT GATE — `openspec sync [change]` (`cli-sync` NEW).** Apply a change's deltas to `specs/` without archiving, deterministically and idempotently:
   - default / `--fix`: write `specs/` to the regenerated result (idempotent; a revised delta regenerates with no crumbs);
   - `--check`: read-only; exit non-zero if the deltas are not cleanly appliable, or (when `specs/` has been synced) if committed `specs/` ≠ the regenerated output. This is the **codegen/IaC-style drift gate CI runs as a plain binary — no model, no API keys.**

   `--check` also surfaces conflicts **early** — a delta that no longer applies to the current base, or two active changes targeting the same requirement — at commit/PR time instead of at archive (design Decision 11). The engine records **provenance**, enabling a deterministic delta↔spec correspondence check (orphan edit / unapplied delta → fail; design Decision 12). Because the baseline carries a per-spec digest, `--check` is **incremental** — it re-checks only what moved, so the gate stays cheap even in a large repo, and the incremental verdict always equals the full verdict (design Decision 13).

3. **NO MODEL IN THE MERGE — `/opsx:sync` delegates to the CLI (`specs-sync-skill` MODIFIED).** `/opsx:sync` stops doing agent-driven edits and **invokes `openspec sync`**. The deterministic work lives in TypeScript; the skill only selects, confirms, and renders. This removes the [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246) "intelligent merge drops scenarios" failure mode by construction, and is the direction [#863](https://github.com/Fission-AI/OpenSpec/issues/863)/[#799](https://github.com/Fission-AI/OpenSpec/issues/799)/[#656](https://github.com/Fission-AI/OpenSpec/issues/656) ask for.

### What this deliberately does *not* change

The discussion proposed removing `archive` and folding the spec merge into `apply`. **Rejected, and it shapes the design:** `specs/` only ever describes *shipped* reality; folding the merge into `apply` would let proposed-but-unmerged (or abandoned) changes pollute the source of truth and let parallel changes step on each other's specs before any land. So the archive boundary stays; what changes is that crossing it becomes deterministic. The determinism is what makes the boundary cheap — the real fix for the "awkward final step" (design Decision 5).

The discussion also proposed editing `specs/` in place (the git diff *is* the delta) with a sidecar reasoning log. **Also rejected:** the delta layer is precisely what a raw git diff cannot give — clean isolation of *proposed* from *shipped*, so `specs/` stays canonical while several in-flight changes remain independently reviewable. Its sharpest kernel is valid and adopted: "editing the spec first forces conflict resolution now" → `sync --check` moves conflict detection early (design Decisions 11–12).

## Capabilities

### New Capabilities

- `cli-sync`: the deterministic, idempotent spec-merge engine exposed as `openspec sync [change]` — `--fix`/default writes `specs/` from the change's deltas (byte-identical for the same delta + base; re-running is a no-op; a revised delta regenerates with no crumbs); `--check` is a read-only, model-free gate for CI and pre-commit that also surfaces conflicts early (delta-vs-base, and two active changes on one requirement) and verifies delta↔spec correspondence. Records a per-change applied-delta baseline (pre-image + digest + provenance) that powers idempotent re-merge, drift detection, and tracing each spec edit to its delta. The same engine `archive` uses internally.

### Modified Capabilities

- `cli-archive`: routes its spec merge through the shared deterministic engine and records the applied-delta baseline inside the change folder before moving it, so archiving becomes deterministically reversible (unlocking the follow-up `unarchive`). Forward-only and backward-compatible — no change to how archive merges, moves, validates, or what it prints.
- `specs-sync-skill`: `/opsx:sync` delegates the merge to the deterministic `openspec sync` CLI instead of performing agent-driven edits to `specs/`, making the result byte-deterministic and removing the scenario-dropping "intelligent merge" failure mode. The skill handles selection, confirmation, and output only.

## Follow-up (separate PR)

Once this primitive is proven, a follow-up PR (`add-spec-tooling-suite`) adds the commands that build on the same baseline and canonicalizer:

- `openspec unarchive` (+ `/opsx:unarchive`) — the deterministic inverse of archive: byte-exact reverse from the baseline pre-image under a drift guard, atomically.
- `openspec format` — a deterministic, behavior-preserving spec formatter sharing **one canonicalizer** with this engine, so synced/archived specs pass `format --check` by construction.
- `openspec diff` — a spec-aware diff that splices the provenance this PR records + the change's rationale inline; opt-in git diff driver.
- `openspec check` — the unified deterministic linter (`format --check` + `sync --check` + `validate`) plus an opt-in pre-commit hook installer and a CI step — the same binary for both.

## Impact

- `src/core/specs-apply.ts` — make `buildUpdatedSpec`/`applySpecs` byte-deterministic and idempotent; add baseline read/write. Forward output unchanged for existing callers.
- `src/core/spec-canonical.ts` (**new**) — extract the deterministic spec/delta canonicalizer (the recomposition `buildUpdatedSpec` already performs at [specs-apply.ts:311-348](../../../src/core/specs-apply.ts)) into one shared module, so the merge engine's output is canonical by construction. Behavior-preserving: `parse(canonicalize(x)) == parse(x)`. (Reused by the follow-up `format`.)
- `src/core/sync.ts` (**new**) — `SyncCommand` (default/`--fix`/`--check`, `--json`), mirroring `ArchiveCommand`'s human + `--json` shape; writes/refreshes the applied-delta baseline; records provenance; incremental `--check`.
- `src/core/archive.ts` — route the merge through the shared engine (already deterministic) and persist the baseline before `moveDirectory` (~414-506). No behavior/output change.
- `src/core/change-metadata/` or a sibling baseline store — persist the applied-delta baseline per change (pre-image + digest, newline-normalized, scheme-tagged). Coordinate the digest convention with [#1278](https://github.com/Fission-AI/OpenSpec/pull/1278)'s digest ledger.
- `src/cli/index.ts` — register `sync [change]` (`--check`, `--fix`, `--all`/`--changes` for CI fan-out, `--json`, `--store`), mirroring archive (326-343).
- `src/core/templates/workflows/sync-specs.ts` — rewrite `/opsx:sync` to invoke `openspec sync` (drop agent-driven edits). `docs/opsx.md` gains a determinism note for `/opsx:sync`.
- Tests — byte-identical sync determinism (same delta+base → same bytes; CRLF/LF; Windows), idempotency (re-run no-op; revised delta no crumbs), `--check` exit codes, provenance + correspondence, incremental verdict == full verdict, skill-template delegation snapshots. Per [openspec/config.yaml](../../config.yaml), run on Windows CI.

## Issues addressed

All references verified against `Fission-AI/OpenSpec` at `main` (`546224e`, #1248). Delivers the Discord thread's deterministic-sync conclusion — *"the right fix is a deterministic, code-only openspec sync/archive path that CI can run as a plain binary… no model in CI"* — as `openspec sync` + `--check`.

Directly fixes / strengthens:

- [#863](https://github.com/Fission-AI/OpenSpec/issues/863), [#799](https://github.com/Fission-AI/OpenSpec/issues/799), [#656](https://github.com/Fission-AI/OpenSpec/issues/656) — "the sync skill re-implements the merge instead of calling the CLI." `/opsx:sync` becomes CLI-first; the merge is one deterministic code path.
- [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246) — the agent "intelligent merge" silently drops scenarios. Deterministic whole-block apply (per the conventions spec's "complete modified requirement, not a diff") removes the failure mode, and the baseline retains the pre-image #1246 wants for drift detection.
- [#1112](https://github.com/Fission-AI/OpenSpec/issues/1112) — MODIFIED/REMOVED/RENAMED-from headers absent from base pass `validate` but abort at archive. `sync --check` surfaces the same appliability check earlier, as a gate.

Delineated from adjacent work (coordinate, don't collide):

- [#1278](https://github.com/Fission-AI/OpenSpec/pull/1278) (sibling) — artifact-graph drift (proposal→design→tasks staleness) via a content-digest ledger. This PR is the *spec-merge* drift layer (delta→`specs/`). Same digest philosophy, different layer; share the newline-normalization convention.
- [add-change-stacking-awareness](../add-change-stacking-awareness/proposal.md) — planning-time archive ordering. `sync`'s idempotency and cross-change `--check` are the runtime spec-layer counterpart; the two compose.

Out of scope here (moved to the follow-up PR, with reasons in design.md): `unarchive` and its reverse/drift-guard machinery (Decisions 6–10); the `format` canonicalizer-for-authoring (Decision 14); the spec-aware `diff` driver (Decision 15); the unified `check` gate + hook/CI wiring (Decision 16). Inference-based code-vs-spec verification (the `verify` direction, [#880](https://github.com/Fission-AI/OpenSpec/issues/880)) is out of scope for both.
