# Roadmap Loop Runbook

This file drives the autonomous loop that works through the
`simplify-context-and-workspace-model` roadmap. Each loop iteration starts
here. The loop runs on `codex/store-root-parity` only (see the single-branch
workflow note in `roadmap.md`). The loop does not wait for the user: it
works the queue to completion under the boundaries below.

Architecture: the loop is the sequential spine (one judgment-bearing unit
per iteration, bookkeeping between phases); parallel review phases run as
multi-agent Workflows; the `/code-review` and `/simplify` skills and the
codex CLI provide independent review machinery.

## Re-anchor (every iteration)

1. Read `roadmap.md` — Progress At A Glance, the next-incomplete-item
   pointer, and the current slice's section. Read `goal.md` and `AGENTS.md`
   if not already in context.
2. The work queue, in order: slice 1.4 → the Phase 5 command-group deletion
   slice → 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 4.1 → Phase 5 remainder.
   All product decisions are locked in `roadmap.md` ("Decisions locked"
   blocks, Rules We Should Not Forget, the 1.4 terminology checkbox, the
   5.1 criteria); do not re-open them.

## Per-slice discipline (evolved from slice 1.3's)

1. **Spec**: write `slices/<slice-name>/spec.md` in the established format
   (Outcome, Locked Decisions, User Experience, Scope, Acceptance Criteria
   with GIVEN/WHEN/THEN scenarios). Ground every claim in current code.
2. **Spec review** — run in parallel (Workflow for the agents, Bash for
   codex): one adversarial review agent + one codex CLI review. Fold all
   findings; record the round in the roadmap changelog.
3. **Plan**: write `slices/<slice-name>/plan.md` (Status, code map with
   file:line anchors, implementation plan, test plan, risks, done
   definition).
4. **Plan review**: same parallel shape as spec review. Fold findings.
5. **Implement** on this branch. Build clean; full `pnpm test` green before
   any implementation commit. Update existing tests deliberately, never by
   loosening contracts.
6. **Post-implementation review**, three independent mechanisms in
   parallel (none of them edits):
   - a spec-compliance agent (Workflow) checking the implementation against
     the slice spec scenario by scenario;
   - the `/code-review` skill at high effort for correctness findings;
   - a codex CLI review of the commit range.
   Fix all P1/P2 findings and cheap P3s; re-run the full suite.
7. **Quality pass**: run `/simplify` on the changed code — serial, after
   correctness fixes land, because it edits the working tree. Re-run the
   full suite; commit.
8. **Bookkeeping**: tick the slice's roadmap progress boxes, update the
   next-item pointer and Progress At A Glance, add changelog entries, keep
   the slice spec/plan consistent with what actually shipped, commit.

Codex review invocation: `codex exec` non-interactively with model 5.5 at
high reasoning (`-c model=...` and reasoning-effort overrides; confirm the
exact model id with `codex exec --help`/config on first use and then reuse
it). Give codex the commit range or artifact paths and ask for findings with
severity and file:line evidence.

Slice-specific acceptance:

- **1.4**: after implementation, run the dogfood proof headlessly — in a
  scratch project with isolated XDG state and a registered store, a fresh
  headless agent session must complete a store-scoped change from a single
  prompt without hand-holding.

## Autonomous decision protocol (replaces pause gates)

When a slice surfaces a decision the roadmap has not locked:

1. Make the call most consistent with the locked decisions, the guardrails,
   and the goal ("Specs are what is true. Work is what is in motion.").
2. Record it the same day in the roadmap changelog under a clearly marked
   line: `Decided autonomously (review me): ...` with the rationale.
3. Continue. Do not stop to ask; do not silently decide either — the
   changelog marker is the user's review surface.

Phase 5 deletion slices proceed without confirmation: they delete code and
generated guidance only, never user data, and git history is the undo.

## Hard boundaries (not gates — prohibitions)

- **Never** merge, rebase onto, or push to `main`; never push at all —
  commits stay local on `codex/store-root-parity`.
- Never delete user data files.
- Never re-open a locked decision; never rebuild per-change links
  (relationships are location, declaration, or citation).
- One change lives in one root.

## Iteration sizing and reporting

- One coherent unit per iteration: a spec with its reviews, a plan with its
  reviews, an implementation checkpoint, or a review-and-fix cycle.
- End every iteration with a short status: what was produced, review
  verdicts, suite state, any autonomous decisions made, and what the next
  iteration does.
- When the queue is exhausted, stop scheduling and write the final
  summary, including every `Decided autonomously` entry for review.
