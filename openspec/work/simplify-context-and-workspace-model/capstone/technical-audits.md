# Capstone Technical Audits (6.1) — Results

Executed 2026-06-11 against the branch head; size and delta counts below
were refreshed against the current PR head after later cleanup commits.

## Single-resolver invariant: HOLDS

Root-selection precedence (explicit `--store` → nearest → declared
pointer → hint/implicit) has exactly one implementation
(`resolveOpenSpecRoot`, root-selection.ts). All nine resolution entry
points (list/show/validate/status/instructions×2/new-change/archive/
doctor/context) route through it; doctor and init's extra walks are
post-resolution diagnostics and scaffold guards, never resolution. One
latent fork found and queued: `generateApplyInstructions`' unreachable
`resolveCurrentPlanningHomeSync` fallback (its only caller always
passes the resolved home) — deletion queued with the function itself.
Deprecated noun-forms (`change`/`spec`) are cwd-based with no walk —
documented, not forks.

## Dependency direction: HOLDS

Zero `core → commands/cli` imports; zero `commands → cli` imports;
templates reach nothing. The only cross-link is the package entry
(`src/index.ts`) re-exporting both — top-level composition.

## Dead code: no P2s; five P3s and four notes, queued or recorded

P3 queue (fixed in the gauntlet fix round where cheap):
1. The unreachable apply-instructions fallback +
   `resolveCurrentPlanningHomeSync` (test-only after it).
2. `resolveRegisteredStore` (registry.ts) — test-only, subsumed by
   root-selection, and its fix text references the removed
   `--store-path` flag.
3. The references barrel line (`core/index.ts`) — zero consumers; the
   sibling modules are deliberately not barreled.
4. `PlanningHomeSummary` — field-identical to `PlanningHome` post-4.1;
   identity wrapper collapse.
5. `parseJson` test-helper ×11 — consolidate the enriched variant into
   `run-cli.ts`.

Notes (recorded, no action): `mkdir` fixture copies ×8 (marginal);
the `~/openspec/<id>` checkout convention is 1 computed + 5 prose
sites (constant would pin it); `ext::` transport — zero occurrences,
the shell-safe gate + `--` + trust boundary (team-committed
store.yaml) hold, a threat-model comment at the gate queued;
`registerStore`/`isStoreRoot` are test-only exports (sanctioned
fixture APIs, recorded).

## Module sizes: bounded

Largest src module is `store/operations.ts` at 1,196 lines; three files
exceed 800 lines (operations, schema command, init). `store.ts` is just
below the line at 799. src total: 31,625 lines.

## Agent-contract inventory: docs/agent-contract.md (committed)

Every JSON shape, the diagnostic envelope, the failure payloads, the
exit-code contract, and a 100+-code catalog — verified against
emitting code. Fourteen consistency findings recorded in the document;
one is gauntlet-grade (P2): in `--json` mode, unknown/ambiguous-item
paths in `validate`/`show` and thrown errors in `status`/
`instructions` print stderr only and exit 1 WITHOUT a JSON document —
agents parsing stdout get nothing. Queued for the gauntlet fix round.
The rest (severity low/medium: snake_case vs camelCase split between
store-family and workflow-family payloads, the four parallel envelope
type declarations, `status` key collision in `list`, fallback-code
suffix naming, unversioned payloads, schemas/templates ignoring root
selection) are recorded as known gaps for the report — renaming
published JSON keys is a product decision, not a capstone fix.

## Net LOC delta vs origin/main: src remains net-negative as expected

- `src/`: **−3,189** net (+8,489 / −11,678) — the Phase 5 deletions
  outweigh Phases 3–4's additions.
- `test/`: +956 net (+8,795 / −7,839).
- Whole delta: +29,468 / −23,327 across 235 files; the gross
  insertions are dominated by `openspec/work/` planning artifacts
  (specs, plans, the roadmap ledger) — process documentation, not
  product code.
