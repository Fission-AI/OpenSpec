---
name: opensprint-knockdown
description: Knockdown a brownfield codebase — reverse-engineer architecture.md, ADRs, and driver-specs from existing code using progressive compaction.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: opensprint
  version: "1.0"
  generatedBy: "0.0.6"
---

Reverse-engineer surrogate artifacts (architecture.md, ADRs, driver-specs) from an existing brownfield codebase.

This is **reverse system design** — the inverse of the standard process:
- Forward: Requirements → Architecture → Tech Stack → Implementation
- Knockdown: Implementation → Tech Stack → Architecture → Requirements (driver-specs)

---

## Before You Begin

**⚠️ MODEL REQUIREMENTS**

Knockdown is the most cognitively demanding OpenSprint skill. Before proceeding, confirm:

1. **Advanced model** — Use the most capable model available (e.g., Claude Opus with extended thinking)
2. **Extended thinking enabled** — Deep reasoning is required for architectural analysis
3. **Largest context window** — The compaction pipeline manages context, but larger windows produce better results

Ask the operator to confirm they are using an appropriate model before proceeding.

---

## Resuming a Previous Session

If `opensprint/knockdown/toc.yaml` already exists, this is a **resume**:
1. Read the existing toc.yaml, summaries/, and findings.md
2. Display current progress (files interpreted, directories compacted, phase)
3. Resume from the next `pending` entry — do NOT re-process `interpreted`, `compacted`, or `dropped` entries

---

## Phase 1: TOC Build (File Names Only)

Walk the project file system. **Do NOT read file content** — only directory and file names.

Create `opensprint/knockdown/toc.yaml` with this structure:

```yaml
project: <project-name>
started: <date>
status: in-progress
current-phase: toc-build

observations:
  - "<structural observation, e.g., monorepo with 3 services>"
  - "<e.g., terraform/ directory present — IaC managed>"

toc:
  <dir-or-file>:
    category: architectural | scan-structure | skip
    status: pending | interpreted | compacted | dropped
    summary: "<one-line summary, filled in Phase 2>"
    classification: null | driver-spec | adr | affects-adr | dropped
    children:
      <nested entries...>
```

### Categorization rules:
- **architectural** (always scan): source code directories, config files, infra files, schema files, dependency manifests, CI/CD configs, existing docs/READMEs
- **scan-structure** (scan directory shape, sample a few files): test directories, migration directories, scripts/
- **skip** (never read): node_modules/, dist/, build/, .git/, vendor/, assets/ (images, fonts), lock files (package-lock.json, pnpm-lock.yaml, yarn.lock), generated files, .next/, __pycache__/

### Small Codebase Escape Hatch

After building the TOC, count the total `architectural` files. If the count is small enough to comfortably fit in context (roughly < 100 architectural files), offer to skip Phases 2-3 and load everything directly for Phase 4.

Ask the operator: "This is a small codebase (~N architectural files). Skip compaction and analyze directly, or use the full pipeline?"

## Phase 2: File Scan

For each `pending` file in toc.yaml (in depth-first order):

### Step 1: Infer or Read

- **Descriptive filename** (e.g., `jwt-strategy.ts`, `docker-compose.yml`, `prisma.schema`, `Dockerfile`, `nginx.conf`): Infer a one-line summary from the name and path. Do NOT read the file.
- **Ambiguous filename** (e.g., `utils.ts`, `index.ts`, `main.py`, `app.ts`, `config.ts`, `server.ts`): Read the file content, write a one-line summary.
- **Config/manifest files** (`package.json`, `tsconfig.json`, `Cargo.toml`, `go.mod`, `requirements.txt`): Always read — these contain tech stack decisions.

### Step 2: Classify (Three-Question Classifier)

For each summary, ask in order:

1. **"Is this a driver-spec?"** — Does this represent an external constraint, compliance requirement, SLA, vendor lock-in, or non-functional requirement?
   → **Yes**: Extract to `opensprint/knockdown/findings.md` as a candidate driver-spec. Mark as `interpreted`, classification: `driver-spec`.

2. **"Is this an ADR?"** — Does this represent a significant architectural decision where alternatives existed and a specific choice was made?
   → **Yes**: Extract to findings.md as a candidate ADR. Mark as `interpreted`, classification: `adr`.

3. **"Will this affect an ADR?"** — Is this an implementation detail that traces to a higher-level architectural decision?
   → **Yes**: Keep the summary for compaction. Mark as `interpreted`, classification: `affects-adr`.

4. **None of the above** — Pure implementation detail, no architectural signal.
   → Mark as `interpreted`, classification: `dropped`.

### Pause Point

The operator can pause after any file. Update toc.yaml with current progress before pausing.

## Phase 3: Bottom-Up Compaction

Starting from the deepest directories and working up:

### For each directory where ALL children are interpreted/dropped:

1. **Collect survivors** — gather all child summaries that were NOT dropped
2. **Group by relatedness** — cluster summaries that share architectural context (same domain, same concern, same tech choice)
3. **Compact each group** — merge related summaries into a single summary. Write to `opensprint/knockdown/summaries/<dir-path>.md`
4. **Don't force unrelated merges** — if summaries are architecturally unrelated, keep them separate. Each floats up to the next level independently.
5. **Classify the compacted summary** using the three-question classifier
6. **Extract** any that resolve to driver-spec or ADR → add to findings.md
7. **Mark** the directory as `compacted` in toc.yaml

