---
name: openspec-review
description: Iterative multi-agent loop that reviews, critiques, and implements changes until the OpenSpec is fully satisfied and all tests pass. Use when the user wants a full review–fix cycle on one or more OpenSpec changes before archiving.
allowed-tools: Bash(openspec:*)
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
---

Run an iterative review–critique–implement loop on an OpenSpec change: spawn subagents from the self-contained role briefs below, apply fixes where issues are found, and repeat until the consensus check passes.

The skill does NOT depend on any pre-installed agent definitions. The role briefs ARE the prompts: each subagent receives its role, rules, and output format from this skill.

**Store selection:** If the user names a store (a store is a standalone OpenSpec repo registered on this machine) or the work lives in one, run `openspec store list --json` to discover registered store ids, then pass `--store <id>` on the commands that read or write specs and changes (`new change`, `status`, `instructions`, `list`, `show`, `validate`, `archive`, `doctor`, `context`, `schemas`, `view`). Once selected, treat `--store <id>` as sticky for the rest of the workflow. Every unscoped example of those commands below is shorthand: before running it, append the flag. For example, run `openspec status --change "<name>" --json --store "<id>"`, not the unscoped form shown below. Other commands do not take the flag. Hints printed by commands already carry the flag; keep it on follow-ups. Without a store, commands act on the nearest local `openspec/` root.

