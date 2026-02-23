## Context

The apply-change skill instructions originate from a single TypeScript source file:

**`src/core/templates/workflows/apply-change.ts`** — contains two functions:
- `getApplyChangeSkillTemplate()` — generates SKILL.md files for all tools (Claude, Cursor, Windsurf, etc.)
- `getOpsxApplyCommandTemplate()` — generates tool-specific command files (e.g., `.claude/commands/opsx/apply.md`)

Both functions contain identical instruction text for steps 1–7, output formats, and guardrails. The command template has minor wording differences (e.g., `/opsx:continue` instead of `openspec-continue-change`) but the same step 6 and guardrails.

The current step 6 is a flat bullet list: show task → make changes → mark complete → continue. The checkpoint instruction exists only as guardrail #6: "Update task checkbox immediately after completing each task." In practice, agents ignore this because stronger competing signals (system-level parallelism prompts, the "keep going" guardrail) override it.

## Goals / Non-Goals

**Goals:**

- Make checkpoint-after-task the dominant behavioural signal in step 6, not a buried guardrail
- Include the recovery rationale inline so agents understand *why*, not just *what*
- Add git commit as part of the checkpoint so recovery survives process crashes (not just context window loss)
- Define tightly-coupled grouping clearly enough that agents can apply it without ambiguity
- Promote the checkpoint guardrail to first position with anti-batching language
- Address the PR noise problem by noting that per-task commits should be bundled for review

**Non-Goals:**

- Changing the schema, artifact graph, or CLI commands
- Adding new CLI flags or configuration options for checkpoint behaviour
- Modifying other skills (archive, verify, sync, etc.)
- Enforcing checkpoint discipline programmatically (e.g., via hooks or validation) — this change relies on instruction strength only
- Changing commit message conventions beyond the task-referencing format

## Decisions

### 1. Replace step 6 rather than adding a new step

**Decision:** Rewrite step 6 in-place with the checkpoint loop structure (announce → implement → mark complete → commit → confirm).

**Rationale:** Adding a separate "checkpoint" step would break the existing step numbering and create ambiguity about whether the old loop or new checkpoint step takes precedence. Replacing step 6 keeps the structure clean and makes the checkpoint integral to the loop, not an afterthought.

**Alternative considered:** Adding a step 6b or inserting between steps 6 and 7. Rejected because it fragments the loop logic across multiple steps.

### 2. Use sub-steps (a–e) within step 6

**Decision:** Structure the checkpoint loop as lettered sub-steps: a. Announce, b. Implement, c. Mark complete, d. Commit, e. Confirm.

**Rationale:** The sequential lettering makes the order unambiguous. Agents can reference specific sub-steps. The hard gate ("steps c and d must happen before starting the next task") is clear when the steps are named.

**Alternative considered:** Keeping the bullet-list format. Rejected because bullets imply optional/unordered items, which is exactly the misinterpretation we're fixing.

### 3. Define "tightly coupled" by coherence, not by file proximity

**Decision:** Define tightly-coupled tasks as "changes that would be incoherent if split" with the example of a class change and its corresponding test.

**Rationale:** File-based rules (e.g., "tasks touching the same file") are too brittle — a refactoring task and a feature task might touch the same file but be logically independent. Coherence is the right criterion because it maps to what a reviewer would consider a single logical unit.

**Alternative considered:** Strict one-task-per-checkpoint with no grouping. Rejected as impractical — splitting a function change from its test would create commits that fail tests, which is worse for recovery.

### 4. Cap grouped tasks at 2–3

**Decision:** "Never let more than 2–3 tasks accumulate without a checkpoint."

**Rationale:** This is deliberately imprecise. A hard cap of exactly 2 or exactly 3 would invite rules-lawyering. The range signals "this should be rare and small" while leaving room for agent judgment. The typical case is 1 task per checkpoint; grouping is the exception.

### 5. Include git commit in the checkpoint, not just file update

**Decision:** The checkpoint includes `git add -A && git commit -m "task N: <short description>"`.

**Rationale:** Marking `[x]` in the tasks file without committing only protects against context window loss (the agent can re-read the file). It does not protect against process crashes, machine failures, or session timeouts — the primary failure modes we're addressing. A git commit makes progress durable on disk.

**Alternative considered:** Making the commit optional or configurable. Rejected because the whole point is crash recovery — without the commit, the checkpoint is incomplete.

### 6. Update both template functions in apply-change.ts

**Decision:** Edit `getApplyChangeSkillTemplate()` and `getOpsxApplyCommandTemplate()` in `apply-change.ts` with matching changes.

**Rationale:** Both functions contain the same step 6 and guardrails text. They must stay in sync — the skill template drives SKILL.md generation and the command template drives slash command generation.

### 7. Add MR bundling guidance to the guardrails

**Decision:** Add a guardrail note that per-task commits should be bundled into a single merge request by default, with user confirmation.

**Rationale:** Per-task commits are a recovery mechanism, not a review unit. Without this guidance, the granular commit history could produce noisy PRs. The user confirmation step ensures the agent doesn't automatically submit without the user's awareness.

**Alternative considered:** Automatically bundling commits into a single squashed commit. Rejected because rewriting history destroys the recovery trail before the user has confirmed the work is complete, and some users may prefer the granular history.

## Risks / Trade-offs

**[Agents may still batch despite stronger instructions]** → The instructions are the strongest lever available without programmatic enforcement. The combination of rationale, sub-step structure, hard gate language, and first-position guardrail is significantly stronger than the current single bullet. If agents still batch, the next step would be hooks or validation — but that's a separate change.

**[Per-task commits add overhead]** → Each checkpoint adds a git commit, which takes time and creates history. This is intentional — the overhead is the cost of recoverability. The tightly-coupled grouping rule mitigates this by allowing natural units to be committed together.

**[`git add -A` may stage unintended files]** → This matches the existing convention in the upstream proposal. Projects with sensitive files should have `.gitignore` configured appropriately. Changing to explicit file staging would require the agent to track which files each task modified, adding complexity disproportionate to the risk.

**[Commit message format is prescriptive]** → The `task N: <short description>` format is simple and traceable. Projects with strict commit conventions can override this via project config rules.