### Compaction terminates when:
- All directories up to the project root are compacted, OR
- No further meaningful compaction is possible (remaining summaries are unrelated)

### Pause Point

The operator can pause between directory levels. Update toc.yaml and summaries/ before pausing.

## Phase 4: Architecture Extraction (Reverse System Design)

Read all accumulated data:
- `opensprint/knockdown/findings.md` (candidate ADRs and driver-specs)
- All surviving compacted summaries in `opensprint/knockdown/summaries/`
- Any remaining uncompacted survivors from toc.yaml

### Step 1: Fill Architecture Template

Fill the architecture.md template in reverse system design order:

```markdown
# Architecture — <Project Name>

## System Identity
<!-- What is this system? One paragraph derived from top-level compaction. -->

## System Boundary
<!-- What's inside vs outside this system? -->

### External Interfaces
<!-- APIs consumed, APIs exposed, third-party services -->

### Data Boundaries
<!-- What data enters, persists, leaves -->

## Component Map
<!-- Major components/services and their responsibilities -->

### <Component Name>
- **Role**: what it does
- **Tech**: runtime, framework
- **Connects to**: other components, external services
- **Data owns**: what data this component is responsible for

## Cross-Cutting Concerns

### Authentication & Authorization
### Observability
### Error Handling Strategy
### Data Consistency Model

## Infrastructure Topology

### Local Development
### Production
### CI/CD Pipeline

## Constraints & Non-Negotiables
<!-- Links to driver-specs -->
```

Use the **architecture probe checklist** to ensure completeness:

| Probe Area | What to Look For |
|---|---|
| Compute Model | Server vs serverless vs hybrid, container orchestration, edge/CDN |
| Scaling Strategy | Horizontal vs vertical, stateless services, auto-scaling, read/write split |
| Communication | Sync (REST, gRPC) vs async (queues, events), API gateway, WebSockets |
| Data Architecture | Single DB vs polyglot, caching, partitioning, event sourcing |
| Cloud/Provider | Single vs multi-cloud, managed vs self-hosted, lock-in points |
| Resilience | Circuit breakers, graceful degradation, DR model, backup strategy |
| Security Model | Auth architecture, network security, secrets management, compliance |

Present the draft architecture.md to the operator for review.

### Step 2: ADR Confirmation (Interactive)

Present candidate ADRs batched by area:

```
## Candidate ADRs — Authentication (3 candidates)

1. "Chose JWT (RS256) over session-based auth"
   Inferred from: src/auth/jwt-strategy.ts, src/auth/refresh-tokens.ts
   Confidence: HIGH (clear implementation pattern)
   → Confirm / Modify / Reject?

2. "Chose RBAC over ABAC for authorization"
   Inferred from: src/auth/rbac.ts (3 roles: admin, user, viewer)
   Confidence: MEDIUM (limited evidence for why not ABAC)
   → Confirm / Modify / Reject?

3. ...
```

For each confirmed ADR:
- Ask: "Does this trace to an external constraint?" → If yes, extract a driver-spec
- Write the ADR to `opensprint/ADRs/`

### Step 3: Driver-Spec Confirmation (Interactive)

Present all candidate driver-specs for final review:

```
## Candidate Driver Specs (4 candidates)

1. DS-COMPLIANCE: "PCI-DSS compliance required for payment processing"
   Inferred from: payment module encryption patterns, audit logging
   → Confirm / Modify / Reject?

2. DS-LATENCY: "Sub-200ms API response time"
   Inferred from: caching layer, read replicas, CDN configuration
   → Confirm / Modify / Reject?

3. ...
```

Write confirmed driver-specs to `opensprint/driver-specs/`.

### Step 4: Generate DECISION-MAP.md

From confirmed ADRs, generate `opensprint/DECISION-MAP.md` showing how decisions relate to each other.

### Step 5: Final Summary

Display:
```
## Knockdown Complete

architecture.md: ✓ Written
ADRs: 8 confirmed, written to opensprint/ADRs/
Driver-specs: 4 confirmed, written to opensprint/driver-specs/
DECISION-MAP.md: ✓ Generated

Surrogate is ready. You can now:
- /opsp:explore <initiative> — brainstorm with full context
- /opsp:propose <initiative> — plan work on this codebase
```

---

## Guardrails

- **Read-only** — Knockdown NEVER modifies the codebase. It only reads code and writes to opensprint/knockdown/ and opensprint/ surrogate directories.
- **Operator confirmation required** — All ADRs and driver-specs must be confirmed by the operator. The agent drafts, the operator approves.
- **Batch questions by area** — Don't ask one question at a time. Group findings by domain (auth, data, infra, etc.) for efficient review.
- **Language/framework/platform agnostic** — Knockdown works on any codebase. Don't assume specific languages, frameworks, or tools.
- **Pragmatic compaction** — Never force unrelated summaries into a single compacted entry. Keep them separate.
- **Filename-first** — Always try to infer from the filename before reading content. Read only when ambiguous.
- **Persist everything** — Update toc.yaml, summaries/, and findings.md continuously. The operator may pause at any time.
- **Three-question classifier is law** — Every summary gets classified through the same funnel: driver-spec? → ADR? → affects-ADR? → drop.

