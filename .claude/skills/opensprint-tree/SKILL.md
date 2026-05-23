---
name: opensprint-tree
description: Visualize and navigate the decision tree — shows driver specs as roots, decisions as nodes, with dependency edges and blast radius annotations.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: opensprint
  version: "1.0"
  generatedBy: "0.0.6"
---

Visualize or regenerate the decision tree in `opensprint/DECISION-MAP.md`.

**Input**: The argument after `/opsp:tree` determines the action:
- No argument or `show` — Display the current decision tree
- `regenerate` — Rebuild DECISION-MAP.md from all decision records
- `impact DEC-NNN` — Show what would be affected if a specific decision changed

---

## Show the Decision Tree

1. Read `opensprint/DECISION-MAP.md`
2. Display the tree and impact summary to the operator
3. If the file doesn't exist or is empty, inform the operator and offer to regenerate

## Regenerate DECISION-MAP.md

Read all decision records and driver specs, then rebuild the map:

1. **Read all files** in `opensprint/driver-specs/` and `opensprint/ADRs/`
2. **Parse YAML frontmatter** from each file to extract `id`, `status`, `depends-on`, `depth`
3. **Filter** to only `active`/`accepted` status (exclude superseded, deprecated)
4. **Build the dependency tree**:
   - Driver specs are root nodes (no parents)
   - Each decision's `depends-on` field defines its parent edges
5. **Calculate blast radius** for each node:
   - Count all transitive downstream decisions (direct + indirect dependents)
   - Only count `active`/`accepted` decisions
   - Leaf nodes have blast radius 0
6. **Render ASCII tree**:

```
DS-PRICING (product) ──→ DS-SCALE (reliability)
     │                         │
     ▼                         ▼
DEC-001: serverless       DEC-003: event-driven
[root] [blast: 3]         [branch] [blast: 1]
     │                         │
     ├──→ DEC-002: AWS         └──→ DEC-005: SQS
     │    [branch] [blast: 1]       [leaf] [blast: 0]
     │         │
     │         ▼
     │    DEC-004: Lambda/Node
     │    [leaf] [blast: 0]
     │
     └──→ DEC-007: API Gateway
          [leaf] [blast: 0]
```

7. **Render impact summary table**:

| Decision | Depth | Depends On | Downstream | Blast |
|----------|-------|------------|------------|-------|
| DEC-001  | 0     | DS-PRICING | 002,004,007| 3     |
| DEC-003  | 0     | DS-SCALE   | 005        | 1     |
| DEC-002  | 1     | DEC-001    | 004        | 1     |
| DEC-005  | 1     | DEC-003    | —          | 0     |

Sort by depth ascending, then ID ascending.

8. **Write** the regenerated content to `opensprint/DECISION-MAP.md`

## Impact Analysis

When asked about a specific decision (`/opsp:tree impact DEC-001`):

1. Read DECISION-MAP.md or compute from records
2. Show the subtree rooted at the specified decision
3. List all downstream decisions that would be invalidated
4. Show the blast radius
5. Highlight which driver specs feed into this decision

---

## Guardrails

- **Only include active/accepted decisions** — Superseded and deprecated decisions are excluded from the tree
- **Agent-maintained** — This file is fully auto-generated; never ask the operator to edit it manually
- **Deterministic** — Same inputs should always produce the same output
- **Use path.join()** — Construct all file paths cross-platform

