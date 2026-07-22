# Tasks: Add ATD SDLC Schema

## 1. Schema definition

- [x] 1.1 Create `schemas/atd-sdlc/schema.yaml` with artifacts ticket → analysis → (specs, design) → solution-doc → tasks (apply tracks tasks.md, tasks requires solution-doc); verify with `openspec status --change <test-change>` listing all six artifacts in dependency order
- [x] 1.2 Write `ticket` artifact instruction: Atlassian MCP pull, AC-id assignment, completeness checklist, embedded grilling protocol, confirmed write-back into idempotent managed section (`rules: ticket:` opt-out), MCP-unavailable fallback (developer pastes content), branch-alignment suggestion (compare current branch to ticket key; advisory only, confirm before creating/switching, record branch and any declined suggestion in ticket.md)
- [x] 1.3 Write `analysis` instruction: code as source of truth (doc/code conflicts resolve to code, discrepancy noted), commit SHA recorded per document, file:line citation rule, affected-stacks list from explicit set {python, spring-boot, oracle-ebs, angular}, token-efficient reading strategy (AC-scoped entry-point + call-path tracing, no whole-file sweeps, prefer `rules: analysis:`-declared code-index tools)
- [x] 1.4 Write `specs` instruction: keep upstream delta-spec format, add AC traceability rule ("Covers: AC-n" mandatory, no AC → drop or return to ticket)
- [x] 1.5 Write `design` instruction: mermaid Solution Flow when cross-component or non-trivial (omit for trivial changes), omit-empty-sections rule, length cap of approximately 1,000 words
- [x] 1.6 Write `solution-doc` instruction: full section set with scale-to-change-size and omit-if-not-applicable rules, as-built section initialized pending, AC traceability table
- [x] 1.7 Write `tasks` instruction: files/modules + AC ids + verification command per task; mandatory final group = standards conformance per affected stack (explicit mapping names), solution.md reconciliation with deviations + evidence, publication per destination read from `rules: tasks:` (confluence/repo/both, ask-fallback), idempotent Jira closure comment
- [x] 1.8 Write apply instruction: before implementing, fetch the mapped standards spec per affected stack from the atd-standards store (python → python-service-standards, spring-boot → spring-boot-standards, oracle-ebs → oracle-ebs-plsql-standards, angular → angular-standards)

## 2. Templates

- [x] 2.1 Create `schemas/atd-sdlc/templates/` — ticket.md, analysis.md, spec.md, design.md, solution.md, tasks.md; verify each template referenced by schema.yaml exists (instruction-loader resolves without diagnostics)

## 3. Validation

- [x] 3.1 Add schema tests mirroring existing spec-driven schema tests (test/ patterns for schema resolution and instruction assembly), including the tasks-requires-solution-doc gate; verify `pnpm test` passes
- [x] 3.2 Dry-run: create a sample change with `--schema atd-sdlc` in a scratch project, walk instruction output for every artifact, confirm anti-slop rules, grilling protocol, and final task group appear verbatim

## 4. Rollout collateral

- [x] 4.1 Create per-repo `openspec/config.yaml` template (stack context blocks for python/spring-boot/oracle-ebs/angular, `references: [atd-standards]`, documentation destination examples under `rules: tasks:`) under `docs/atd/`
- [x] 4.2 Document `atd-standards` store conventions (explicit stack→spec mapping, register command, update workflow) in `docs/atd/standards-store.md`
- [x] 4.3 Add the separately owned `establish-atd-standards-store` prerequisite to `docs/atd/adoption-track.md`: name stack-lead owners; require the standalone repository, four strict-valid mapped specs, CODEOWNERS, registration/bootstrap instructions, `openspec store doctor atd-standards`, and successful fetches of all mapped specs; mark pilot wave 1 blocked until its acceptance checks pass
- [x] 4.4 Draft follow-up change proposals in `docs/atd/adoption-track.md`: atlassian-integration-hardening, telemetry-opt-in-default, internal-package-identity, standards-ci-enforcement (promote recurring pilot deviation classes into deterministic CI checks)
- [x] 4.5 Draft ATD bootstrap script (`docs/atd/bootstrap.md` + script skeleton): internal npm configuration, package installation, atd-standards store registration, Atlassian MCP verification, `openspec doctor` health check — finalized once the package-identity change lands

## 5. Verification

- [ ] 5.1 After `establish-atd-standards-store` passes every readiness check in task 4.3, run pilot wave 1 on one real Jira ticket in a Python or Angular repo; capture clarification count, artifact rework, documentation completion, external-write failures, cycle time
- [ ] 5.2 Verify conformance to this change's own specs: every scenario in specs/** demonstrably holds in the dry-run or pilot transcript
