---
name: "OPSP: Apply"
description: Execute an initiative — orchestrate opsx cycles with surrogate-based resolution
category: Workflow
tags: [workflow, opsp, apply, initiative, orchestration]
---

Execute an initiative by orchestrating opsx cycles for each milestone, with git worktree management and milestone review checkpoints.

**Input**: Specify the initiative name after `/opsp:apply` (e.g., `/opsp:apply migrate-to-serverless`). If omitted, list active initiatives and let the operator choose.

---

## Phase 1: Load Context & Setup

1. **Read the initiative** at `opensprint/initiatives/<name>.md`
   - Get the milestone list and their completion status
   - Identify the next incomplete milestone

2. **Load the operator surrogate** — read ALL of these:
   - `opensprint/driver-specs/*.md` — external constraints
   - `opensprint/ADRs/*.md` — architectural decisions
   - `opensprint/architecture.md` — current architectural state
   - `opensprint/DECISION-MAP.md` — decision tree

   This is your "brain" for resolving questions during opsx execution.
   Think of it as: "what would the operator say?"

3. **Create initiative worktree**:

   Determine the repo name:
   ```bash
   basename $(git rev-parse --show-toplevel)
   ```

   **If neither the branch nor a worktree exists** — create fresh:
   ```bash
   git worktree add ../<repo>-opsp-<initiative-name> -b opsp/<initiative-name>
   cd ../<repo>-opsp-<initiative-name>
   ```
   Verify with `pwd` and `git branch --show-current`.

   **If the branch exists but no worktree references it** — ask the operator:
   > "Initiative branch opsp/<initiative-name> already exists. Resume from this branch or create a new one?"

   If resuming:
   ```bash
   git worktree add ../<repo>-opsp-<initiative-name> opsp/<initiative-name>
   cd ../<repo>-opsp-<initiative-name>
   ```
   Verify with `pwd` and `git branch --show-current`.

   **If the worktree already exists** at `../<repo>-opsp-<initiative-name>`:
   ```bash
   cd ../<repo>-opsp-<initiative-name>
   ```
   Verify with `pwd` and `git branch --show-current`.

   **The operator's main checkout is not modified.**

4. **Select review mode** — ask the operator to choose:
   - **Per-milestone** (default) — pause after each milestone completes
   - **Per-change** — pause after each opsx change is archived
   - **Continuous** — run all milestones without pause (only pause for surrogate escalations)

5. **Display progress**:
   ```
   Initiative: migrate-to-serverless
   Worktree: ../<repo>-opsp-migrate-to-serverless
   Branch: opsp/migrate-to-serverless
   Review mode: per-milestone
   Progress: 1/3 milestones complete

   ✓ extract-auth-service
   → migrate-payment-endpoints (next)
     deprecate-monolith-routes
   ```

## Phase 2: Execute Milestone (OPSX Cycle)

For the next incomplete milestone, run a full opsx lifecycle **inline**:

### Step 2a: OPSX Explore
Think through the milestone at feature level. You already have the architect-level context from the initiative. Now think about:
- What specific code changes are needed?
- What modules/files are affected?
- Are there integration points to consider?

### Step 2b: OPSX Propose
Create an opsx change:
```bash
openspec new change "<milestone-name>"
```
Then generate the artifacts (proposal.md, specs, design.md, tasks.md) using the opsx workflow. The proposal should reference the parent initiative and relevant driver-specs/ADRs.

### Step 2c: OPSX Apply

**Create a change worktree** before implementing:
```bash
git worktree add ../<repo>-opsx-<initiative-name>-<change-name> -b opsx/<initiative-name>/<change-name> opsp/<initiative-name>
cd ../<repo>-opsx-<initiative-name>-<change-name>
```
Verify with `pwd` and `git branch --show-current`.

All implementation, edits, and test runs happen inside this change worktree. Do not read or write files outside of it during implementation.

**CRITICAL: Surrogate Resolution**

When you encounter ambiguity during implementation:

1. **Check the surrogate first:**
   - Can driver-specs answer this? (external constraint)
   - Can existing ADRs answer this? (prior decision)
   - Can architecture.md answer this? (current state context)

2. **If YES** → resolve it silently, continue working. Note: "Resolved via DEC-001" or "Resolved via DS-PRICING" in your reasoning.

