# Spec Deltas: autonomous-apply

## ADDED Requirements

### Requirement: Autonomous Apply Skill Exposed

The system SHALL expose a skill named `openspec-autonomous-apply` through the standard OpenSpec skill-generation pipeline (`pnpm generate:skills`) and the `openspec init` workflow.

#### Scenario: Claude Code installation
When a user runs `npx openspec@latest init --tools claude-code` in a project, the generated `.claude/skills/openspec-autonomous-apply/SKILL.md` SHALL exist and SHALL be invocable as `/openspec-autonomous-apply` in Claude Code.

#### Scenario: Codex installation
When a user runs `npx openspec@latest init --tools codex` in a project, the generated `.agents/skills/openspec-autonomous-apply/SKILL.md` SHALL exist and SHALL be loadable by Codex as a project skill.

#### Scenario: OpenCode installation
When a user runs `npx openspec@latest init --tools opencode` in a project, the generated `.opencode/skills/openspec-autonomous-apply/SKILL.md` SHALL exist and SHALL be invocable as `/opsx:autonomous-apply` in OpenCode.

### Requirement: Filesystem Containment During Implementation

The autonomous-apply workflow SHALL guarantee that implementation subagents (the agent executing the OpenSpec apply phase) perform all file modifications only inside a dedicated git worktree under `.claude/worktrees/openspec-<change-name>/`. The main repository checkout SHALL remain read-only during implementation.

#### Scenario: Worktree isolation active
Given a project with an existing OpenSpec change, when the autonomous-apply skill starts Phase 3 (Apply Implementation), it SHALL create or reuse a worktree path `.claude/worktrees/openspec-<change-name>/`, and every file edit, test run, and command execution by the implementation subagent SHALL resolve paths inside that worktree. The skill SHALL NOT permit writes to the main checkout, `$HOME`, `/etc`, or `/var`.

#### Scenario: Worktree unavailable fallback
Given a host environment where git worktree creation fails (e.g. protected `HEAD`, read-only repo root), the skill SHALL document a container-based containment fallback (read-only mounts of `$HOME`, `/etc`, `/var`; repo mounted at identical absolute path) and SHALL NOT silently proceed without containment.

#### Scenario: Main checkout merge-only-after-gate
Regardless of how implementation subagents report success, the workflow SHALL NOT modify the main checkout until Phase 7 (Merge Decision) and only after explicit user selection of a merge strategy.

### Requirement: Bounded Parallel API Concurrency

The workflow SHALL cap concurrent LLM API requests issued by parallel subagents and Workflow fan-out to a user-configurable limit with a safe default.

#### Scenario: Default cap
If `openspec/config.yaml` does not define `agent.max_parallel_requests`, the workflow SHALL behave as if the value is 2 and SHALL additionally present the user with a one-time interactive choice: "e-INFRA API limit is 4. Current setting is 2. Raise to 4?" (allowed values: 2 or 4).

#### Scenario: Configured cap
If `openspec/config.yaml` contains `agent.max_parallel_requests: N` where N is an integer in `[1,4]`, the workflow SHALL use N without prompting.

#### Scenario: Enforcement in fan-out
Any multi-agent review or parallel implementation task SHALL chunk its Work so that no more than the effective cap concurrent subagent invocations are active at any time. The workflow SHALL NOT use unbounded `Promise.all` or equivalent flat fan-out in generated scripts.

### Requirement: Autonomous Reference-Run Validation Loop

The workflow SHALL autonomously drive a reference command/dataset (declared in the source proposal or provided by the user) through the loop `run → inspect → classify → fix-one → rerun` until the run completes with zero in-scope technical/programmatic errors, or until the user stops it.

#### Scenario: Detached long-running job
The reference command SHALL always be launched as a detached background process (`setsid nohup <cmd> > run.log 2>&1 < /dev/null &`) and SHALL never run in the foreground of the shell tool. The workflow SHALL poll for completion via exit-code markers in logs.

#### Scenario: Iterative fix and regression test
Each loop iteration SHALL apply exactly one meaningful fix (or trivially identical fixes) before rerunning. Each fix SHALL get a regression test that (a) passes after the fix and (b) discriminates (would have failed before).

