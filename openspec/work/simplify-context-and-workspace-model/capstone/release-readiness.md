# Release-Readiness Report — simplify-context-and-workspace-model

Committed 2026-06-11 on `codex/store-root-parity` (merge to `main`
deliberately deferred per the run's standing instruction). This is the
6.1 capstone's final deliverable: the product, proven as one thing.

**Verdict: release-ready, with the known gaps below mapped to Later
Ideas. No open P1/P2 findings anywhere in the capstone ledgers.**

## The five-minute new-user story

You install OpenSpec and run two commands:

```bash
openspec store setup team-plans --path ~/openspec/team-plans
openspec new change my-first-change --store team-plans
```

That is the whole journey to a working, store-scoped change — two
commands, two concepts (a **store** is a standalone planning repo
registered on your machine; a **change** is the unit of work), and
every step's output prints the exact next command. From there the
lifecycle is `status` → `instructions` per artifact → `archive`, each
carrying `--store` in its own hints. Your code repos connect with one
line (`store: team-plans` in `openspec/config.yaml`) after which the
lifecycle works from inside them with zero flags; project roots can
declare `references:` for read-only upstream context with fetch recipes.
`openspec doctor` answers "is my setup healthy"; `openspec context`
answers "what OpenSpec roots are related by declarations"; and personal
worksets open the planning repo plus whichever code folders the user
chooses. Everything has `--json` with a documented agent contract
(`docs/agent-contract.md`).

This story is not aspirational: journey 4 ran the store/pointer path cold,
and the later workset dogfood opened a planning store next to code folders
through explicit `--member` composition. The code-repo relationship
abstraction is now recorded as a removed experiment, not current product proof.

## What this roadmap shipped (the sum)

- **One root model.** A single resolution precedence (explicit
  `--store` → nearest qualifying root → declared pointer →
  hint/implicit) implemented exactly once and verified hold across all
  command entry points. Stores are standalone OpenSpec repos in a typed
  local registry.
- **Declared references, no machinery.** `references:` are read-only
  context declarations; nothing clones, syncs, or enforces edit
  boundaries. Unresolvable references degrade to warnings with pasteable
  fixes.
- **Two read-only composition surfaces.** `doctor` (relationship
  health, four separated categories, findings exit 0) and `context`
  (the working set as agent brief / human listing / editor view).
- **The old model deleted, not hidden.** The workspace/initiative
  command groups, state model, schema, accepted specs, and template
  guidance are gone (−12,903 lines in the first tranche; at the current
  PR head, `src/` remains net **−3,189** lines vs `origin/main` across
  the whole delta).

## Audit results (full records in this folder)

- **Persona journeys** (`journeys.md`): all four pass — fresh team
  (standing e2e), layered PM-to-dev (new e2e), externalized planning
  (new e2e, zero `--store` flags), cold-start agent (live headless
  dogfood).
- **Usability** (`usability-audits.md`): 55-wrong-turn error catalog
  (all failures fixed); vocabulary sweep clean across live sweep roots
  and generated guidance, with planning-history artifacts excluded by
  design; time-to-first-success measured live at 2
  commands / 2 concepts.
- **Technical** (`technical-audits.md`): single-resolver and
  dependency-direction invariants HOLD; module sizes bounded; the
  agent contract documented and verified (`docs/agent-contract.md`);
  dead code reduced to a recorded P3 queue.
- **Whole-delta gauntlet** (`gauntlet.md`): four mechanisms
  (/code-review max, a 32-agent adversarial Workflow, codex,
  completeness critic); 2 P1 + 13 P2 findings, **all fixed in 37ad867
  and live re-verified**, plus the cheap P3 set. Final suite: 97
  files, 1,761 tests green; all 36 accepted specs validate.

## The autonomous-decision ledger

Every `Decided autonomously (review me)` entry lives in the roadmap
changelog (18 marked entries plus per-slice recorded amendments). The
ones that shape the product:

1. The earlier code-repo relationship experiment is superseded and removed;
   keep only the research note for a future multi-repo coordination design.
2. Declared-pointer roots resolve through the same store resolver as
   `--store` (3.2); corrupt store metadata stays a resolution failure —
   no doctor-only resolution fork (3.6 amendment).
3. `openspec doctor` is top-level and root-scoped; health findings of
   any severity exit 0 (3.6).
4. 4.1's surface is `openspec context` (not `view`/`open`); opening is
   REPLACED by emitted artifacts — no editor launching; `binding.ts`
   and the template guards died with the state model (widened
   carve-outs).
5. The Phase 5 remainder deleted the workspace-planning schema, the
   four beta change folders, and the four wholly-workspace accepted
   specs; mixed specs got bounded excisions (L2 decided).
6. Capstone fixes: the nearest walk now requires a QUALIFYING
   `openspec/` (planning shape or config); every `--json` failure
   emits one status document; `planningHome` was restored to status
   JSON as a published agent contract (reversing a planned
   dead-code collapse — `PlanningHomeSummary` is live again);
   `store remove` commits the registry removal before deleting files;
   prompt-render boundaries sanitize cloned content.

## Known gaps, mapped

| Gap | Disposition |
|---|---|
| README/public concept docs don't yet tell the store story | **L1** (rewrite public docs after behavior is solid) — the CLI reference (`docs/cli.md`) and agent contract are current |
| Richer cross-repo context (multi-store fetch ergonomics, reference index growth past ~150 references) | **L3** |
| `view`, `templates`, `schemas`, and deprecated noun forms remain cwd-based without `--store` | Documented in the agent contract; candidates for L9-grade fixes if they matter to the simple flow |
| JSON key-casing split (store-family snake_case vs workflow-family camelCase) and envelope-type unification | Recorded in the agent contract; renaming published keys is a product decision for the first versioned release |
| Registry fsync durability; Windows clone-recipe quoting; completions enumerating ids from bare cwd | Recorded engineering notes (gauntlet P3 ledger) — none block a first user on a POSIX machine |
| Cross-platform CI matrix not run on this branch; no semver/changeset plan for the deleted CLI surface | Release-process work for the merge-to-main moment, which this run deliberately does not perform |
| `parseJson` test-helper consolidation and sibling dead-code P3s | Recorded queue (`technical-audits.md`) |

## What remains before users

One action: merge `codex/store-root-parity` to `main` (every roadmap
box except "Merged to main" is ticked) and run the release process
(CI matrix, version, changelog). The branch holds 80+ commits, each
with a green full suite at commit time.
