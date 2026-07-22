# Add ATD SDLC Schema

## Why

ATD developers start work from Jira tickets (requirements sometimes in linked Confluence pages, often incomplete) and ship across four stacks: Python, Spring Boot, Oracle EBS ERP, and Angular. The default `spec-driven` schema assumes a developer-authored proposal and has no ticket intake, no coding-standards enforcement, and no mandatory functional/technical documentation. This fork exists to give every ATD team one workflow from ticket to documented, standards-conformant code.

This is the first change in the ATD adoption track. Companion change (proposed): `add-atd-sdlc-lite-triage` — lightweight schema for low-risk corrections plus risk-based entry triage. Follow-up changes (to be proposed): Atlassian integration hardening (idempotency and data governance), telemetry opt-in default, internal package identity/release pipeline, developer bootstrap tooling, and deterministic CI enforcement of recurring standards deviations. Pilot rollout additionally depends on the separately owned `establish-atd-standards-store` prerequisite described below.

## What Changes

- Add a new built-in schema `schemas/atd-sdlc/` with the artifact pipeline: `ticket → analysis → (specs, design) → solution-doc → tasks → apply`.
- `ticket` artifact pulls the Jira issue and linked Confluence pages via the Atlassian MCP, then gates on a completeness checklist; when data is missing it runs an embedded grilling protocol (one question at a time, each with a recommended answer, codebase-answerable questions explored instead of asked). Clarified requirements are written back to the Jira ticket only after developer confirmation, into an idempotent managed section so re-runs never clobber human-authored content. Intake also compares the current git branch with the ticket key and, when they differ, suggests a branch named after the ticket — advisory only: never blocks, never creates or switches a branch without developer confirmation.
- `analysis` artifact treats code as the source of truth: current behavior is derived from the code (documentation is a hint, verified against code; conflicts resolve in code's favor and are noted), cited with commit SHA plus file:line ranges, with affected stacks identified. Reading is token-efficient by instruction — entry-point and call-path tracing scoped to the acceptance criteria, no whole-file sweeps; per-repo `rules: analysis:` may name code-index tooling to prefer over raw reads.
- `specs` artifacts require every requirement to trace to a ticket acceptance-criterion ID.
- `design` artifact records decisions, alternatives, and risks; includes a mermaid Solution Flow diagram when the change spans components or the flow is non-trivial — never merely to satisfy the template.
- `solution-doc` artifact (`solution.md`): the enterprise-facing functional and technical document, created before implementation and reconciled after. Sections scale with change size and are omitted when not applicable — no boilerplate.
- `tasks` artifact requires each task to name target files/modules, the acceptance criteria it serves, and a verification command. The mandatory final group: standards conformance per affected stack, reconciliation of `solution.md` against implemented code (as-built deviations recorded), publication to the configured destination (Confluence, `docs/` in repo, or both), and an idempotent Jira closure comment. Apply is complete only when these are checked.
- Add per-repo `openspec/config.yaml` template documenting stack context, `references: [atd-standards]`, and the documentation destination declared under `rules: tasks:` (rules are injected per artifact ID; there is no docs artifact, so destination details ride the tasks rules and land in the generated publication tasks).
- Document `atd-standards` store conventions with the explicit stack mapping: python → python-service-standards, spring-boot → spring-boot-standards, oracle-ebs → oracle-ebs-plsql-standards, angular → angular-standards.
- Declare `establish-atd-standards-store` as a hard pilot prerequisite, owned by the stack standards leads: the standalone repository, all four strictly valid standards specs, CODEOWNERS, developer registration/bootstrap instructions, and a successful `openspec store doctor atd-standards` plus mapped-spec fetch check must exist before a real pilot starts.

## Capabilities

### New Capabilities

- `atd-sdlc-workflow`: the ticket-to-solution-doc artifact pipeline, including the grilling gate, confirmed idempotent Jira write-back, and anti-slop artifact rules.
- `standards-integration`: referencing the `atd-standards` store and the mandatory conformance verify task at apply time.
- `solution-documentation`: the scaled enterprise solution document, its post-implementation reconciliation, configurable publication destination, and Jira closure.

### Modified Capabilities

None. (Telemetry default and package identity move to follow-up changes.)

## Impact

- New: `schemas/atd-sdlc/schema.yaml` + `schemas/atd-sdlc/templates/*` (ticket.md, analysis.md, spec.md, design.md, solution.md, tasks.md).
- New: rollout collateral under `docs/atd/` (config template, standards-store conventions, adoption-track prerequisite and readiness checklist).
- No changes to core artifact-graph, resolver, CLI, or telemetry code in this change — the schema rides the existing 3-tier schema resolution.
- Upstream sync cost stays minimal: this change is purely additive files.
