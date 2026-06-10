# Roadmap Loop Runbook

This file drives the autonomous loop that works through the
`simplify-context-and-workspace-model` roadmap. Each loop iteration starts
here. The loop runs on `codex/store-root-parity` only (see the single-branch
workflow note in `roadmap.md`).

## Re-anchor (every iteration)

1. Read `roadmap.md` — Progress At A Glance, the next-incomplete-item
   pointer, and the current slice's section. Read `goal.md` and `AGENTS.md`
   if not already in context.
2. The work queue, in order: slice 1.4 → the Phase 5 command-group deletion
   slice (PAUSE GATE, see below) → 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 4.1
   → Phase 5 remainder (PAUSE GATE). All product decisions are locked in
   `roadmap.md` ("Decisions locked" blocks, Rules We Should Not Forget, the
   1.4 terminology checkbox, the 5.1 criteria); do not re-open them.

## Per-slice discipline (same as slice 1.3)

1. **Spec**: write `slices/<slice-name>/spec.md` in the established format
   (Outcome, Locked Decisions, User Experience, Scope, Acceptance Criteria
   with GIVEN/WHEN/THEN scenarios). Ground every claim in current code.
2. **Spec review**: one adversarial subagent review + one codex CLI review.
   Fold all findings; record the round in the roadmap changelog.
3. **Plan**: write `slices/<slice-name>/plan.md` (Status, code map with
   file:line anchors, implementation plan, test plan, risks, done
   definition).
4. **Plan review**: subagent + codex. Fold findings.
5. **Implement** on this branch. Build clean; full `pnpm test` green before
   any implementation commit. Update existing tests deliberately, never by
   loosening contracts.
6. **Post-implementation review**: two parallel adversarial subagents (spec
   compliance + correctness) plus one codex CLI review. Fix all P1/P2
   findings and cheap P3s; re-run the full suite; commit fixes.
7. **Bookkeeping**: tick the slice's roadmap progress boxes, update the
   next-item pointer and Progress At A Glance, add changelog entries, commit.

Codex review invocation: `codex exec` non-interactively with model 5.5 at
high reasoning (`-c model=...` and reasoning-effort overrides; confirm the
exact model id with `codex exec --help`/config on first use and then reuse
it). Give codex the commit range or artifact paths and ask for findings with
severity and file:line evidence, like the subagent reviews.

Slice-specific acceptance:

- **1.4**: after implementation, run the dogfood proof headlessly — in a
  scratch project with isolated XDG state and a registered store, a fresh
  headless agent session must complete a store-scoped change from a single
  prompt without hand-holding.

## Hard boundaries

- **Never** merge, rebase onto, or push to `main`; never push at all —
  commits stay local on `codex/store-root-parity`.
- **Pause gates** (end the iteration with a written question instead of
  scheduling more work): any Phase 5 deletion slice before executing
  deletions; any genuinely new product decision a spec surfaces that the
  roadmap has not locked; anything destructive or outward-facing.
- Never auto-delete user data files.
- One change lives in one root; references are config, never per-change
  links (Rules We Should Not Forget).
- Specs and plans must stay consistent with what ships: when reviews change
  the implementation, update the slice artifacts in the same commit cycle.

## Iteration sizing and reporting

- One coherent unit per iteration: a spec with its reviews, a plan with its
  reviews, or an implementation checkpoint. Do not span a pause gate.
- End every iteration with a short status: what was produced, review
  verdicts, suite state, and what the next iteration does.
- When the queue is exhausted (or a pause gate is hit), stop scheduling and
  summarize where things stand.
