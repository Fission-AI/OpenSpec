## Why

The apply-change skill's task loop is the only point where implementation progress becomes durable. If a session crashes mid-implementation, only tasks marked `[x]` and committed to git can be recovered. The current instructions tell agents to "update task checkbox immediately after completing each task," but in practice agents routinely batch multiple tasks and mark them all complete at the end — meaning a crash loses all progress.

This happens because the instruction competes with stronger signals: coding agents are prompted to maximise parallelism and throughput, no rationale is given for *why* checkpointing matters, no anti-pattern is stated, and the "keep going through tasks until done" guardrail reinforces batching over discipline. The fix is to make checkpoint semantics explicit, explain the recovery purpose, and structure the loop as a hard gate rather than a soft preference.

## What Changes

- **Restructure step 6** of the apply-change skill from a simple loop into a checkpoint-disciplined loop with announce → implement → mark complete → commit → confirm stages
- **Explain the "why"** — frame the tasks file as a recovery log so agents understand the purpose of per-task updates
- **Add git commit to the checkpoint** — marking `[x]` without committing still loses progress on crash; committing makes recovery durable
- **Allow pragmatic grouping** — tightly-coupled tasks (e.g., a class change and its test) can be checkpointed together, but unrelated tasks must not be batched
- **Default to squashing per-task commits in merge requests** — per-task commits are a recovery mechanism, not a review unit. When creating a merge request for a change, all per-task commits should be included in a single PR by default, with the user prompted to confirm before submission
- **Reorder and strengthen guardrails** — move the checkpoint rule to the top, add an explicit anti-batching statement, remove the weaker "update task checkbox immediately" bullet it replaces

## Capabilities

### New Capabilities

- `apply-checkpoint-discipline`: Defines the checkpoint loop contract for the apply-change skill — when to checkpoint, what a checkpoint includes (mark complete + commit), how tightly-coupled tasks may be grouped, and the maximum batch size

### Modified Capabilities

_(none — no existing spec requirements are changing)_

## Impact

- **Files changed:** `src/core/templates/workflows/apply-change.ts` — both `getApplyChangeSkillTemplate()` and `getOpsxApplyCommandTemplate()`. These are the source templates from which all tool-specific SKILL.md and command files are generated during `openspec init`.
- **No breaking changes:** The checkpoint loop is a refinement of the existing loop, not a new workflow step
- **Trade-off: resilience vs parallel efficiency.** Committing after each task adds overhead and prevents agents from parallelising unrelated tasks. This is intentional — the tasks file exists for recoverability, and that value is lost if progress isn't persisted. The tightly-coupled grouping rule (up to 2–3 tasks) provides a pragmatic escape valve so agents aren't forced to split changes that would be incoherent apart.
- **Trade-off: granular commits vs reviewable PRs.** Per-task commits create a clean recovery trail but would produce noisy merge requests if submitted as-is. The default behaviour should be to bundle all per-task commits for a change into a single PR, with user confirmation before submission.
- **No schema changes** — this modifies skill instructions only, not the artifact graph or schema definitions