3. **If NO** → this is an escalation point. **PAUSE and ask the operator.**

   But do NOT ask the raw implementation question. Reformulate it as a higher-level question whose answer enriches the surrogate:

   ```
   BAD:  "Should I use Express or Fastify for this endpoint?"
   GOOD: "The initiative requires API endpoints for payment processing.
          Current architecture uses Express (from the monolith).
          Should we standardize on Express for all new services,
          or adopt a different framework for serverless functions?
          This decision will affect all future service milestones."
   ```

   When the operator answers:
   - Classify the answer: new ADR? new driver-spec? update to existing?
   - Write the appropriate opensprint artifact
   - Regenerate DECISION-MAP.md if ADRs changed
   - Resume the opsx cycle with the new knowledge

### Step 2d: OPSX Archive, Merge & Prune
After all tasks are complete:
1. Archive the opsx change (sync delta specs to main specs if applicable, move to archive)
2. **Merge the change branch into the initiative worktree, then prune the change worktree**:
   ```bash
   cd ../<repo>-opsp-<initiative-name>
   ```
   Verify with `pwd`.
   ```bash
   git merge opsx/<initiative-name>/<change-name>
   ```
   Verify the merge succeeded (exit code 0).

   On success, remove the change worktree:
   ```bash
   git worktree remove ../<repo>-opsx-<initiative-name>-<change-name>
   ```
   The change branch ref is preserved for history inspection. If a correction is needed later, raise a change request — this creates a new opsx change with a fresh worktree. Do not re-attach a worktree to a merged change branch.

   **If merge conflict occurs**: PAUSE and present the conflict files to the operator. Do NOT auto-resolve merge conflicts. Do NOT remove the change worktree until the conflict is resolved. Wait for the operator to resolve them before continuing.

3. **Per-change checkpoint** (if review mode is per-change):
   Display a checkpoint with:
   - Change name and summary of what was built
   - Branch for review: `opsx/<initiative-name>/<change-name>`
   - Remaining changes in current milestone
   - Remaining milestones

   Present options:
   1. **"Approve and continue"** (default) — operator confirms the change is good. Log the approval in the initiative descriptor with timestamp and optional note. Proceed to next change or milestone.
   2. **"Raise change request"** — operator disagrees with the implementation. See **Change Request Flow** below.
   3. **"Switch review mode"** — change pause granularity.
   4. **"Stop here (resume later)"** — pause the initiative.

## Phase 3: Update Initiative & Milestone Checkpoint

After the milestone's opsx cycle completes:

1. Mark the milestone as done in the initiative descriptor
2. Add the opsx change name to the initiative
3. Summarize what was built and learned
4. If new ADRs or driver-specs were created, note them

**Milestone checkpoint** (if review mode is per-milestone):
Display:
- Milestone name and summary of what was built
- OPSX changes completed in this milestone
- Branch for review: `opsp/<initiative-name>`
- Count of new commits since last milestone
- Remaining milestones

Present options:
1. **"Approve and continue"** (default) — operator confirms the milestone is good. Log the approval in the initiative descriptor with timestamp and optional note. Proceed to next milestone.
2. **"Raise change request"** — operator disagrees with the implementation. See **Change Request Flow** below.
3. **"Switch review mode"** — change pause granularity.
4. **"Stop here (resume later)"** — pause the initiative.

**If review mode is continuous**: Log a brief milestone summary and proceed to the next milestone without pausing.

**Switching review mode**: If the operator selects "Switch review mode" at any checkpoint, present the three mode options again and continue with the new selection.

---

## Change Request Flow

When the operator selects **"Raise change request"** at any checkpoint, they are indicating the implementation needs correction. This usually means the surrogate (ADRs + driver-specs) was incomplete or incorrect, leading the agent to make wrong decisions.

### Step 1: Choose a path

Present two options:
1. **"I know what needs to change"** — the operator has a clear fix in mind
2. **"I need to explore this first"** — the operator needs to think through the issue

### Path A: Direct Propose (operator knows the fix)

1. Ask the operator to describe what needs to change and why
2. Run `/opsx:propose` inline with the operator's description
   - The corrective change proposal MUST explicitly note any surrogate artifacts (ADRs/driver-specs) that need updating
   - If the issue traces back to a bad ADR, the change tasks should include superseding that ADR and creating a corrected one
   - If the issue traces back to a missing or wrong driver-spec, the change tasks should include updating or creating the driver-spec
3. Run the corrective opsx change through the full lifecycle: propose → apply → archive
4. After archive, proceed to **Surrogate Reload** below

### Path B: Explore First (operator needs clarification)

