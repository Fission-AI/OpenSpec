## Why

The deterministic spec-merge **engine** and per-change **applied-delta baseline** land in the first-slice PR ([add-deterministic-spec-sync, #1279](https://github.com/Fission-AI/OpenSpec/pull/1279)): a byte-deterministic `openspec sync` that records, for every merged change, the pre-image, an applied-result digest, and per-edit provenance. That primitive was deliberately shipped alone so it could be reviewed and proven on its own.

This change spends that primitive. Four commands the design discussion asked for all fall out of the same baseline + canonicalizer, and none of them needs new merge machinery:

- **Reverse.** The baseline's pre-image makes archiving deterministically invertible — `openspec unarchive` restores `specs/` byte-exact and moves the folder back, atomically. Without it there is no undo for archive ([#682](https://github.com/Fission-AI/OpenSpec/issues/682)), and the manual `git` fix fails when the archive is buried in a multi-file commit.
- **Canonical form.** The engine already computes a canonical layout for every spec it writes. Pointed at authoring input, that same canonicalizer is `openspec format` — so synced/archived specs pass `format --check` *by construction*.
- **Review.** The provenance the baseline records is exactly what a spec-aware diff needs: `openspec diff` splices *what changed* (the delta) and *why* (the change's `proposal.md`) inline, with no new reasoning store.
- **One gate.** `openspec check` composes `format --check` + `sync --check` + `validate` behind a single verdict, with an opt-in pre-commit hook installer and a CI step — the same binary in both places.

## Prerequisite

Depends on **[#1279](https://github.com/Fission-AI/OpenSpec/pull/1279)** (`add-deterministic-spec-sync`): the merge engine, the applied-delta baseline (pre-image + digest + provenance), the shared `src/core/spec-canonical.ts` canonicalizer, and `openspec sync --check`. This change adds no new merge semantics; it builds commands on top. Merge #1279 first.

## What Changes

Ordered by leverage; every item reuses a primitive #1279 establishes.

1. **REVERSE — `openspec unarchive [change-name]` (`cli-unarchive` NEW; `opsx-unarchive-skill` NEW).** The deterministic inverse of archive: resolve the archived folder (prefix-tolerant, never auto-picking among ambiguous matches), reverse the spec merge from the baseline under a **drift guard** (refuse rather than clobber a requirement a later change has since touched), move the folder back to `changes/<name>/`, **atomically** ("Abort. No files were changed."). `--keep-specs` restores the folder without touching `specs/` (the always-safe escape hatch, mirror of archive's `--skip-specs`). Changes archived before the baseline existed degrade gracefully — reverse the self-invertible half (ADDED/RENAMED), refuse to guess the rest, all-or-nothing. `/opsx:unarchive` delegates entirely to the CLI. (design Decisions 6–10.)

2. **CANONICAL — `openspec format [target]` (`cli-format` NEW).** A deterministic, **behavior-preserving** formatter for spec and delta files, with a `--check` gate, sharing **one canonicalizer** with the merge engine (`src/core/spec-canonical.ts` from #1279). The engine's output is, by construction, exactly what the formatter produces: synced/archived specs always pass `format --check`. Behavior-preserving means it normalizes only presentation (whitespace, blank-line policy, list markers, heading spacing, canonical delta-section headers); it never reorders requirements/scenarios or rewrites prose — `parse-before == parse-after`. Incremental via the baseline digest; `--json`-capable; pure text, so no `/opsx:format` skill. It is *not* `validate` (semantic) and *not* code-vs-spec `verify` (inference). (design Decision 14.)

3. **REVIEW — `openspec diff [target] [--base <ref>]` (`cli-diff` NEW).** A deterministic, pure-code renderer that shows requirement-level spec changes with each change's **provenance and rationale spliced inline** (what changed and why, together), usable standalone or, opt-in, as a **git diff driver** via `.gitattributes`. The key move: OpenSpec **already has the "log"** — the *why* is in `proposal.md`, the *what/where* is the applied-delta provenance #1279 records — so `diff` joins existing artifacts rather than building a sidecar reasoning database. No inference; honest about unattributable (pre-baseline) changes; never modifies git config without opt-in. (design Decision 15.)

4. **ONE GATE — `openspec check [--fix] [--all]` (`cli-check` NEW).** The unified deterministic linter: runs `format --check`, `sync --check`, and `validate` in one invocation, exiting non-zero on any failure. **The same binary for pre-commit and CI** — a drift gate is a pure function of the committed files, so *where* it runs never changes the verdict. Ships a runner-agnostic, opt-in **hook installer** and a copy-paste **CI step** — no model, no API keys. `--fix` does mechanical remediation only (`format --fix` + `sync --fix`); non-mechanical failures (an un-appliable delta, a cross-change conflict) are reported and still fail. (design Decision 16.)

## Capabilities

### New Capabilities

- `cli-unarchive`: `openspec unarchive [change-name]` — the deterministic inverse of archive. Resolves an archived change (prefix-tolerant, never auto-picking ambiguous matches), reverses the spec merge from the baseline under a drift guard, moves the folder back, atomically. `--keep-specs` restores the folder without touching `specs/`; pre-baseline archives degrade gracefully (all-or-nothing).
- `opsx-unarchive-skill`: a `/opsx:unarchive` workflow skill that delegates to `openspec unarchive` for all deterministic work (selection, confirmation, rendering only). Expanded profile; no cross-skill dependency.
- `cli-format`: `openspec format [target]` — a deterministic, behavior-preserving spec/delta formatter sharing one canonicalizer with the merge engine, so synced/archived specs are canonical by construction. `--check` is a read-only, model-free gate that names unformatted files; `--fix`/default writes canonical form; incremental via digests; `--json`-capable. Pure text — no agent, no `/opsx:format` skill.
- `cli-diff`: `openspec diff [target] [--base <ref>]` — a deterministic, spec-aware diff that splices each changed requirement's provenance and rationale inline (what changed and why, together), usable standalone or as an opt-in git diff driver. Renders from the change's `proposal.md` + the recorded applied-delta provenance — no new reasoning store; no inference; `--json`-capable.
- `cli-check`: `openspec check [--fix] [--all]` — the unified deterministic linter that runs `format --check`, `sync --check`, and `validate` in one invocation, exiting non-zero on any failure. The **same binary for pre-commit and CI** (identical verdict in both); `--fix` applies mechanical auto-remediation (never invents resolutions); incremental via digests; `--json`. Ships with a runner-agnostic opt-in hook installer and a copy-paste CI step — no model, no API keys.

## Impact

Builds on #1279's `src/core/specs-apply.ts` (baseline + inverse), `src/core/spec-canonical.ts` (shared canonicalizer), and the recorded provenance.

- `src/core/unarchive.ts` (**new**) — `UnarchiveCommand`: resolve archived dir, drift-check, restore pre-images (or delta-invert / refuse for pre-baseline), move folder back, atomic abort. Reuse `moveDirectory()`/`copyDirRecursive()` ([src/core/archive.ts:96-128](../../../src/core/archive.ts)); add the inverse merge (delta-inversion for ADDED/RENAMED; pre-image restore for all ops) to `specs-apply.ts`.
- `src/core/format.ts` (**new**) — `FormatCommand` (default/`--fix`/`--check`, `--json`, incremental): runs the shared canonicalizer over main specs and active-change delta files; `--check` lists non-canonical files and exits non-zero without writing.
- `src/core/diff.ts` (**new**) — `DiffCommand` (`--base`, `--json`): renders requirement-level spec/delta changes annotated with provenance (from the baseline) and rationale (from the originating change's `proposal.md`); pure code; also invocable as a git diff driver. Plus a documented `.gitattributes` snippet for opt-in registration.
- `src/core/check.ts` (**new**) — `CheckCommand` (`--fix`, `--all`, `--json`, incremental): composes `format --check`, `sync --check`, and `validate` into one gate with a single exit-code/JSON contract; `--fix` runs `format --fix` + `sync --fix`. Plus an opt-in hook installer (composes with existing hooks, never auto-installs) and a committed CI workflow template that runs `openspec check`.
- `src/core/list.ts` / `src/core/view.ts` — reuse `getArchivedChangesData()` ([#399](https://github.com/Fission-AI/OpenSpec/pull/399)) to resolve/disambiguate archived candidates.
- `src/cli/index.ts` — register `unarchive [change-name]` (`--keep-specs`/`--skip-specs` alias, `-y/--yes`, `--no-validate`, `--json`, `--store`), `format [target]` (`--check`, `--fix`, `--json`), `diff [target]` (`--base`, `--json`), and `check` (`--fix`, `--all`, `--install-hook`, `--json`), mirroring archive.
- `src/core/templates/workflows/unarchive-change.ts` (**new**) — `/opsx:unarchive` delegating to the CLI. Registration: export from `skill-templates.ts`; add `unarchive` to `ALL_WORKFLOWS` ([src/core/profiles.ts:19](../../../src/core/profiles.ts)) and `WORKFLOW_TO_SKILL_DIR` ([src/core/init.ts:65](../../../src/core/init.ts)); **not** to `CORE_WORKFLOWS`. `docs/opsx.md` gains a `/opsx:unarchive` row.
- Tests — archive→unarchive byte-exact round-trip, drift refusal, `--keep-specs`, destination-collision abort, pre-baseline all-or-nothing degradation, atomic "no files changed"; formatter determinism + idempotency + `parse-before==parse-after` + `sync`/`archive` output passes `format --check`; diff determinism + provenance/rationale annotation + honest "unattributable" handling + opt-in-only git config; `check` aggregates the sub-gates, `--fix` remediates mechanical drift but still fails on conflicts, hook-vs-CI verdict parity. Per [openspec/config.yaml](../../config.yaml), run on Windows CI.

## Issues addressed

All references verified against `Fission-AI/OpenSpec` at `main` (`546224e`, #1248).

Delivers the remaining Discord conclusions (beyond #1279's `sync`):

- **`openspec unarchive` / `/opsx:unarchive`** that "moves the folder back and reverses the spec merge," including the hard case where the archive is buried in a multi-file commit.
- **Deterministic spec formatter/linter** *("the framework's goal is how the spec looks and reads and is organized")* → `openspec format` + `--check`, sharing the engine's canonicalizer.
- **Spec-aware diff with reasoning inline** *("review primarily becomes reading the spec deltas" + "a spec-aware diff driver that splices the reasoning log inline")* → `openspec diff`, rendering from existing proposal + provenance.
- **The pre-commit / CI gate** *("sync is a lint step… run within CI/tooling much like linters" / eslint-`--fix`)* → `openspec check`, the same binary for both, with an opt-in hook installer and a CI template.

Directly fixes / strengthens:

- [#682](https://github.com/Fission-AI/OpenSpec/issues/682) — archive "is not transactional… there's no rollback." `unarchive` is that rollback, itself atomic.
- [#863](https://github.com/Fission-AI/OpenSpec/issues/863) — the archive/sync skill re-implements deterministic work instead of calling the CLI. `/opsx:unarchive` is CLI-first (as `/opsx:sync` becomes in #1279).

Delineated from adjacent work (coordinate, don't collide):

- [#409](https://github.com/Fission-AI/OpenSpec/issues/409) / [#787](https://github.com/Fission-AI/OpenSpec/pull/787) / [#1192](https://github.com/Fission-AI/OpenSpec/issues/1192) (archive-folder prefix scheme) — unarchive's resolver is prefix-tolerant; it does not pick a scheme.
- [add-change-stacking-awareness](../add-change-stacking-awareness/proposal.md) — planning-time archive ordering. Unarchive's drift guard is the runtime spec-layer counterpart; the two compose.
- [#709](https://github.com/Fission-AI/OpenSpec/issues/709) (`git mv`) — a shared `moveDirectory()` makes a future switch cover both archive and unarchive directions.
- [#1245](https://github.com/Fission-AI/OpenSpec/issues/1245) — first-class lifecycle timestamps. If/when `archived` is persisted, `unarchive` should clear it; noted, not built.

Out of scope: **inference-based review/verification** — semantic review or code-vs-spec checking needs a model; that is the `verify` direction ([#880](https://github.com/Fission-AI/OpenSpec/issues/880)), distinct from the deterministic `diff`/`format`/`check` here. And **owner policy** — *which* hook runner to standardize and whether the `check` gate is enabled by default are the owner's call; the capability (command + opt-in installer + CI template) is built here.
