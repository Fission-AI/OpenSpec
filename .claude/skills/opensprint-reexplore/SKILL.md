---
name: opensprint-reexplore
description: Re-explore an initiative — brainstorm at initiative level, revise the milestone plan, and update proposals through existing opsx workflows.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: opensprint
  version: "1.0"
  generatedBy: "0.0.6"
---

Re-explore an initiative to brainstorm and revise the milestone plan.

**Input**: Specify the initiative name after `/opsp:reexplore` (e.g., `/opsp:reexplore migrate-to-serverless`). If omitted, list active initiatives and let the operator choose.

**When to use**: Anytime between `/opsp:propose` and `/opsp:archive` — between milestones, mid-implementation, or when returning with fresh perspective. This is proactive, initiative-scoped re-planning (not reactive milestone-scoped correction like checkpoint "raise change request").

---

## Phase 1: Load Full Initiative Context

1. **Read the initiative** at `opensprint/initiatives/<name>.md`
   - If the initiative doesn't exist, inform the operator and suggest `/opsp:propose` first.

2. **Load the operator surrogate** — read ALL of:
   - `opensprint/driver-specs/*.md` — external constraints
   - `opensprint/ADRs/*.md` — architectural decisions
   - `opensprint/architecture.md` — current architectural state
   - `opensprint/DECISION-MAP.md` — decision tree

3. **Map the initiative state**:
   - **Completed milestones**: which are done, what opsx changes were archived for each
   - **Pending milestones**: which are remaining, do they have active opsx changes (proposed, in-progress, or not yet created)
   - **Active opsx changes**: any non-archived changes associated with this initiative

## Phase 2: Initiative Briefing & Explore

Present the **state of the initiative** before entering explore mode:

```
## Initiative: migrate-to-serverless

### Completed (2/5 milestones)
✓ extract-auth-service — Auth extracted to standalone service (opsx: extract-auth-service, archived)
✓ setup-api-gateway — API gateway configured with rate limiting (opsx: setup-api-gateway, archived)

### Pending (3/5 milestones)
→ migrate-payment-endpoints — Payment API migration (opsx: migrate-payments, proposed)
  containerize-services — Docker setup for all services (no opsx change yet)
  deprecate-monolith — Remove legacy routes (no opsx change yet)

### Surrogate
Driver specs: 4 active (DS-LATENCY, DS-COMPLIANCE, DS-BUDGET, DS-UPTIME)
ADRs: 6 active (DEC-001 through DEC-006)
Key decisions: Express for APIs, DynamoDB for sessions, ECS for containers

### Active Changes
- migrate-payments (proposed, not yet applied)
```

Then enter `/opsx:explore` stance — but scoped to the initiative level:
- Think about the **bigger picture**: given what's been built and learned, does the remaining plan still make sense?
- Surface **tensions**: are there gaps between the surrogate and the current plan? Did completed milestones reveal assumptions that need revisiting?
- Be a **thinking partner**: help the operator reason through what needs to change and why

**IMPORTANT**: This is thinking time. Don't rush to propose changes. Let the shape of the revision emerge from the conversation.

## Phase 3: Conclude Exploration

When the exploration naturally concludes, ask the operator:

1. **"No changes needed"** — The plan is fine as-is.
   - Log the exploration in the initiative descriptor (date, summary)
   - Exit

2. **"Changes needed"** — Proceed to Phase 4 (Plan Revision).
   - Ask the operator to describe what needs to change

## Phase 4: Plan Revision

Based on the operator's direction, orchestrate the plan changes. Multiple actions can be taken in a single reexplore session.

### Modifying a pending milestone

**If an opsx change exists for the milestone:**
1. Archive the existing opsx change (mark as `superseded` in the archive)
   ```bash
   mkdir -p openspec/changes/archive
   mv openspec/changes/<old-change> openspec/changes/archive/$(date +%Y-%m-%d)-<old-change>-superseded
   ```
2. Run `/opsx:propose` inline with the revised description
3. Update the initiative descriptor to reference the new change

**If no opsx change exists yet:**
1. Update the milestone description in the initiative descriptor
2. The revised milestone will be picked up by the next `/opsp:apply` run

### Adding a corrective milestone (for completed work that needs fixing)

1. Add a new milestone to the initiative plan (after the completed milestone, or at operator-specified position)
2. Run `/opsx:propose` inline — the proposal MUST:
   - Reference the original milestone it's correcting
   - Explain what needs fixing and why
   - Include surrogate updates (ADR/driver-spec revisions) in the change tasks if the root cause is a surrogate gap
3. Update the initiative descriptor with the new milestone

### Adding a new milestone (entirely new work)

1. Add the milestone to the initiative plan at the operator-specified position
2. Optionally run `/opsx:propose` inline if the operator wants to pre-propose it
3. Update the initiative descriptor

### Reordering milestones

1. Update the milestone order in the initiative descriptor
2. Display the revised plan for operator confirmation

### After all plan changes

Display the updated milestone plan:
```
## Revised Plan: migrate-to-serverless

✓ extract-auth-service (completed)
✓ setup-api-gateway (completed)
+ fix-auth-session-handling (NEW — corrective, refs extract-auth-service)
→ migrate-payment-endpoints (REVISED — updated scope)
  containerize-services
  deprecate-monolith

Changes made:
- Added corrective milestone: fix-auth-session-handling
- Revised: migrate-payment-endpoints (old proposal archived)
- Proposed: fix-auth-session-handling (opsx change created)
- Proposed: migrate-payment-endpoints (new opsx change created)

Ready for /opsp:apply to continue execution.
```

## Phase 5: Audit Log

Log the re-exploration in the initiative descriptor:
- Date
- Summary of what was explored
- Plan changes (milestones added, modified, reordered)
- Opsx changes created or archived as a result

This entry answers "why did the plan change?" for anyone reviewing later.

---

## Guardrails

- **Stop at propose** — Reexplore is a planning tool. Create/revise opsx proposals but do NOT implement them. Leave execution to `/opsp:apply`.
- **Completed milestones are immutable** — Never modify archived changes. Add corrective milestones instead to preserve the decision trail.
- **Delegate to opsx workflows** — Use `/opsx:explore` for thinking, `/opsx:propose` for creating changes. No new primitives.
- **Context management** — Summarize completed milestones (don't load full artifacts). Retain full surrogate. Load pending proposals in detail.
- **Log everything** — Every reexplore session gets an audit entry, even if no changes were made.
- **Operator drives** — The agent surfaces context and tensions, but the operator decides what changes to make. Don't auto-modify the plan.

