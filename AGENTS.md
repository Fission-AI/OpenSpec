# ATD-OpenSpec

## What this project is

ATD's fork of [Fission-AI/OpenSpec](https://github.com/Fission-AI/OpenSpec) (forked at v1.6.0). OpenSpec is a spec-driven development CLI: work is organized into **changes**, each change walks a **schema** (a DAG of artifacts — proposal, specs, design, tasks, …), and AI agents execute the workflow through generated **skills** and **slash commands**.

The fork adds an ATD-specific SDLC on top of the unmodified engine. **Fork policy: additive only** — new schemas, new workflow templates, new docs, additive registry entries. Core engine code (artifact-graph, resolver, CLI behavior) is never modified, so upstream syncs stay cheap.

## The goal

One workflow every ATD developer follows from **Jira ticket to documented, standards-conformant code**, across all four stacks (Python, Spring Boot, Oracle EBS PL/SQL, Angular):

1. **Triage** — classify a ticket as low-risk (lite) or full via a risk-based eligibility table; uncertainty always routes full.
2. **Ticket intake** — pull Jira + linked Confluence via the Atlassian MCP, gate on a completeness checklist, grill the developer one question at a time when data is missing, write clarified requirements back to Jira (confirmed, idempotent).
3. **Analysis** — code is the source of truth; every claim cites commit SHA + file:line; affected stacks named.
4. **Specs / Design / Solution doc** — every requirement traces to an acceptance-criterion ID; the enterprise solution document exists *before* implementation.
5. **Apply** — fetch the mapped coding standards per stack from the external `atd-standards` store, implement, then a mandatory final task group: standards conformance, solution-doc reconciliation, publication (Confluence/repo/both), idempotent Jira closure.
6. **Escalation** — lite changes escalate one-way to full when wider impact surfaces (never downgrade).

## Structure

```
schemas/                  Workflow schemas (resolved built-in → user-global → project-local)
├── spec-driven/          Upstream default (untouched)
├── atd-sdlc/             Full ATD pipeline: ticket → analysis → (specs, design) → solution-doc → tasks
└── atd-sdlc-lite/        Lite pipeline for low-risk corrections: ticket → analysis → tasks
src/
├── core/artifact-graph/  Schema engine: resolver, graph, state, instruction assembly (DO NOT fork-modify)
├── core/templates/workflows/  One module per workflow skill/command (atd-triage.ts is the ATD pattern)
├── core/shared/          skill-generation.ts (registries), tool-detection.ts (SKILL_NAMES/COMMAND_IDS)
├── core/profiles.ts      CORE_WORKFLOWS / ALL_WORKFLOWS
└── core/profile-sync-drift.ts  WORKFLOW_TO_SKILL_DIR
skills/                   COMMITTED generated artifacts (skills.sh distribution) — regenerate,
                          never hand-edit (.claude/ is local per-machine config, gitignored)
docs/atd/                 ATD rollout collateral: config template, standards-store conventions,
                          lite-eligibility table, adoption track, bootstrap
openspec/changes/         In-flight OpenSpec changes (the fork dogfoods itself):
                          add-atd-sdlc-schema (implemented), add-atd-sdlc-lite-triage (implemented),
                          add-atd-docs-site (proposed), add-atd-workflow-facades (proposed)
test/                     Vitest suite (~2,090 tests)
```

External: the `atd-standards` OpenSpec store (separate repo, registered per machine) holds the four standards specs. Stack mapping: python → python-service-standards, spring-boot → spring-boot-standards, oracle-ebs → oracle-ebs-plsql-standards, angular → angular-standards.

## Commands

```bash
node build.js                      # build dist/
./node_modules/.bin/vitest run     # full test suite (pnpm test)
node scripts/generate-skillssh.mjs # regenerate committed skills/ from templates
node bin/openspec.js <cmd>         # run the repo's own CLI
```

## Rules for agents working here

- **Work through OpenSpec.** Changes to fork behavior get a change under `openspec/changes/` first (proposal → specs → design → tasks → apply). Don't patch schemas or workflows ad hoc.
- **Adding a workflow touches every enumerating surface** — template module + `skill-templates.ts` export + both registries in `skill-generation.ts` + `ALL_WORKFLOWS`/`CORE_WORKFLOWS` + `WORKFLOW_TO_SKILL_DIR` + `SKILL_NAMES`/`COMMAND_IDS` in `tool-detection.ts` + regenerated `skills/` and `.claude/` artifacts + test count bumps. Missing one is the known bug class here.
- **Parity tests are contracts.** Shared instruction blocks between `atd-sdlc` and `atd-sdlc-lite` must match byte-for-byte; every deployed template must contain the `STORE_SELECTION_GUIDANCE` block; committed `skills/` must match generator output.
- **Schema instructions are the product.** Anti-slop rules are deliberate: omit inapplicable sections, no boilerplate, diagrams only when the flow is non-trivial, uncertainty routes to the heavier path.
- **Never ship references to unpackaged files** — npm `files` includes `dist`, `bin`, `schemas` only; `docs/` does not ship, so schema/skill instructions must embed what they need.