#### Scenario: Out-of-scope input-data errors
Errors caused by the input dataset itself SHALL be recorded for the domain expert and SHALL NOT be "fixed" by mutating the input data.

### Requirement: Local Multi-Agent Review with Cap Respected

The workflow SHALL execute a local multi-agent review of all changes produced in the worktree using at least two independent reviewer agents (correctness and security), plus optional project-specific reviewers, all bounded by the concurrency cap.

#### Scenario: Review fan-out
Reviewers SHALL run as parallel `Agent`/`Workflow` subagent invocations with `maxConcurrency` equal to the effective cap. Each reviewer SHALL report typed findings (`{file, line, category, failure_scenario, summary, short_summary}`) using the target assistant's structured reporting tool (e.g. `ReportFindings` in Claude Code) or a structured JSON in the final message for assistants without such a tool.

#### Scenario: Adversarial verification
Each non-trivial finding SHALL be verified by a second adversarial reviewer that either confirms or rejects it with reasoning. The orchestrator SHALL fix all confirmed findings, rerun tests, and loop until no confirmed findings remain.

#### Scenario: Review gate before verification
`openspec verify` SHALL NOT be run until the review loop reports zero confirmed findings on the current worktree state.

### Requirement: Interactive Review and Merge Decision

After successful autonomous verification, the workflow SHALL interactively ask the user (in order, never as simultaneous questions) (1) how the code should be reviewed and (2) how/whether merge should happen, respecting the chosen review path.

#### Scenario: Review-mode menu
The workflow SHALL present a single prompt with options: (a) "Local agentic reviewers (Workflow fan-out + built-in code-review)" (recommended), (b) "Built-in code-review only", (c) "Existing GitHub PR reviewer" (adds the repository's configured reviewer label; no local fan-out), (d) "Manual review only". Default SHALL be (a).

#### Scenario: Merge-strategy menu
For options (a) or (b), after review passes, the workflow SHALL present a single prompt with options: (a) "Create PR and wait for my approval before merge" (recommended), (b) "Create PR and auto-merge if all checks green", (c) "I will merge manually, just push the branch". Default SHALL be (a). For option (c), no merge-strategy prompt SHALL be shown; the workflow SHALL add the reviewer label and stop. For option (d), the workflow SHALL stop after reporting the branch name.

#### Scenario: Merge execution
Auto-merge SHALL occur only after the user explicitly selects option (b) and all CI/status checks pass. The workflow SHALL wait indefinitely for user input on option (a) or (c) manual-merge paths.

### Requirement: Archive After Merge

Once the change is merged to main, the workflow SHALL archive the OpenSpec change via the existing archive workflow (`/opsx:archive`) and leave the worktree removed to avoid checkout drift.

#### Scenario: Post-merge cleanup
After merge (auto or manual), the workflow SHALL run `git worktree remove .claude/worktrees/openspec-<change-name>/` and `git branch -D feat/<change-name>` (or equivalent) unless the user explicitly asked to keep the worktree.

### Requirement: Configuration Support

The OpenSpec project configuration schema SHALL accept an optional `agent` block with an optional integer `max_parallel_requests` field in `[1,4]`, defaulting to 2. The key name SHALL be identical in the Zod schema, the skill text, and all install documentation.

#### Scenario: Schema validation
`openspec/config.yaml` containing `agent: { max_parallel_requests: 5 }` SHALL produce a validation warning and SHALL cause the workflow to fall back to 2 (with console note). Valid values 1–4 SHALL be accepted and respected.

### Requirement: Opt-In Installation Profile

The `autonomous-apply` workflow SHALL be registered in `ALL_WORKFLOWS` but SHALL NOT be part of the default `core` profile; users SHALL select it explicitly via a `custom` profile in the global OpenSpec config.

#### Scenario: Default init does not install
`openspec init --tools claude` with the default `core` profile SHALL NOT create `openspec-autonomous-apply/SKILL.md`.

#### Scenario: Custom profile installs
`openspec init --tools claude` with `profile: custom` and `workflows` containing `autonomous-apply` SHALL create `openspec-autonomous-apply/SKILL.md` under the tool's skills directory.

