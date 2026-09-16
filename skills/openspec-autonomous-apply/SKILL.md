---
name: openspec-autonomous-apply
description: Autonomous end-to-end OpenSpec change implementation: worktree isolation, bounded-concurrency apply, autonomous reference-run validation, local multi-agent review, interactive merge decision, and archive.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

# Autonomous Apply Workflow — /openspec-autonomous-apply

## Purpose

Take a proposed OpenSpec change all the way from planning artifacts to a merged, archived change **autonomously**, with three non-negotiable behavioral guarantees:

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`, `schemas`, `view`). Once selected, treat `--store <id>` as sticky for the rest of the workflow. Every unscoped example of those commands below is shorthand: before running it, append the flag. For example, run `openspec status --change "<name>" --json --store "<id>"`, not the unscoped form shown below. Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

1. **Files outside the isolated worktree are never modified by implementation subagents.** The main checkout and $HOME are read-only during implementation.
2. **Concurrent LLM API calls are capped.** Default 2, user-configurable up to 4 (e-INFRA hard limit).
3. **Merge decisions are never automatic.** After verification, the user explicitly chooses the review mode and merge strategy.

---

## Non-Negotiables (read first, enforce throughout)

| Rule | Enforcement |
|------|-------------|
| **Containment** | Implementation edits only `.claude/worktrees/openspec-<change-name>`. Main checkout read-only. No $HOME writes. Git worktree available? Use it. Not available? Document container fallback and do not proceed silently. |
| **Concurrency cap** | Default 2. Never exceed 4 total concurrent subagent/Workflow/API calls. Never use unbounded Promise.all or flat agent fan-out in generated scripts. Read from `agent.max_parallel_requests` in `openspec/config.yaml` if set; otherwise ask the user once: "e-INFRA API limit is 4. Current setting is 2. Raise to 4?" |
| **Human merge gate** | Never auto-commit, auto-push, or auto-merge. After verification always ask: review mode → merge strategy. The user's words, not assumptions. |
| **Detached run discipline** | Never run the reference command in the foreground of the shell tool. Launch as `setsid nohup <cmd> > run.log 2>&1 < /dev/null &`, poll for exit. |
| **One-fix-per-rerun** | Autonomous loop applies one meaningful fix before rerunning. Trivially identical defects may be combined. |
| **Out-of-scope input data** | Errors caused by the input dataset itself are recorded, not "fixed" by mutating input. |

---

## Eight Phases (run in strict order; skip only explicitly deliberately-skipped phases)

### Phase 1 — Preflight

1. Resolve the active change:
   - Run `openspec list --json` and find the change(s) with unfinished tasks (task count below total, or offered by the user).
   - If exactly one → use it. If multiple → ask user which one. If none → stop: "Run `/openspec-propose` first."
   - **Sanity-check the change name before any path/shell use**: it must match `^[a-z0-9][a-z0-9-]*[a-z0-9]?$` (kebab-case, max 64 chars). Reject anything else (spaces, slashes, dots, backticks, shell metacharacters) and stop — change names flow into paths and branch names below.
2. Read change artifacts from `openspec/changes/<change-name>/`: `proposal.md`, `tasks.md`, all `specs/*/spec.md`, `design.md` (if present).
3. Read `openspec/config.yaml` for `agent.max_parallel_requests`. If absent note that Phase 3's first review/merge prompt will ask the concurrency question.
4. Verify repository state:
   - `git status --porcelain` must be clean or contain only untracked OpenSpec planning files.
   - If dirty: stop and ask user to `git stash` or `git commit`.
5. Ask user to confirm scope: 'I see change "<change-name>" with N tasks: implement all autonomously?' Wait for explicit yes.

### Phase 2 — Worktree Initialization

1. Base branch: current branch (usually `main`).
2. Create feature branch `feat/<change-name>` (if not exists).
3. Pick a host-appropriate worktree root: `.claude/worktrees/` on Claude Code, `.agents/worktrees/` on Codex, `.opencode/worktrees/` on OpenCode (match the host's own skill directory convention so its tooling does not treat the path as another assistant's private cache).
4. Create worktree at `<worktree-root>/openspec-<change-name>/`:
   ```bash
   git worktree add <worktree-root>/openspec-<change-name>/ -b feat/<change-name>
   ```
5. Record the worktree path in a scratch file `<worktree-root>/openspec-<change-name>/.openspec-autonomous.json`:
   ```json
   { "change": "<change-name>", "branch": "feat/<change-name>", "max_parallel_requests": 2, "created_at": "..." }
   ```
6. If worktree creation fails → document container fallback (`Container.md` pattern) and stop unless user approves proceeding read-only.

### Phase 3 — Apply in Worktree

1. Spawn implementation subagent with access ONLY to the worktree path (Claude Code: `Agent(isolation="worktree", ...)`; Codex/OpenCode: instruct agent to `cd` into worktree before any file operation).
2. Instruction idiom: read `tasks.md` top-to-bottom; implement each task minimally; run project test/lint/type after each meaningful unit; keep changes minimal and behavior-preserving.
3. Monitor implementation progress via task status updates.
4. On completion ensure worktree builds and baseline tests pass (`pnpm test` or project equivalent) inside the worktree.

### Phase 4 — Autonomous Reference-Run Loop

The proposal may declare a **reference command** and **dataset** (e.g. `dsvr prepare-ligands examples/Vaclavs_heterocycles_set1.smi --out runs/<tag>`). If declared:

1. Loop `run → inspect → classify → fix-one → rerun` until full clean run or user stops.
2. Launch detached ONLY:
   ```bash
   setsid nohup bash -c '<cmd>; echo "EXIT=$?"' > run.log 2>&1 < /dev/null &
   ```
   Poll `run.log`, `done.json`, `pgrep -f "[p]attern"`.
3. After each run inspect **every** artifact: exit code, stdout/stderr, per-item failure logs, stage summaries, raw external tool logs.
4. Classification:
   - In-scope (MUST fix): installation/dependency/environment, external-tool config/invocation, workflow-code defects, other programmatic errors.
   - Out-of-scope (record, never fix by mutating input): input-data failures.
5. Fix one meaningful defect per rerun; regression test for every testable fix; rerun until zero in-scope errors.
6. Keep findings log at `.claude/worktrees/openspec-<change-name>/findings.md`.

### Phase 5 — Local Multi-Agent Review (bounded)

After Phase 4's clean run (or after Phase 3 if no reference run is defined):

1. Gather changed file list: `git diff --name-only $(git merge-base HEAD feat/<change-name>)` inside worktree.
2. Fan out reviewers bounded by cap (default 2, max 4):
   - Reviewer 1: **correctness** — logic errors, edge cases, regressions.
   - Reviewer 2: **security** — injection, unsafe file ops, privilege issues.
   - Optional dynamic (max cap-2 remaining slots): docs, perf, regression coverage.
3. Hard enforcement of cap (Claude Code example):
   ```javascript
   const chunkSize = maxParallel; // 2 by default, max 4
   const agents = [correctnessPrompt, securityPrompt, ...dynamic];
   for (let i = 0; i < agents.length; i += chunkSize) {
     const chunk = agents.slice(i, i + chunkSize);
     const results = await parallel(chunk.map(a => () => agent(a.prompt, {label: a.name})));
     // process chunk results before next chunk
   }
   ```
4. Report findings via target assistant's structured tool (`ReportFindings` in Claude Code) or as structured JSON in final report for Codex/OpenCode.
5. Adversarial verification: every non-trivial finding gets a second-opinion review confirming or rejecting it.
6. Fix confirmed findings, rerun tests, loop until zero confirmed findings.

### Phase 6 — Verification

```bash
openspec validate <change-name>
```
Must return clean. If it fails, feed errors back to the Phase 5 fix loop. Do not proceed to Phase 7 until validation is clean.

### Phase 7 — Interactive Review and Merge Decision

Sequential, never batched:

**Step 1 — Review mode** (ask regardless of local review already done):
Options:
- (a) Local agentic reviewers (Workflow fan-out + built-in code-review) — **recommended**
- (b) Built-in code-review only
- (c) Existing GitHub PR reviewer (add repo's configured label; no local fan-out)
- (d) Manual review only — stop after reporting branch name

Default: (a).

**Step 2 — Merge strategy** (only if Step 1 = a or b):
Options:
- (a) Create PR and wait for my approval before merge — **recommended**
- (b) Create PR and auto-merge if all checks green
- (c) I will merge manually, just push the branch

Default: (a). Honor e-INFRA cap for any PR-status polling (sequential, not parallel).

### Phase 8 — Merge, Archive, Cleanup

1. If user selected auto-merge and checks green: merge PR (or merge branch) into main.
2. If manual: print branch and PR URL, leave to user.
3. After merge: run `/openspec-archive-change <change-name>`, remove worktree:
   ```bash
   git worktree remove .claude/worktrees/openspec-<change-name>/
   git branch -d feat/<change-name>
   ```
4. Print final summary: issues found, fixes applied, out-of-scope data errors for domain expert, final test/lint/type status.

---

## Guardrails

- **Never foreground long-running reference command.**
- **Never exceed 4 concurrent API calls.** Fewer than cap is fine; more is never fine.
- **Never auto-merge without explicit user selection in Step 2.**
- **Pre-existing lint/type debt** outside your changed lines: fix only your own lines; record pre-existing repo-wide debt as out-of-scope.
- **Pre-existing failing tests**: do not fix unless caused by your change; record as out-of-scope.
- **User stops autonomous loop**: honor immediately; do not argue.

---

## Assistant-Specific Notes

### Claude Code

- Use `Agent(isolation: "worktree", subagent_type: "general-purpose")` for implementation.
- Use `Workflow` for review fan-out with chunked `parallel()` batches of size `max_parallel_requests`.
- Use `AskUserQuestion` for Phase 7 menus; **never batch Step 1 and Step 2 in one call**.
- Skill is invocable as `/openspec-autonomous-apply` (or `/opsx:autonomous-apply` if that alias is registered by the OpenSpec CLI).

### Codex

- Skills are loaded from `.agents/skills/openspec-autonomous-apply/SKILL.md`.
- When spawning subagents, instruct each one to `cd` into the worktree path before any file operation; there is no built-in `isolation="worktree"` flag.
- Chunk subagent mentions (`@agent` or `@subagent` syntax) to max 2 at a time by default.
- Use sequential Q&A for Phase 7 menus rather than parallel prompts.
- Generated skill name is `openspec-autonomous-apply`.

### OpenCode

- Skill is invocable as `/opsx:autonomous-apply`.
- Ensure `~/.config/opencode/opencode.json` includes the project's `.opencode/skills` directory in its `paths.skills` array.
- Manual worktree discipline is required; no built-in agent isolation flag.
- Generated command is `opsx:autonomous-apply`.

---

## Configuration

Optional `openspec/config.yaml` block the skill reads:

```yaml
agent:
  # default 2; maximum 4 enforced by the workflow regardless of higher config values
  max_parallel_requests: 2
```

If absent, workflow behaves as if 2 and asks user whether to raise to 4 during Phase 3's first review/merge prompt and Phase 7's Step 1.


