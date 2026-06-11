# Roadmap Runbook

Start the run from a fresh session in this repo on `codex/store-root-parity`
with exactly this command (interactive, or headless via
`claude -p '/goal ...'`):

```text
/goal ROADMAP QUEUE COMPLETE: every item in the work queue defined in
openspec/work/simplify-context-and-workspace-model/runbook.md (slice 1.4,
the Phase 5 command-group deletion slice, 3.1-3.6, 4.1, the Phase 5
remainder, and the 6.1 final acceptance capstone) has all of its roadmap.md
progress boxes ticked except "Merged to main", the full pnpm test suite
passes, all work is committed on codex/store-root-parity, and the
capstone's release-readiness report is committed with no open P1/P2
findings. Work strictly per the runbook, one coherent unit per turn, never
waiting for the user; or stop after 300 turns.
```

This file is the contract for the autonomous run that works through the
`simplify-context-and-workspace-model` roadmap. The driver is `/goal`
(condition-based: turns fire back-to-back until the completion condition is
met — no schedule, no waiting for the user). Each turn does one coherent
unit of work and ends with an explicit status the goal evaluator can read.
All work happens on `codex/store-root-parity` (see the single-branch
workflow note in `roadmap.md`).

Architecture: the goal-driven main loop is the sequential spine (one
judgment-bearing unit per turn, bookkeeping between phases); parallel review
phases run as multi-agent Workflows; the `/code-review` and `/simplify`
skills and the codex CLI provide independent review machinery — these skills
run from the main loop, never from inside workflow agents.

## Follow-up run: 7.1 personal worksets (added 2026-06-12)

The original queue is complete. Item 7.1 runs as its own goal, from a
fresh session on `codex/store-root-parity`:

```text
/goal 7.1 COMPLETE: roadmap item 7.1 (personal worksets) in
openspec/work/simplify-context-and-workspace-model/roadmap.md has all
of its progress boxes ticked except "Merged to main" — including the
capstone dogfood and the pushed-branch box — the full pnpm test suite
passes, all work is committed on codex/store-root-parity, and the
branch is pushed to origin with code-review comments addressed. Work
per the runbook's per-slice discipline with the slice folder
slices/personal-worksets/; the 7.1 section's functional requirements,
locked decisions, and research checklist are the requirements baseline
and are owner-directed — do not relitigate them. Start with the
research checkpoint (the old launch mechanics at f858c19^ are the
evidence base). One coherent unit per turn, never waiting for the
user; or stop after 80 turns.
```

7.1 is a build slice: full review discipline (the deletion-slice trim
does not apply). Two run-specific amendments (owner-directed,
2026-06-12):

- **Push allowed for this run — the working branch only.** After the
  post-implementation review fixes land, and again at bookkeeping,
  push `codex/store-root-parity` to origin. Then check PR #1190 for
  code-review comments touching the slice and address each one (fix
  it, or record a reply-with-rationale in the changelog). Merging to
  or pushing `main` remains forbidden; the Hard boundaries section's
  "never push at all" is superseded by this paragraph for this run
  only.
- **7.1 capstone — after the simplify pass, before bookkeeping.**
  Prove the feature end to end from the user's seat, headlessly: in a
  scratch environment with isolated XDG state and fake `code` /
  `cursor` / `claude` / `codex` executables on PATH, walk
  compose → list → open for both launch styles, verifying the
  generated `.code-workspace` contents and the exact launch argv per
  tool (including the no-prompt rule for agent opens). Then a
  cold-start UX walk: a fresh headless agent given only `--help`
  output and no insider knowledge must reach an opened workset.
  Record the transcript in the slice folder, fix what it surfaces,
  re-run the full suite, and tick the capstone box.

All other sections of this runbook apply unchanged.

## Re-anchor (every turn)

1. Read `roadmap.md` — Progress At A Glance, the next-incomplete-item
   pointer, and the current slice's section. Read `goal.md` and `AGENTS.md`
   if not already in context. Trust the files over conversation memory;
   context may have been compacted.
2. The work queue, in order: slice 1.4 → the Phase 5 command-group deletion
   slice → 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 4.1 → Phase 5 remainder →
   **6.1 final acceptance capstone** (see roadmap Phase 6 and the section
   below). All product decisions are locked in `roadmap.md` ("Decisions
   locked" blocks, Rules We Should Not Forget, the 1.4 terminology
   checkbox, the 5.1 criteria); do not re-open them.

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

## Standing quality bars (checked in every slice's reviews)

- **Vocabulary**: new user-facing strings use only the locked nouns (store,
  reference, target project repo, OpenSpec root). One concept, one token —
  no synonym drift.
- **Error UX**: every new error or hint names the concrete next action,
  carries `--store <id>` when a store is selected, and uses absolute paths
  cross-root. A hint a user pastes must work verbatim.
- **Agent contracts**: new JSON fields and diagnostic codes follow the
  existing shared shapes (the root block pattern; severity/code/message/fix
  diagnostics). Additive, consistent, no parallel envelope styles.
- **Lean modules**: a touched module exceeding ~600 lines triggers a split
  or a recorded reason. New abstractions need at least two real call sites
  or a recorded reason — no speculative generality.
- **Dependency direction**: core never imports from commands; store Git
  mechanics stay behind the single git module; config parsing and
  instruction injection stay in their own modules. Root resolution remains
  exactly one shared code path — no command-local forks of precedence.

