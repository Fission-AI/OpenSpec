# Change: add-autonomous-apply-workflow

## What

Add a new reusable workflow skill, **`/openspec-autonomous-apply`**, to the OpenSpec repository. It orchestrates end-to-end autonomous implementation of any OpenSpec change (proposal → implementation → review → PR review → merge decision → archive) with three non-negotiable constraints:

1. **Filesystem sandboxing**: implementation subagent works only inside a dedicated git worktree (`.claude/worktrees/openspec-<change>/`); the main checkout is read-only during implementation. Container isolation is the documented fallback when worktrees are unavailable.
2. **Bounded API concurrency**: parallel agent/workflow calls are capped at **2 by default**, user-configurable up to **4** (hard e-INFRA limit); the cap is read from `openspec/config.yaml` (`agent.max_parallel_requests`) or prompted for.
3. **Human-merge gate**: automatic merges never happen. After verification, the user is interactively asked to choose the review mode and merge strategy.

The skill is intended for any repository (any project, any dataset) driven by OpenSpec proposals and is modeled on the autonomous reference-run validation pattern used in the DSVR project (`replace-molscrub-with-unipka`); the reference-run command and dataset are read from the change proposal, not hard-coded.

## Why

- The DSVR workflow demonstrated that a fully autonomous propose→apply→review→PR loop works but is currently encoded in one-off instructions. Users of the OpenSpec fork need the same pattern as a reusable, installed skill.
- e-INFRA API has a hard parallel-request limit (4); overshooting silently degrades quality. A default of 2 with an explicit raise-to-4 prompt prevents surprise rate limiting.
- Autonomous agents with shell access can accidentally delete or modify host files. Worktree isolation is the smallest reliable containment that works in Claude Code, Codex, and OpenCode without requiring Docker.
- Review and merge preferences differ per project; interactive choice after verification (local agentic reviewers, GitHub PR reviewer, manual) preserves flexibility without hard-coding vendor assumptions.

## Non-Goals

- No new `openspec` CLI subcommand; integration is skill-template only (same pattern as `openspec-ff-change`).
- No built-in Docker/container runtime management; container fallback is documented advice, not executed logic.
- No automatic commit/push or merge; all git write operations on the main checkout require explicit user approval at the final merge gate.
- No changes to existing skills' behavior.

## Approach

A. **New skill template** `src/core/templates/workflows/autonomous-apply.ts` exposing `getAutonomousApplySkillTemplate()` returning `{ name: 'openspec-autonomous-apply', ... }`; generated into `skills/openspec-autonomous-apply/SKILL.md` by `pnpm generate:skills`. Registered in `OPENSPEC_SKILL_NAMES` in `src/core/config.ts`.

B. **Orchestration inside the skill**: seven phases — (1) preflight/sandbox setup, (2) worktree initialization, (3) apply implementation in worktree, (4) autonomous reference-run validation loop (per `SKILL.md` discipline), (5) local multi-agent review fan-out (bounded by cap), (6) verification (`openspec verify`), (7) interactive review-mode + merge decision, (8) archive. Each phase has explicit gates; failure loops back to implementation.

C. **Concurrency control**: the skill never issues more than `max_parallel_requests` (default 2) concurrent subagent/Workflow invocations. Workflow scripts use chunked `parallel()` batches, never unbounded `Promise.all`. Configuration read from `openspec/config.yaml` `agent.max_parallel_requests: 2` when present; otherwise the skill prompts once and uses 2.

D. **Review/merge menus**: after verification, sequential interactive prompts: (1) review-mode choice, (2) if local review selected, merge-strategy choice. No merge or PR creation happens until both choices are made and implementation is clean.

## Alternatives Considered

- **New CLI subcommand** (`openspec autonomous`): rejected — duplicates skill logic, binds behavior to binary release, harder for users to customize per-project.
- **Modify `openspec-apply-change` in place**: rejected — changes default behavior for all users; autonomous workflow is opt-in and heavier (review fan-out, sandbox setup).
- **Built-in worktree removal as hard requirement**: rejected — Codex/OpenCode may not support worktree isolation natively; skill must document manual `git worktree` fallback.

