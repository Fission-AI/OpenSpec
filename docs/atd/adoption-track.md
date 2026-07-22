# ATD adoption track

Changes in the ATD fork's adoption sequence, their status, and pilot metrics.

## Shipped / in flight

1. **add-atd-sdlc-schema** — the `atd-sdlc` built-in schema (this repo).
2. **add-atd-sdlc-lite-triage** — `atd-sdlc-lite` schema plus `atd-change-triage`
   entry-point skill (companion change).

## Prerequisite: establish-atd-standards-store (separately owned)

Owned outside this repository by the stack leads. Pilot wave 1 is **blocked**
until every acceptance check passes.

A **placeholder store** exists at `~/git/ATD-AI/atd-standards` (local; no
approved ATD remote yet): `angular-standards` is seeded from the internal
`atd-angular` skill; the other three specs are strict-valid placeholders
awaiting stack-lead content.

- [x] Standalone `atd-standards` repository exists (local placeholder; remote pending).
- [x] All four mapped specs present and strict-valid:
      `python-service-standards`, `spring-boot-standards`,
      `oracle-ebs-plsql-standards`, `angular-standards`
      (angular seeded with real content; the other three are placeholders).
- [ ] Stack-lead owners named per spec; CODEOWNERS enforces review.
      Owners: python — TBD; spring-boot — TBD; oracle-ebs — TBD; angular — TBD.
- [ ] Registration/bootstrap instructions verified on a clean machine.
- [x] A pilot machine passes `openspec store doctor atd-standards` and
      successfully fetches every mapped spec
      (`openspec show <spec-id> --type spec --store atd-standards`).

## Follow-up changes (to be proposed)

1. **atlassian-integration-hardening** — idempotency helpers for managed
   sections and closure comments, retry/error guidance, data governance for
   what may be written to Jira/Confluence.
2. **telemetry-opt-in-default** — flip fork telemetry to opt-in for internal
   distribution.
3. **internal-package-identity** — `@atd/openspec` rename and internal release
   pipeline: changesets, pack checks, registry auth, workflow guards.
4. **standards-ci-enforcement** — promote recurring pilot deviation classes
   into deterministic CI checks (lint rules, custom analyzers). Sourced from
   pilot metrics below.

## Pilot metrics

Captured per pilot wave (wave 1: one Python or Angular repo → Spring Boot →
Oracle EBS → org-wide):

| Metric | Source |
|--------|--------|
| Clarification count per ticket | grilling Q/A trace in ticket.md |
| Artifact rework | change history |
| Standards deviations (by class) | conformance tasks in tasks.md |
| Documentation completion | published solution.md per closed ticket |
| External-write failures | Jira/Confluence task outcomes |
| Cycle time | ticket → archive |
| Lite/full selection rate | triage.md records (lite-triage change) |
| Lite→full escalation rate | triage.md escalation entries |

Recurring standards-deviation classes and missing-documentation findings feed
**standards-ci-enforcement**.
