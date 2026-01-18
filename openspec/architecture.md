# System Architecture

## Overview

<!-- High-level system diagram showing major components and their relationships -->
<!-- Update this diagram as the system evolves -->

```
┌─────────────────────────────────────────────────────────────┐
│                     [Your System Name]                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐             │
│   │ [Client] │───▶│  [API]   │───▶│   [DB]   │             │
│   └──────────┘    └──────────┘    └──────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components

<!-- Document each major component/service/module -->

### [Component Name]
- **Responsibility**: [What this component does]
- **Technology**: [Stack/framework used]
- **Key files**: [Main entry points, e.g., `src/core/component.ts`]

<!-- Add more components as your system grows -->

## Data Flows

<!-- Document how data moves through your system -->

### [Flow Name]
```
[Source] ──▶ [Processing] ──▶ [Destination]
```
- **Trigger**: [What initiates this flow]
- **Data**: [What data moves through]

## Integration Points

<!-- Document external systems and APIs -->

| External System | Purpose | Protocol | Notes |
|-----------------|---------|----------|-------|
| [Service]       | [Why]   | [How]    | [Details] |

## Architectural Decisions

<!-- This section is automatically updated when archiving changes with architectural impact -->
<!-- Each row captures a key decision from design.md files -->

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|

## Constraints

<!-- Technical, business, or regulatory constraints affecting architecture -->

- [Constraint 1]: [Description and impact]
- [Constraint 2]: [Description and impact]

---

## Diagram Reference

<!-- ASCII diagram building blocks for consistency -->

```
Components:          Relationships:        Boundaries:
┌─────────┐          ───▶ data flow        ┌──────────┐
│ Service │          ◀─── reverse flow     │ Internal │
└─────────┘          ←──▶ bidirectional    ├──────────┤
                                           │ External │
Grouping:            States:               └──────────┘
┌─────────────┐      ○ start state
│ ┌───┐ ┌───┐ │      ● end state
│ │ A │ │ B │ │      □ intermediate
│ └───┘ └───┘ │
└─────────────┘
```
