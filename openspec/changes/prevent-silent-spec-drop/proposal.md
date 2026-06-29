## Why

A spec-driven change can complete the whole workflow — propose, implement, archive — while **silently leaving `openspec/specs/` stale**, with no error and no recovery path. It is the most-reported correctness defect in the tracker, and a deep read of the issue cluster (#1212, #1250, #656, #863, #164, #194, #997, #1260, #1222, #1264, #799, and the live Discord reports) shows it is not one bug but **one architectural fault expressed at four layers**:

> Correctness-critical decisions live in **agent prompts**, not in deterministic CLI logic. Skills are asked to *judge* what a "delta spec" is, *decide* whether to sync, and *track* a loop termination — and agents (GPT-5.x, Claude, others) get these judgments wrong often enough to silently lose spec data.

### The four layers

1. **The propose/ff loop stops too early (and non-deterministically).** Both skills loop over artifacts and *"Stop when all `applyRequires` artifacts are done"* (`ff-change.ts:72`), reading `applyRequires` from the schema. For `spec-driven`, `applyRequires` is `[tasks]` — it excludes `specs` — so the loop can end before `openspec instructions specs` is ever called. Because it depends on the agent's path through "ready" artifacts, it is intermittent: the author of PR #1250 **could not reproduce it** on a greenfield project, while others hit it constantly. Anything intermittent in a prompt must be made deterministic in the CLI. (#1212, #1260)

2. **The archive skill bypasses the CLI entirely (the keystone).** `/opsx:archive` does **not** call `openspec archive`. It *assesses sync state by agent judgment* (`archive-change.ts:58-60`: "If none exist, proceed without sync prompt"), optionally invokes a separate agent-driven `openspec-sync-specs`, then moves the change with a raw `mkdir` + `mv` (`archive-change.ts:86-88`). Every deterministic check and the deterministic delta-merge in `src/core/archive.ts` is **never executed for agent workflows**. The `opsx-archive-skill` spec encodes this: it mandates the skill *move* the directory and *prompt-or-skip* sync on judgment. (Filed as #656 and #863.)

3. **Even when reached, the archive CLI skips its own validation.** `openspec validate` runs `validateChangeDeltaSpecs` unconditionally; `openspec archive` runs it only inside `if (hasDeltaSpecs)` (`archive.ts:282`), gating the check on the presence of the very thing whose absence is the bug. This hides **three** drop modes:
   - **Total drop** — no `specs/` at all (#1212, #1222).
   - **Partial drop** — proposal declares capabilities `a,b,c`, ships a delta for `a` only.
   - **Format drop (the Discord case)** — `specs/<cap>/spec.md` exists but as a **full** spec (`## Purpose`/`## Requirements`) instead of a **delta** spec (`## ADDED/MODIFIED/REMOVED/RENAMED Requirements`); the delta-header regex misses it and archive reports "No delta specs." (#164, #194, Discord)

4. **It must not over-correct.** Some schemas legitimately have no delta specs (proposal-only / lighter schemas). A naive "always require deltas" breaks them (#997). The requirement must be **schema-graph-driven**, not hardcoded.

### Reproductions (confirmed against current `main`)

```console
# Total drop — validate and archive disagree
$ openspec validate silent-drop      # exit 1: CHANGE_NO_DELTAS
$ openspec archive silent-drop --yes # exit 0: "archived"; no openspec/specs/ created

# Format drop — a full (non-delta) spec file is silently ignored: archive.ts:274's
# /^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements/ never matches, hasDeltaSpecs=false.
```

And the keystone: `grep "openspec archive" archive-change.ts` → **no match**. The skill never calls the CLI.

## What Changes

One deterministic definition of change completeness, enforced in the **CLI**, with the **skills reduced to thin wrappers that call the CLI** instead of judging. Ordered by leverage:

1. **PRIMARY — fix the loop deterministically.** `spec-driven` `apply.requires: [specs, tasks]` (the fix #1212's author and #1250's reviewer both endorse). The apply gate is a **non-transitive** presence check — it checks only the artifacts named in `apply.requires`, not their transitive `requires` — which is exactly why a change with `tasks.md` but no `specs/` reads as *ready* today (only `tasks` is checked). Naming `specs` directly fixes it, and the apply skill's *existing* blocked-state handler (`apply-change.ts:52`) finally fires. `design` is deliberately left out of `apply.requires`, so "skip design for simple changes" keeps working — by design, not accident. The propose/ff skill is hardened narrowly: define loop termination as "every `apply.requires` artifact is `done`" so it can't stop at `tasks.md` while `specs` is absent. The schema change is the deterministic guarantee. (Incorporates #1250.)

2. **KEYSTONE — the archive skill calls `openspec archive`.** Rework `opsx-archive-skill` to delegate archiving and spec sync to the CLI (`openspec archive --json`), which validates, merges deltas, and blocks deterministically. Remove the agent-judged "assess sync state / proceed without sync" and the raw `mv` — from **all** archive surfaces: both templates in `archive-change.ts` (the `openspec-archive-change` skill *and* the `/opsx:archive` command) and both in `bulk-archive-change.ts`; leaving any one on `mv` keeps the bypass alive. On a block, the skill surfaces the structured error and helps the user create/fix the delta spec — it never bypasses with `--skip-specs` *or* `--no-validate`, and it trusts the CLI's exit rather than self-certifying. This makes every CLI guarantee below actually reachable by agents. (#656, #863)

3. **CLI gate — `validate` and `archive` share one schema-aware delta gate.** Replace archive's `if (hasDeltaSpecs)` gate with `!options.skipSpecs`, running delta validation + capability coverage, and apply the **same** gate to `openspec validate` (which today runs `validateChangeDeltaSpecs` unconditionally). This blocks all three drop modes (total via `CHANGE_NO_DELTAS`; partial via coverage; format via the existing "No delta sections found" error) in both commands. The requirement applies via one shared predicate `schemaProducesDeltaSpecs(schema)` — true only when the schema graph **produces delta specs** — so a proposal-only schema passes both `validate` and `archive`, while a spec-driven change with no specs fails both (#997). Without gating `validate` too, the two commands would disagree again — exactly the seam this change closes.

4. **Partial-drop coverage (deterministic).** A new validator rule parses the proposal's `## Capabilities` and requires every declared capability to have a `specs/<id>/spec.md` *present*; delta well-formedness (including the format-drop case) is enforced by the existing delta validation. One-directional, schema-aware, surfaced in `validate`, CI, and `archive`.

5. **Apply enforcement (earlier guardrail).** `openspec instructions apply` exits non-zero when blocked. (Incorporates #1250.)

6. **Recovery — make existing drift detectable.** A deterministic audit (`openspec validate --changes` plus a check for archived changes whose declared capabilities never reached `openspec/specs/`) so teams who already accumulated silent drift (#1212's "no recovery path") can find it. Regenerating lost spec *content* from a finished implementation is inherently agent-assisted and is explicitly out of scope; detection + guidance is in scope.

7. **Clarity (coherence, not enforcement).** Correct the delta-vs-full-spec confusion in the specs artifact instruction and archive skill so agents and users stop conflating "a `spec.md` exists / tasks are done" with "specs are synced." (#426, #194, #164, Discord)

The deterministic CLI checks (3–5) are the guarantee; the skill/schema/docs changes (1, 2, 7) make the happy path work and remove agent judgment from the critical paths. The keystone (2) is what makes (3–5) reachable at all.

## Capabilities

### Modified Capabilities

- `opsx-archive-skill`: The archive skill delegates archiving and spec sync to the `openspec archive` CLI (deterministic validation + delta merge) instead of judging sync state and moving files itself; on a validation block it guides the user to fix the delta spec rather than bypassing.
- `cli-archive`: Archive validation runs delta-spec validation and declared-capability coverage consistently with `openspec validate` unless `--skip-specs`, applies only to schemas whose graph includes a `specs` artifact, and blocks total, partial, and non-delta-format spec drops.
- `cli-validate`: Delta-spec validation (the at-least-one-delta `CHANGE_NO_DELTAS` rule) and declared-capability coverage become deterministic and schema-aware — they apply only when the schema produces delta specs, so a proposal-only schema with no specs passes `validate` while a spec-driven change with no specs still fails; every declared capability must have a delta spec present or validation fails with a precise per-capability error.
- `cli-artifact-workflow`: `openspec instructions apply` exits non-zero when the apply phase is blocked, and the `spec-driven` apply gate requires `specs`.

## Impact

- `src/core/templates/workflows/archive-change.ts` (**both** `getArchiveChangeSkillTemplate` and `getOpsxArchiveCommandTemplate`) + `src/core/templates/workflows/bulk-archive-change.ts` (both templates) + `openspec/specs/opsx-archive-skill` — every archive surface calls `openspec archive --json`; remove agent-side `mv` and judgment-based sync; handle `ArchiveBlockedError`; never use `--skip-specs`/`--no-validate`.
- `src/core/templates/workflows/{propose,ff-change}.ts` — loop termination = "every `apply.requires` artifact is `done`" (so it can't stop at `tasks.md` while `specs` is absent).
- `src/core/archive.ts` — replace `if (hasDeltaSpecs)` with `if (!options.skipSpecs && schemaProducesDeltaSpecs(schema))`; run delta + coverage validation; reuse the existing `ArchiveBlockedError`/exit path.
- `src/core/parsers/change-parser.ts` — deterministic `extractDeclaredCapabilities(proposalMarkdown)` (heading + bold-label forms; malformed-id warning).
- `src/core/validation/validator.ts` — `validateChangeCapabilityCoverage(changeDir)`; schema-aware; the archived-drift audit.
- `src/commands/validate.ts` — schema-aware delta gate + coverage in single + bulk, with `schemaProducesDeltaSpecs` **memoized per schema name** (not per change); audit surface.
- `src/commands/workflow/instructions.ts` — non-zero exit on blocked apply.
- `schemas/spec-driven/schema.yaml` — `apply.requires: [specs, tasks]`; tighten the **proposal** artifact instruction to mandate the `## Capabilities` heading shape; tighten the **specs** artifact instruction (delta-vs-full-spec).
- `src/core/templates/workflows/{apply-change,sync-specs}.ts` — delta-vs-full-spec clarity (template-only; `openspec-sync-specs`/`/opsx:sync` survives, intentionally still agent-driven for sync-without-archive).
- A **project-local proposal-only fixture schema** (no `specs` artifact) for the #997 tests, since the only built-in schema (`spec-driven`) produces delta specs.
- Tests for every mode below.

## Issues addressed

All references verified against `Fission-AI/OpenSpec` on 2026-06-29 (states current; #1250 confirmed **not merged**, so `main` still has `apply.requires: [tasks]`).

Closes (the silent-drop family — total, partial, format, greenfield, the CLI-bypass, and the loop):

- [#1212](https://github.com/Fission-AI/OpenSpec/issues/1212) — spec-driven fast-path silently produces stale specs (canonical)
- [#1260](https://github.com/Fission-AI/OpenSpec/issues/1260) — No specs generated after `/opsx:propose`
- [#1222](https://github.com/Fission-AI/OpenSpec/issues/1222) — Main spec never created for the first change in a greenfield project
- [#1264](https://github.com/Fission-AI/OpenSpec/issues/1264) — Archive should handle an empty main spec instead of skipping sync
- [#799](https://github.com/Fission-AI/OpenSpec/issues/799) — After `/opsx-archive` succeeds, sync is not executed
- [#656](https://github.com/Fission-AI/OpenSpec/issues/656) — Why archive relies on the LLM to merge specs vs. the CLI (answered by routing archive through `openspec archive`)
- [#863](https://github.com/Fission-AI/OpenSpec/issues/863) — `/opsx:archive` skill doesn't invoke the `openspec archive` CLI
- [#913](https://github.com/Fission-AI/OpenSpec/issues/913) — `/opsx-archive` offers "Sync now" needing the uninstalled `openspec-sync-specs` skill; eliminated because archive now syncs via the CLI, with no separate skill

Supersedes (open PRs — partial or prompt-only fixes for the same failures):

- [#1250](https://github.com/Fission-AI/OpenSpec/pull/1250) — apply exit-1 + `apply.requires:[specs,tasks]`; its reviewer explicitly deferred the archive guard to a follow-up — this is that follow-up. Incorporated here.
- [#1271](https://github.com/Fission-AI/OpenSpec/pull/1271), [#1241](https://github.com/Fission-AI/OpenSpec/pull/1241), [#1233](https://github.com/Fission-AI/OpenSpec/pull/1233) — prompt-only archive/greenfield guidance, replaced by an enforceable CLI check. (Prior attempt [#1268](https://github.com/Fission-AI/OpenSpec/pull/1268) was already closed unmerged — noted, not superseded.)

## Related, addressed-in-part

- [#997](https://github.com/Fission-AI/OpenSpec/issues/997) — **this change is the first to implement it**: the delta requirement is schema-graph-driven in **both** `validate` and `archive` (no forcing deltas on proposal-only schemas).
- [#977](https://github.com/Fission-AI/OpenSpec/pull/977) (allow-specless-changes) — **reconciled, with a deliberate boundary.** A change is allowed to have no specs when its schema produces no delta specs (the #997 gate) or when the user explicitly passes `--skip-specs`. This change does **not** allow a *silent* specless archive under a spec-driven schema — that is precisely the bug. So legitimate specless work is supported (schema choice or an explicit flag), but not by default under a spec-producing schema. Same `validate`/`validator` files, so also coordinate mechanically.
- [#902](https://github.com/Fission-AI/OpenSpec/pull/902) (sub-agent spec discovery in propose/ff) — edits the same propose/ff loop + schema; coordinate so the loop-termination fix and its spec-discovery step compose rather than overwrite.
- [#164](https://github.com/Fission-AI/OpenSpec/issues/164), [#426](https://github.com/Fission-AI/OpenSpec/issues/426), [#911](https://github.com/Fission-AI/OpenSpec/issues/911) — confusion about what a delta spec is / sync direction; addressed by the clarity changes (7). The conceptual docs may warrant a focused follow-up. (Prior art: [#194](https://github.com/Fission-AI/OpenSpec/issues/194), now closed.)

## Out of scope (referenced, not closed)

Distinct delta-**merge** bug family, packaging, and broader design requests, tracked separately:

- [#1246](https://github.com/Fission-AI/OpenSpec/issues/1246) / [#1112](https://github.com/Fission-AI/OpenSpec/issues/1112) / [#1252](https://github.com/Fission-AI/OpenSpec/pull/1252) — two changes that MODIFY the same requirement drop scenarios (`buildUpdatedSpec` whole-block replace, `specs-apply.ts`). Same *family* (silent spec loss) but a **distinct root cause and distinct code** from this change, which never touches `buildUpdatedSpec`. **PR #1252 (APPROVED, mergeable) is complementary, not conflicting:** it should land first as the tactical fix for #1246; this change rebases cleanly on top (only a possible `test/core/archive.test.ts` overlap) as the durable deterministic layer. They reinforce each other — this change's keystone (archive routed through the CLI) is what makes #1252's `buildUpdatedSpec` fix actually reachable from the agent path, which today bypasses the CLI merge entirely.
- [#1120](https://github.com/Fission-AI/OpenSpec/issues/1120) — `openspec-sync-specs` skill not installed for Junie (broader packaging than the archive path #913 fixes).
- [#827](https://github.com/Fission-AI/OpenSpec/issues/827) — targeting/evolving a single main spec over time (design direction); [#1265](https://github.com/Fission-AI/OpenSpec/issues/1265) — change-naming and reading archived files.
- Regenerating lost spec content for changes already archived without specs (agent-assisted; the audit in (6) detects them).