**Input**: Optionally specify a change name (e.g., `/openspec-review add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Spawning roles**

For each role, spawn a general-purpose subagent (Agent tool, `subagent_type: general-purpose`) with exactly two things:
1. The role brief, verbatim, from the Role Briefs section.
2. The change context block (built in step 2).

Do not assume any named agent type (reviewer/critic/implementer/etc.) exists. If subagent spawning is unavailable, the executor runs each brief itself, one at a time, in sequence — honoring the same read-only/write boundaries.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and ask the user to select one

   Always announce: "Reviewing change: <name>" and how to override (e.g., `/openspec-review <other>`).

2. **Load change context**

   ```bash
   openspec status --change "<name>" --json
   openspec instructions apply --change "<name>" --json
   ```

   Read all artifacts from `contextFiles` (proposal, design, specs, tasks). Identify the modules/paths the change touches and the project's build and test commands for them. Build the change context block that every role receives:

   ```
   Change: <name>
   Artifacts: <paths to proposal, design, delta specs, tasks>
   Modules: <affected modules/paths>
   Build: <build command for affected modules>
   Tests: <test command for affected modules>
   ```

3. **Review** — spawn a subagent with the REVIEWER brief. Read-only role.

4. **Critique** — spawn a subagent with the CRITIC brief, passing the reviewer's findings verbatim. Read-only role.

5. **Implement fixes** — for each confirmed must-fix issue, spawn a subagent with the IMPLEMENTER brief (bugs, missing requirements, failing tests) or the SIMPLIFIER brief (complexity, dead code). One issue per subagent. Run fixers sequentially with disjoint file scopes.

6. **Re-verify** — repeat steps 3–5 until the reviewer reports `CLEAN` and the critic reports `PASS`.

7. **Consensus check** — the executor determines consensus directly from evidence (no subagent). Consensus holds only when ALL of:
   - Reviewer verdict `CLEAN`: every spec requirement/scenario implemented, every task genuinely complete
   - Critic verdict `PASS`: no blocking findings
   - `openspec validate --change "<name>" --json` reports the change valid
   - All tests for the affected modules pass and the build completes with no errors

   If any condition fails, feed the failing evidence back into step 5 and repeat the loop.

8. **Report**

   ```markdown
   ## OpenSpec Review: <name>

   | Cycle | Reviewer | Critic | Fixes applied |
   |-------|----------|--------|---------------|
   | 1     | ...      | ...    | ...           |

   **Consensus:** ✅ REACHED / ❌ NOT REACHED (outstanding items)
   **Tests:** <pass/fail summary>
   **Validate:** <openspec validate result>
   **Verdict:** Ready for archive / Not ready — <reasons>
   ```

**Role Briefs**

Each brief is a complete, self-contained prompt. Pass it verbatim together with the change context block.

### REVIEWER (read-only)

You are a code reviewer auditing an OpenSpec change implementation. READ-ONLY: do not modify, create, or delete any file; do not run mutating commands (no git commit, no edits, no installs).

Given the change context block, do:
1. Read every change artifact (proposal, design, delta specs, tasks).
2. Verify each requirement and scenario in the delta specs is implemented: locate the code and quote `file:line` as evidence.
3. Verify every task in tasks.md is genuinely complete: the implementation exists AND is tested. A checkbox with no code or no test is a must-fix finding.
4. Run the build and test commands from the context block. Report failures with the relevant output.
5. Check the changed files for security issues (secrets, injection) and regressions against surrounding code.

Report every finding in exactly this format:
- `MUST-FIX | file:line | issue | evidence (quoted code or test output)`
- `SUGGESTION | file:line | issue | why`

End with one line: `Verdict: CLEAN` or `Verdict: ISSUES (N must-fix, M suggestions)`.

### CRITIC (read-only)

You are a critic challenging a review's findings and hunting for what it missed. READ-ONLY: do not modify any file.

Given the change context block plus the reviewer's findings, do:
1. Challenge each reviewer finding: is it real? Verify with `git diff`, test output, or quoted code. Mark each finding `CONFIRMED` or `REJECTED`, with evidence.
2. Find what the reviewer missed: edge cases (null, empty, boundary, concurrency), logic gaps, silent failures, regressions, and scope creep beyond the change's artifacts.
3. Flag over-engineering: abstractions, config, or complexity the change does not need (YAGNI).
4. Classify every finding: `BLOCKING` (spec violated, data loss, security, failing test) | `WARNING` | `SUGGESTION`. Offer a concrete alternative for each, not just criticism.

End with one line: `Verdict: PASS` | `Verdict: WARNING` | `Verdict: BLOCKING (N blocking, M warnings, K suggestions)`.

### IMPLEMENTER (writes code)

You are implementing a fix for one confirmed issue. SURGICAL CHANGES ONLY: fix the stated issue and nothing else — no refactoring, no adjacent fixes, no new features, no new abstractions.

Given the change context block plus one issue (file, line, description, evidence), do:
1. Read the surrounding code and existing tests.
2. If the issue is missing or wrong behavior: write or update the failing test first, then the minimal fix (red → green).
3. Run the test command from the context block; tests must pass before you finish. If a test was already failing before your change, prove it (show the pre-change run) and say so.
4. Stay inside the files named in the issue. If the fix requires touching other files, stop and report why instead of proceeding.

Report: files changed; one line per change; the test command and its result output.

### SIMPLIFIER (writes code)

You are simplifying code flagged as over-complex. BEHAVIOR-PRESERVING REFACTOR ONLY: no new features, no behavior changes, no new abstractions.

Given the change context block plus the target files and the flagged complexity, do:
1. Before removing or renaming anything, check usages (grep) and git history. Exported symbols and public APIs are contracts: do not rename or remove them.
2. In small safe steps: remove dead code, flatten nesting, consolidate duplication, improve naming.
3. Run the test command from the context block after each step; on failure, revert that step.

Report: files changed; lines removed/changed; the test command and its result output.

**Guardrails**

- **Read-only roles never write** — only the IMPLEMENTER and SIMPLIFIER modify code, one issue at a time, sequentially, with disjoint file scopes.
- **Evidence over assertions** — every finding and every fix cites `file:line`, test output, or build output.
- **Distinguish pre-existing failures** — failures that predate the change (with proof) are noted separately and do not block consensus.
- **No task checkbox flips without proof** — a task is complete only when its implementation and tests exist.
- **Consensus is the only exit** — one clean reviewer pass is not enough; all four consensus conditions must hold.
- **Per-change loops** — if multiple changes are in scope, complete the full loop for one change before starting the next.
