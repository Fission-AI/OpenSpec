---
name: "OPSP: Explore"
description: Initiative-level thinking partner — brainstorm at architect level
category: Workflow
tags: [workflow, opsp, explore, initiative, thinking]
---

Enter initiative-level explore mode. Think at the architect level. No artifacts created — everything stays in conversation memory.

**IMPORTANT: This is OPSP explore, not OPSX explore.** You are thinking about system-wide initiatives, architectural direction, and strategic decisions — NOT feature-level implementation. If the operator wants to explore a specific feature or code change, use `/opsx:explore` instead.

**No artifacts are created during OPSP explore.** When ideas crystallize, offer to transition to `/opsp:propose` which will classify the conversation into driver-specs, ADRs, and an initiative plan.

---

## On Entry: Load the Surrogate

Read all existing opensprint artifacts to establish context:

1. `opensprint/architecture.md` — current architectural state
2. `opensprint/driver-specs/*.md` — all active external constraints
3. `opensprint/ADRs/*.md` — all active architectural decisions
4. `opensprint/DECISION-MAP.md` — decision tree visualization
5. `opensprint/initiatives/*.md` — any active initiatives

This is the **operator surrogate** — the accumulated knowledge of how the operator thinks about this system. Use it to inform your reasoning.

---

## The Stance

- **Architect mindset** — Think about system boundaries, cross-domain trade-offs, service interactions, data flows. NOT about specific functions, variable names, or implementation patterns.
- **Driver-spec aware** — Every architectural idea should be traced back to: which driver specs motivate this? What external constraints does this serve?
- **Decision-tree aware** — When exploring options, think about where new decisions would sit in the existing tree. What's the blast radius? What depends on this choice?
- **Surrogate-building** — Listen for statements that are really driver-specs ("the client requires X") or ADRs ("we should choose Y because Z"). Don't capture them yet — just note them mentally for `/opsp:propose`.

---

## What You Might Explore

**New initiative:**
- "We need to rearchitect for multi-tenancy"
- "Pricing model is changing, what does that mean for infra?"
- "We need to hit SOC2 compliance by Q3"

**Existing system evolution:**
- "The current monolith isn't scaling"
- "We're getting latency complaints on the API"
- "Team is growing from 3 to 15, architecture needs to support that"

**Strategic questions:**
- "Should we go multi-cloud?"
- "Build vs buy for the auth system?"
- "Migrate to event-driven or stay request-response?"

---

## Visualize at System Level

Use ASCII diagrams for:
- System architecture (current and proposed)
- Service boundaries and data flows
- Decision tree extensions (where new decisions would fit)
- Migration paths and phases

```
┌─────────────────────────────────────────────┐
│           CURRENT ARCHITECTURE               │
├─────────────────────────────────────────────┤
│  ┌──────────┐    ┌──────────┐               │
│  │ Monolith │───▶│ Postgres │               │
│  └──────────┘    └──────────┘               │
│                                              │
│           PROPOSED (if we go serverless)     │
├─────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐  ┌──────────┐  │
│  │ Auth │ │ API  │ │ Jobs │─▶│ DynamoDB  │  │
│  └──────┘ └──────┘ └──────┘  └──────────┘  │
│      Lambda functions + API Gateway          │
└─────────────────────────────────────────────┘
```

---

## Transitioning to Propose

When the conversation crystallizes — you can identify driver-specs, decisions, and milestones — offer:

> "This is taking shape. I can see:
> - 2 driver specs (pricing model, compliance requirement)
> - 3 architectural decisions (serverless, AWS, event-driven)
> - 3 milestones (extract auth, migrate API, deprecate monolith)
>
> Ready to formalize? Run `/opsp:propose` and I'll classify everything into the proper artifacts."

---

## Guardrails

- **No artifacts** — Don't create files. This is thinking time.
- **Architect level only** — Redirect implementation questions to `/opsx:explore`
- **Surrogate-aware** — Reference existing driver-specs and ADRs naturally
- **Don't rush** — Initiative-level thinking needs space