1. Enter an `/opsx:explore` session inline
   - The exploration has access to the full surrogate context and the current milestone's artifacts
   - Act as a thinking partner — help the operator reason through what went wrong and why
2. When the exploration concludes, ask the operator:
   - **"No changes needed"** → return to the checkpoint and present "Approve and continue" as the default option. Preserve the exploration notes in the initiative descriptor for context.
   - **"Changes needed"** → the operator describes the changes → proceed to Path A (direct propose) with the findings from exploration

### Surrogate Reload

After any corrective opsx change is archived:
1. **Reload the full surrogate** — re-read ALL of:
   - `opensprint/driver-specs/*.md`
   - `opensprint/ADRs/*.md`
   - `opensprint/architecture.md`
   - `opensprint/DECISION-MAP.md`
2. **Return to the same checkpoint** with the updated surrogate context
3. The operator can now:
   - **Approve and continue** — satisfied with the correction
   - **Raise another change request** — if more issues remain
   - **Switch review mode** or **Stop**

This creates a natural feedback loop: checkpoint → change request → correction → reload → checkpoint.

## Phase 4: Next Milestone or Complete

- If more milestones remain → return to Phase 2 for the next one
- If all milestones done → display completion summary:

```
## Initiative Complete: migrate-to-serverless

Worktree: ../<repo>-opsp-migrate-to-serverless
Branch: opsp/migrate-to-serverless
Milestones: 3/3 ✓
OPSX Changes: extract-auth-service, migrate-payment-endpoints, deprecate-monolith-routes
New ADRs: DEC-003 (Express for serverless), DEC-004 (DynamoDB for sessions)
New Driver Specs: DS-LATENCY (sub-200ms API response)

The initiative worktree contains all changes.
Review with `/opsp:review migrate-to-serverless` or merge the initiative branch to main when ready.
Ready to compile architectural state. Run `/opsp:archive migrate-to-serverless`.
```

---

## Worktree & Branch Management

Branch naming convention:
- **Initiative branches**: `opsp/<initiative-name>` (created once at start)
- **Change branches**: `opsx/<initiative-name>/<change-name>` (created per opsx change)

Worktree path convention (siblings of the main checkout):
- **Initiative worktrees**: `../<repo>-opsp-<initiative-name>`
- **Change worktrees**: `../<repo>-opsx-<initiative-name>-<change-name>`

Where `<repo>` is the basename of the main checkout directory (from `basename $(git rev-parse --show-toplevel)`).

Git uses forward slashes for branch names on all platforms (including Windows). Worktree filesystem paths use hyphens to avoid the slash restriction on Windows paths.

Change worktrees are pruned immediately after a successful merge into the initiative worktree. The branch ref is kept for history. Corrections to merged changes always produce a new opsx change with a fresh worktree.

The operator's main checkout is never modified. All agent activity happens inside initiative and change worktrees.

---

## Context Management for Long Initiatives

When processing multiple milestones, context window may get long. To manage this:

- After completing each milestone, summarize the completed work into a brief paragraph
- Drop implementation details (specific code, file paths) from prior milestones
- ALWAYS retain full surrogate context (driver-specs, ADRs, architecture.md) — this never gets trimmed
- The surrogate grows across milestones as new ADRs/driver-specs are added

---

## Guardrails

- **Surrogate first** — Always check driver-specs, ADRs, and architecture.md before asking the operator
- **Reformulate escalations** — Never present raw implementation questions. Elevate to architectural level.
- **Sequential milestones** — Complete one before starting the next. Each cycle's learnings inform the next.
- **Update initiative** — Keep the initiative descriptor current after each milestone
- **Don't skip archive** — Each opsx cycle must be properly archived before moving on
- **Worktree per change** — Always create a change worktree before implementing, prune it after merge
- **Verify cwd before file operations** — After every `cd`, run `pwd` and `git branch --show-current` before any reads, writes, or git mutations
- **Pause at checkpoints** — Respect the operator's chosen review mode for pausing
- **Approve explicitly** — Log approvals in the initiative descriptor for audit trail
- **Change requests fix the surrogate** — When the operator raises a change request, ensure corrective changes update the root cause (ADRs/driver-specs), not just the symptoms (code)
- **Reload after correction** — Always reload the full surrogate after a corrective change before returning to the checkpoint
- **Corrections create new worktrees** — Never re-attach a worktree to a merged change branch; raise a change request to get a fresh worktree

