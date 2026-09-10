# Design: add-autonomous-apply-workflow

## Context

The DSVR project demonstrated a successful autonomous propose→apply→review→merge loop, but the logic lives in ad-hoc project instructions, not reusable OpenSpec infrastructure. This change extracts the generic orchestration into a new skill template while keeping project-specific details (reference command, dataset, review agent set) outside the skill.

## Goals / Non-Goals

- **Goals**: single skill covering worktree sandboxing → bounded-concurrency apply → autonomous reference-run loop → local multi-agent review → `openspec verify` → interactive review/merge choice → archive; installable via standard `openspec init`; configuration via `openspec/config.yaml` `agent.max_parallel_requests`.
- **Non-Goals**: new CLI subcommand; Docker/container execution built into the skill; auto-commits/pushes without explicit user approval; modifying behavior of any existing skill.

## Decisions

### D1. Skill template, not CLI command
*Rationale*: Existing skills (`propose`, `apply-change`, `ff-change`, `verify-change`) are template files compiled into `skills/<name>/SKILL.md` at `pnpm generate:skills` time and installed by `openspec init`. Adding a skill template preserves this single source of truth; a CLI command would split orchestration logic across two places and require binary releases for behavioral changes.

*Mechanism*: `getAutonomousApplySkillTemplate(): SkillTemplate` in `src/core/templates/workflows/autonomous-apply.ts`; registered in `OPENSPEC_SKILL_NAMES` in `src/core/config.ts`; no command-surface changes because skills channel is sufficient.

### D2. Worktree containment as default; container as documentation
*Rationale*: Claude Code supports `Agent(isolation:"worktree")` natively; Codex and OpenCode do not have a first-class "worktree" subagent option, so the skill must instruct the agent to create and constrain a worktree manually. A skill file cannot enforce containment by itself, so the containment guarantee is "instructional containment + worktree filesystem boundary"; absolute prohibition of writes outside the worktree is the documented contract. Docker container isolation is the documented fallback when worktrees fail, not a runtime requirement.

*Constraint*: worktree path must be under the project's `.claude/worktrees/` directory (Claude Code convention) with a predictable name `openspec-<change-name>`.

### D3. Hard 4-request cap; default 2 with interactive raise
*Rationale*: e-INFRA LiteLLM gateway rate-limits parallel requests; exceeding 4 causes silent throttling or errors. Defaulting to 2 keeps common cases safe and fast enough; asking once per run lets a user opt into full speed without hard-coding their preference.

*Enforcement*: The skill text requires chunked `parallel()` batches (`Math.min(cap, remaining)` per iteration) and forbids unbounded `Promise.all` or flat agent fan-out. The effective cap is resolved in this priority order: (1) `openspec/config.yaml` `agent.max_parallel_requests`; (2) interactive user choice; (3) fallback 2.

### D4. Reviewer composition: two static + optional dynamic
*Rationale*: DSVR experience showed correctness and security are universally valuable; project-specific reviewers (docs, regression, perf) vary by project. Hard-coding two keeps the skill lightweight; the instructions specify how to derive dynamic reviewers from the project's `CODEOWNERS` or a `openspec/reviewers.yaml` if present, without requiring such a file.

### D5. Review/merge menus: sequential, never parallel
*Rationale*: Asking review-mode and merge-strategy in parallel can deadlock when the user's review-mode choice renders merge-strategy irrelevant (e.g. GitHub PR reviewer path already implies merge via GitHub). Two sequential prompts preserve conditional logic while staying interactive.

*Implementation*: Phase 7 uses single `AskUserQuestion` or equivalent sequential prompts, not batched prompts. The skill text explicitly prohibits batching.

### D6. Configuration schema: extend project config, not globals
*Rationale*: `agent.max_parallel_requests` is a project-level operational preference, not a user-machine-level setting. `openspec/config.yaml` is the right place. Global config (`~/.config/openspec/config.yaml`) remains untouched; a per-user default could confuse different projects with different rate limits.

*Schema*: `agent?: { max_parallel_requests?: number }` in `ProjectConfig`; Zod validation `.int().min(1).max(4)`; invalid values warn and fall back to 2.

## Risks / Trade-offs

- **Instructional containment risk**: Without sandbox enforcement, a buggy subagent could write outside the worktree. Mitigation: containment is documented as a "must" in the skill; worktree path is verified before apply; final gate checks for unexpected file changes outside worktree before merge.
- **Cap prompt fatigue**: Prompting every run is annoying. Mitigation: skill first checks `openspec/config.yaml`; if user sets it once, no more prompts. Document setting in install guides.
- **Skill length/complexity**: The autonomous workflow is long. Mitigation: skill file is allowed to be longer than existing skills (DSVR reference behavior was ~50 tool calls); readability is preserved by strict phase numbering and checklists.

## Migration Plan

1. Create branch `feat/openspec-autonomous-apply`.
2. Add template, config registration, project-config schema, install docs.
3. Build, generate skills, run tests.
4. PR review per DSVR protocol (Workflow fan-out).
5. Merge after user approval; archive change.

## Open Questions

- None; all constraints explicit from user.