Codex review invocation: `codex exec` non-interactively with model 5.5 at
high reasoning (`-c model=...` and reasoning-effort overrides; confirm the
exact model id with `codex exec --help`/config on first use and then reuse
it). Give codex the commit range or artifact paths and ask for findings with
severity and file:line evidence.

Deletion-slice review profile (Phase 5 remainder only): spec review keeps
the full dual shape (subagent + codex); plan review runs the adversarial
subagent alone, no codex; post-implementation review runs the
spec-compliance agent and `/code-review` at high effort, no per-slice
codex. Rationale: deletion slices are mechanical, their review-fix rounds
have been the smallest of the run, and the 6.1 whole-delta codex review
re-covers every deleted line anyway. Build slices (4.1) keep the full
discipline.

Slice-specific acceptance:

- **1.4**: after implementation, run the dogfood proof headlessly — in a
  scratch project with isolated XDG state and a registered store, a fresh
  headless agent session must complete a store-scoped change from a single
  prompt without hand-holding.

## Final acceptance capstone (6.1 — last queue item)

The capstone proves the *product*, not the slices. It only passes when a
cold user could start using this today. Its checks:

1. **Persona journeys**, each as an e2e test or headless dogfood:
   - Fresh team: create a store, work a change through archive, commit and
     push locally; second checkout clones, registers, continues (the 1.3
     journey must still pass after the rename and deletions, with new
     names).
   - Layered flow: requirements in a store; an agent in an app repo that
     references it discovers the relationship from config, cites the
     upstream spec, writes a low-level design in the app repo's own root.
   - Externalized planning: a repo with no local root and a fallback
     declaration runs the normal lifecycle without `--store` repetition.
   - Cold start: a fresh headless agent, given only a vague human prompt
     ("set up planning in a separate repo for this project") and no insider
     knowledge, succeeds using only `--help` output and generated guidance.
2. **Usability audits**: an error-catalog walk (every likely wrong turn on
   the new paths yields an actionable, store-carrying error); a vocabulary
   sweep (zero "context store"/initiative/workspace residue in any
   user-facing surface, including `docs/cli.md`); a documented
   time-to-first-success count (commands and concepts from install to first
   store-scoped change).
3. **Technical audits**: single-resolver invariant (one precedence
   implementation, no command-local forks); dependency-direction check;
   dead-code sweep over touched areas; module-size report; an agent-contract
   inventory (all JSON shapes and diagnostic codes documented in one
   reference file and verified consistent); net LOC delta vs `origin/main`
   reported (expected net-negative given the Phase 5 deletions — justify if
   not).
4. **Whole-delta review gauntlet** over `origin/main...HEAD` (the sum, not
   the slices): `/code-review` at max effort, a codex CLI review, a
   fan-out of adversarial Workflow reviewers, and a completeness critic
   asking what is missing. Fix all P1/P2 findings.
5. **Release-readiness report** committed to this work folder: the
   five-minute new-user story, audit results, the full
   `Decided autonomously` ledger, and known gaps mapped to Later Ideas.

## Autonomous decision protocol

When a slice surfaces a decision the roadmap has not locked:

1. Make the call most consistent with the locked decisions, the guardrails,
   and the goal ("Specs are what is true. Work is what is in motion.").
2. Record it the same day in the roadmap changelog under a clearly marked
   line: `Decided autonomously (review me): ...` with the rationale.
3. Continue. Do not stop to ask; do not silently decide either — the
   changelog marker is the user's review surface.

Phase 5 deletion slices proceed without confirmation: they delete code and
generated guidance only, never user data, and git history is the undo.

## Hard boundaries (prohibitions, not gates)

- **Never** merge, rebase onto, or push to `main`; never push at all —
  commits stay local on `codex/store-root-parity`.
- Never delete user data files.
- Never re-open a locked decision; never rebuild per-change links
  (relationships are location, declaration, or citation).
- One change lives in one root.

## Parallelism policy

- **Cross-slice work stays serial.** Every slice lands on the single branch;
  the junction files (`src/cli/index.ts`, the completions registry,
  `project-config.ts`, `foundation.ts`/`registry.ts`, and `roadmap.md`
  bookkeeping) are shared by nearly every slice; and the queue's two largest
  commits — the 1.4 mass rename and the Phase 5 mass deletion — are the
  worst bases to rebase parallel tracks across.
- **Within-slice fan-outs are encouraged.** Mechanical sweeps over
  partitioned file sets — the 1.4 rename and guidance surfaces, the Phase 5
  deletion sweep — run as Workflows, with worktree isolation when agents
  edit concurrently. One integration point, one full-suite run.
- **Lookahead research is allowed.** During implementation turns, a
  background read-only workflow may pre-build the next slice's code map
  (file:line anchors for its plan). Never pre-write the next spec against
  unlanded code or names.

## Turn sizing and status (the evaluator reads this)

- One coherent unit per turn: a spec with its reviews, a plan with its
  reviews, an implementation checkpoint, or a review-and-fix cycle.
- End every turn with an explicit status block stating: current slice and
  step, what was produced this turn, review verdicts, test-suite state, any
  `Decided autonomously` entries, and what the next turn does. The goal
  evaluator only sees what the transcript surfaces — state progress
  plainly, never implicitly.
- The run is complete when every queue item's roadmap progress boxes are
  ticked except "Merged to `main`", the full suite is green, all work is
  committed, **and the 6.1 capstone passes with its release-readiness
  report committed and no open P1/P2 findings**. When that is true, say so
  explicitly in the final status: "ROADMAP QUEUE COMPLETE" plus the closing
  summary including every `Decided autonomously` entry for review.
