---
name: "OPSP: Propose"
description: "Create an initiative from exploration — classify into driver-specs, ADRs, and milestone plan"
category: Workflow
tags: [workflow, opsp, propose, initiative]
---

Create an initiative by analyzing the exploration conversation and classifying operator inputs into the proper opensprint artifacts.

**Input**: Optionally specify an initiative name after `/opsp:propose` (kebab-case). If omitted, derive one from the conversation context.

---

## Steps

### 1. Analyze the Conversation

Review everything discussed in the explore session (or the operator's description). Identify:

- **External constraints** (things the operator stated as facts about the world) → these become **driver-specs**
  - Product requirements, legal mandates, compliance rules, performance targets, business constraints
  - Key signal: "the client requires...", "we must...", "legally we need...", "the SLA says..."

- **Architectural decisions** (choices the operator made between alternatives) → these become **ADRs**
  - Technology choices, architecture patterns, infrastructure decisions, build-vs-buy
  - Key signal: "we should use X over Y because...", "let's go with...", "I prefer X because..."

- **Scope and milestones** (the work to be done) → these become the **initiative plan**
  - Each milestone should be a coherent unit of work that maps to one opsx change cycle

### 2. Present Classification for Confirmation

Before writing any files, present the classification to the operator:

```
## Proposed Initiative: <name>

### Driver Specs (external truth)
- DS-PRICING: Utility-based pricing, charge per invocation
- DS-COMPLIANCE: SOC2 Type II required by Q3

### ADRs (architectural decisions)
- DEC-001: Serverless architecture (depends on DS-PRICING)
  Rationale: utility pricing requires infra cost to scale with usage
- DEC-002: AWS as cloud provider (depends on DEC-001)
  Rationale: team expertise, Lambda maturity

### Milestones
1. Extract auth service from monolith
2. Migrate payment endpoints to Lambda
3. Deprecate monolith routes

Does this look right? I'll create the artifacts on confirmation.
```

Wait for operator confirmation. Adjust if they correct anything.

### 3. Create Artifacts

After confirmation, create files in sequence:

**a. Driver Specs** — for each identified external constraint:
- Create `opensprint/driver-specs/DS-<ID>.md` with YAML frontmatter
- Use the operator's words faithfully

**b. ADRs** — for each identified architectural decision:
- Create `opensprint/ADRs/DEC-<NNN>.md` with YAML frontmatter
- Include: Question, Operator Decision, Consideration Factors, Rationale, Invalidation Trigger
- Link to parent driver-specs via `depends-on`
- Calculate depth (0 if depends only on driver-specs)

**c. Regenerate DECISION-MAP.md** — after creating ADRs

**d. Initiative Descriptor** — create `opensprint/initiatives/<name>.md`:

```markdown
---
id: <initiative-name>
status: active
created: <YYYY-MM-DD>
---

## Description

<what this initiative aims to achieve>

## Driver Specs

- DS-PRICING
- DS-COMPLIANCE

## ADRs

- DEC-001
- DEC-002

## Milestones

- [ ] extract-auth-service: Extract authentication into standalone service
- [ ] migrate-payment-endpoints: Move payment API to serverless functions
- [ ] deprecate-monolith-routes: Remove legacy endpoints and redirect
```

### 4. Summary

Display what was created:
- Count of driver-specs
- Count of ADRs
- Initiative name and milestone count
- Prompt: "Run `/opsp:apply <name>` to start executing milestones."

---

## Guardrails

- **Classify, don't invent** — Only create driver-specs and ADRs from what the operator actually said
- **Operator confirms** — Always present classification before writing files
- **High-level milestones** — Each milestone is a brief description, not a detailed plan. Detail comes from opsx.
- **Use path.join()** — Construct all file paths cross-platform
- **Architect level** — Milestones describe WHAT to achieve, not HOW to implement

