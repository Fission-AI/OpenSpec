# Design: spec tooling on the merge baseline — `unarchive`, `format`, `diff`, `check`

## Context

The first-slice PR [add-deterministic-spec-sync (#1279)](https://github.com/Fission-AI/OpenSpec/pull/1279) builds the primitive: a deterministic, idempotent merge engine, a per-change **applied-delta baseline** (pre-image + applied-result digest + per-edit provenance), a shared canonicalizer (`src/core/spec-canonical.ts`), and `openspec sync --check`. This change builds the four commands that consume that primitive. It adds **no new merge semantics** — every decision here spends a capability #1279 already established.

Decision numbers continue #1279's (which kept 1–5, 11–13); this document holds **6–10** (unarchive) and **14–16** (format, diff, check). The rejected-alternatives that shape the model (keep `archive`; keep deltas; don't invert specs-as-source) live in #1279's Decisions 5, 11, 13 and are not repeated.

## Goals / Non-Goals

**Goals**
- Reversible: `unarchive` restores `specs/` exactly and moves the folder back, atomically, under a drift guard (Decisions 6–9).
- A deterministic, behavior-preserving spec formatter (`openspec format` + `--check`) sharing one canonicalizer with the merge engine (Decision 14).
- A deterministic spec-aware diff (`openspec diff`, opt-in git diff driver) that splices provenance + rationale inline, reusing existing artifacts (Decision 15).
- A unified deterministic linter `openspec check` (+ `--fix`, `--all`, incremental) wired to run identically as a pre-commit hook and a CI gate, with an opt-in hook installer and a CI template (Decision 16).
- Skills (`/opsx:unarchive`) delegate to the CLI; the agent never performs deterministic work.
- Backward compatible with changes archived before the baseline existed (Decision 9).

**Non-Goals**
- Re-deriving the merge engine, baseline, or canonicalizer — those are #1279.
- Inference-based "align spec to implementation" / code-vs-spec checking — needs a model; the `verify` direction (#880), out of scope (Decisions 14, 16).
- Wiring a *specific* hook runner or enabling the gate by default — owner policy (Decision 16); the command + opt-in installer + CI template are built.
- Bulk `unarchive`, an archive-folder prefix scheme, lifecycle timestamps — accommodated, not built (Decisions 6, 10).
- Semantic/AI summarization in the diff — `diff` mechanically splices recorded reasoning (Decision 15).

## Decision 6 — `unarchive`: resolution, prefix-tolerance, never auto-pick

**Decision.** `unarchive [change-name]` accepts a bare `<name>` or a full archived directory id, treating the leading prefix as **opaque up to `<name>`** — strips `YYYY-MM-DD-` today, tolerates `NNN-`/ISO/configurable ([#409](https://github.com/Fission-AI/OpenSpec/issues/409)/[#787](https://github.com/Fission-AI/OpenSpec/pull/787)/[#1192](https://github.com/Fission-AI/OpenSpec/issues/1192)). Multiple matches for a bare name → interactive prompt (most-recent first, never auto-select); `--json`/non-interactive → error listing candidates, require the full id. Reuse `getArchivedChangesData()` ([#399](https://github.com/Fission-AI/OpenSpec/pull/399)).

**Why.** Multiple archives of one name already happen (different dates), and a sequence scheme makes it routine. Silent selection is a guess on the rare, costly path.

## Decision 7 — Reverse under a drift guard, atomically

**Decision.** Before reversing any spec, compare its current content to the baseline's applied-result digest. On drift (a later change touched the same requirement — [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246), [add-change-stacking-awareness](../add-change-stacking-awareness/proposal.md)), **refuse** and point to `--keep-specs`. The reversal runs as a defined **validate → stage → commit** sequence: (1) validate destination-absent + all affected specs present and drift-free; (2) compute reversed specs into a temporary staging area under `.openspec/` (no change to `specs/` yet); (3) swap staged specs into `specs/`; (4) move the folder. A failure in steps 1–2 leaves everything untouched; a failure of step 4 after the swap rolls `specs/` back from the still-present baseline. On any failure: *"Abort. No files were changed."*; if rollback itself cannot complete, report the partial state and exact recovery steps rather than leave a silent inconsistency.

**Why.** Restoring a pre-image over a requirement a later change modified would silently delete that change's contribution — the loss OpenSpec guards against. Refusing is strictly safer, and `--keep-specs` always lets the user proceed. Atomicity gives archive the rollback [#682](https://github.com/Fission-AI/OpenSpec/issues/682) noted it lacks, and matches the abort contract [#1112](https://github.com/Fission-AI/OpenSpec/issues/1112) describes.

## Decision 8 — `--keep-specs` and naming vs. `--skip-specs`

**Decision.** `--keep-specs` moves the folder back and leaves `specs/` untouched — always deterministic, always safe. Primary spelling `--keep-specs` (reads naturally for the inverse). Accept `--skip-specs` as a hidden alias for muscle-memory symmetry with archive ([#28](https://github.com/Fission-AI/OpenSpec/pull/28)). When `unarchive` cannot safely reverse specs (drift, or pre-baseline REMOVED/MODIFIED) and `--keep-specs` was not given, it refuses and *recommends* `--keep-specs` — it does not silently fall back. **Open for owner confirmation:** if strict symmetry is preferred, swap which spelling is primary.

## Decision 9 — Backward compatibility: pre-baseline archives

**Decision.** Changes archived before baselines existed have none. Pre-baseline reversal is **all-or-nothing**: if every delta operation across all affected specs is ADDED/RENAMED (self-invertible), `unarchive` reverses the whole change by delta inversion; if any MODIFIED/REMOVED is present anywhere (pre-image unrecoverable), it **refuses the entire spec reversal** — naming the requirements it cannot restore and directing to `--keep-specs` (optionally offering opt-in git recovery of the pre-image). It does **not** partially reverse the self-invertible specs and leave the rest, because a partial `specs/` is exactly the corruption the atomic guarantee (Decision 7) exists to prevent. A later `openspec sync` (from #1279) establishes a baseline on its next run. Never silently emit a wrong spec.

**Why.** The feature must be useful on day one, including for already-archived changes, without ever degrading into corruption. Reverse what is provably reversible; stop honestly on the rest.

## Decision 10 — Move strategy and lifecycle metadata

- **Move**: reuse `moveDirectory()`/`copyDirRecursive()` ([src/core/archive.ts:96-128](../../../src/core/archive.ts)) and their Windows fallbacks ([#605](https://github.com/Fission-AI/OpenSpec/pull/605)). A future `git mv` ([#709](https://github.com/Fission-AI/OpenSpec/issues/709)) covers both directions through this one helper.
- **Metadata**: archive persists no `archived` timestamp today (only the folder-name prefix). If [#1245](https://github.com/Fission-AI/OpenSpec/issues/1245) lands one, `unarchive` should null it on restore — noted, not built.

## Decision 14 — The deterministic spec formatter (`openspec format`)

**Context.** The discussion wanted the framework's job to include "how the spec looks and reads and is organized/formatted" — a linter/formatter, hash-optimized. The merge engine (#1279) *already* computes a canonical form for every spec it writes. A standalone formatter is that same canonicalizer pointed at authoring input.

**Decision.** Add `openspec format [target]` — a deterministic, pure-code formatter for spec and delta files — with `--check` (read-only gate) and `--fix`/default (write). It shares the one canonicalizer with `sync`/`archive` (`src/core/spec-canonical.ts` from #1279), so **the merge engine's output is, by construction, exactly what the formatter produces**: synced/archived specs always pass `format --check`. It is incremental (the baseline's digest skip) and `--json`-capable, and it joins `sync --check` as a model-free gate.

**Behavior-preserving — the hard line.** The formatter changes only *presentation*: whitespace, blank-line policy, list markers/indentation, heading spacing, canonical delta-section headers. It MUST NOT reorder requirements or scenarios (order can carry meaning), rewrite prose, or add/remove/merge/split requirements. The invariant is testable: parse-before == parse-after (same requirements, scenarios, and delta operations); only surrounding whitespace may differ. This is what separates a *formatter* (safe, deterministic, automatic) from a *rewrite* (semantic, requires review).

**What it is NOT.** Not `validate` (semantic validity) — they compose (`format` then `validate`). Not the inference-based "align spec to implementation" — that needs a model and is the `verify` direction ([#880](https://github.com/Fission-AI/OpenSpec/issues/880)), out of scope. `format` is pure text canonicalization, so it needs no agent and no `/opsx:format` skill.

**Why share one canonicalizer.** One canonicalizer specified and tested once, reused by `sync`, `archive`, and `format`, guarantees they cannot diverge. A separate formatter implementation would risk disagreeing with the merge engine's output — the exact drift this toolchain exists to kill. This is why `format` belongs adjacent to the engine, not as an independent tool.

## Decision 15 — The spec-aware diff driver (`openspec diff`)

**Context.** The discussion's review workflow: "review primarily becomes reading the spec deltas (in git)" with "a spec-aware diff driver that splices the reasoning log inline so reviewers see what changed and why together," and a related idea of a sidecar database of "semantic deltas as log entries."

**Decision.** Add `openspec diff [target] [--base <ref>]` — a deterministic, pure-code renderer that shows requirement-level spec changes with each change's provenance and rationale spliced inline. Usable standalone and, opt-in, as a **git diff driver** (registered in `.gitattributes`) so `git diff` over spec/delta paths renders the annotated view.

**Key insight — OpenSpec already has the "log"; no new store.** The discussion reached for a separate database of semantic deltas plus a reasoning log. But OpenSpec already keeps both halves: the *why* lives in the change's `proposal.md`, and the *what/where* lives in the applied-delta provenance #1279 records. The diff driver simply joins them. So we explicitly **reject building a sidecar reasoning database** and instead render from artifacts that already exist — less to maintain, nothing to keep in sync.

**Deterministic and honest.** Rendering is a pure function of the git diff + recorded provenance + proposal text — byte-identical across runs and platforms, no inference. When a change cannot be attributed (a pre-baseline edit with no provenance), the diff says so rather than inventing a rationale. It does **not** judge review quality or summarize semantically (that would need a model); it mechanically splices recorded reasoning. Git config is never modified without explicit opt-in.

## Decision 16 — `openspec check`: the unified deterministic linter for pre-commit *and* CI

**Context.** The discussion's recurring ask: the sync/format gate should run "like a linter," both as a pre-commit hook (eslint-`--fix` style) and as a CI drift gate, with no model in CI. Pre-commit *or* CI? **Both — it is the same binary invoked in two places.** A drift gate is a pure function of the committed files; *where* it runs changes nothing about the verdict.

**Decision.** Add `openspec check` — one command that runs the deterministic gates (`format --check`, `sync --check`, `validate`) and exits non-zero on any failure, with `--fix` for auto-remediation, `--all` for cross-change checks, incremental digest skipping, and `--json`. Ship the two integration points as well: a **runner-agnostic, opt-in hook installer** and a **copy-paste CI step**. This is the single entrypoint pre-commit and CI both call (so neither has to know the individual sub-checks).

**Why one command, not three.** A hook or CI job shouldn't hard-code `format --check && sync --check && validate` and drift out of step with the toolchain. `openspec check` is the stable contract; the sub-gates can evolve behind it. It also gives one exit-code/`--json` shape for both contexts.

**Pre-commit vs CI — same gate, complementary placement.** Pre-commit catches drift at authoring time and can `--fix` in place before the commit (fast feedback, fewer red CI runs). CI is the backstop that enforces the gate regardless of local setup (someone without the hook, or `--no-verify`). Because the verdict is identical and deterministic, the two never disagree. Recommended posture: hook runs `--fix` (convenience), CI runs `--check` (enforcement).

**Honesty under `--fix`.** `--fix` only applies *mechanical* remediation (format + sync regeneration). Non-mechanical failures — a delta that doesn't cleanly apply, a cross-change conflict — are reported and still fail; `--fix` never invents a resolution or masks a real conflict.

**Scope note.** The one thing left to the owner is policy: which runner to standardize and whether the gate is on by default. The inference-based "align spec to implementation" remains out (it needs a model — the `verify` direction, #880).

## Risks / trade-offs

- **Forward round-trip is not guaranteed identity.** `unarchive` restores the exact pre-archive `specs/`; a *subsequent* re-archive re-runs the forward merge, which inherits archive's existing cross-change caveats ([#1246](https://github.com/Fission-AI/OpenSpec/issues/1246)). Documented, not solved here.
- **Depends on #1279's baseline shape.** If the baseline format changes during #1279 review, `unarchive`/`format`/`diff` follow it. The scheme tag makes evolution safe (unknown scheme → treated as no baseline, degrade per Decision 9).
- **Sequencing.** This PR should merge after #1279. Until then it is reviewable but not independently buildable (its commands call #1279's engine/baseline).

## Migration / rollout

Additive. `unarchive`, `format`, `diff`, and `check` are new commands in the expanded profile. `/opsx:unarchive` ships in the expanded profile (not core). The `openspec check` gate, opt-in hook installer, and CI template ship here; enabling the gate by default is the owner's policy call. Pre-baseline archives degrade per Decision 9.
