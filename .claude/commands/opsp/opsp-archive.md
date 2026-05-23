---
name: "OPSP: Archive"
description: Archive an initiative — compile architecture.md from current architectural state
category: Workflow
tags: [workflow, opsp, archive, initiative, architecture]
---

Archive a completed initiative by compiling the current architectural state into `opensprint/architecture.md`.

**Input**: Specify the initiative name after `/opsp:archive` (e.g., `/opsp:archive migrate-to-serverless`). If omitted, list active initiatives.

---

## Steps

### 1. Verify Initiative Completion

Read `opensprint/initiatives/<name>.md` and check:
- Are all milestones marked as done?
- If not, warn the operator and ask for confirmation to proceed

### 2. Compile architecture.md

Read all source materials:
- `opensprint/driver-specs/*.md` — all active driver specs
- `opensprint/ADRs/*.md` — all active/accepted ADRs
- `opensprint/DECISION-MAP.md` — the decision tree

Then **rewrite** `opensprint/architecture.md` with these sections:

#### System Overview
Synthesize from driver-specs: what is this system, what does it do, why does it exist?
Write as a narrative, not a list of specs.

#### Driver Specs
Compile a narrative of active driver specs, grouped by type (product, legal, compliance, etc.).
Link to each spec by ID for traceability.

#### Architectural Decisions
Walk the decision tree in narrative form. For each significant decision:
- State the decision and its rationale
- Reference the ADR by ID (e.g., "We chose serverless architecture (DEC-001) because...")
- Show how decisions chain together

#### System Structure
Describe the current system architecture — services, components, data stores, interfaces.
This should be derivable from the decisions but stated concretely:
"The system consists of: Auth Service (Lambda), Payment API (Lambda), ..."

Use ASCII diagrams where they help:
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│   Auth   │────▶│   API    │────▶│   Jobs   │
│ Service  │     │ Gateway  │     │ Service  │
└──────────┘     └──────────┘     └──────────┘
                       │
                       ▼
                 ┌──────────┐
                 │ DynamoDB │
                 └──────────┘
```

#### Constraints & Non-Negotiables
Extract from driver-specs the hard constraints that bound all implementation:
- Compliance requirements (SOC2, GDPR, etc.)
- Performance requirements (latency, throughput)
- Legal requirements (data residency, retention)
- Business constraints (pricing model, SLA)

### 3. Clean Up Worktrees

Remove any remaining worktrees created during the initiative. Change worktrees are normally pruned at merge, but any still present (e.g., from an interrupted run) should be cleaned up now.

```bash
git worktree list
```

For each opsp or opsx worktree listed that belongs to this initiative:
```bash
git worktree remove <path>
```

Then prune stale references:
```bash
git worktree prune
```

If any worktree contains uncommitted changes, pause and present them to the operator before removing. Do NOT silently discard uncommitted work.

After cleanup, remove the initiative worktree itself (it is no longer needed once the initiative branch is merged to main or otherwise resolved):
```bash
git worktree remove ../<repo>-opsp-<initiative-name>
```

### 4. Mark Initiative Completed

Update the initiative descriptor:
- Set `status: completed`
- Add `completed: <YYYY-MM-DD>` to frontmatter
- Ensure all opsx change references are listed

### 5. Display Summary

```
## Archive Complete

**Initiative:** migrate-to-serverless
**Status:** Completed
**Driver Specs:** 3 active
**ADRs:** 5 active
**OPSX Changes:** 3 completed
**architecture.md:** Updated ✓

The architectural state of the solution has been compiled.
Review opensprint/architecture.md for the complete picture.
```

---

## Key Principles

- **Synthesize, don't copy-paste** — architecture.md should read as a coherent document, not a concatenation of specs
- **Rewrite completely** — Don't append to existing architecture.md. Rewrite it with current state. ADRs are the version history.
- **Link to sources** — Reference driver-spec and ADR IDs so readers can drill into details
- **Readable by humans** — This is the document you'd hand to a new team member to understand the system
- **Readable by agents** — This is also what the surrogate reads to answer future questions

---

## Guardrails

- **Verify milestones** — Warn if initiative has incomplete milestones
- **Rewrite, don't append** — architecture.md captures current state only
- **Use path.join()** — Construct all file paths cross-platform
- **Preserve ADRs** — Never modify or delete ADRs during archive. They are the permanent trail.
- **Check for uncommitted work** — Before removing any worktree, verify it has no uncommitted changes. Pause if it does.
- **Prune after remove** — Run `git worktree prune` after removing worktrees to clean any stale git references.

