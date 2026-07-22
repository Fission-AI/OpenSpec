# Tasks: Add ATD Developer Docs Site

## 1. Scaffold and CI

- [ ] 1.1 Create `docs-site/` with `mkdocs.yml`: Material theme, mermaid via `pymdownx.superfences`, search, and the nav skeleton for the full section set (index, architecture, getting-started, flows/, standards, examples/, reference/); verify `mkdocs build --strict` succeeds from a clean checkout
- [ ] 1.2 Add `.github/workflows/docs.yml`: on PRs touching `docs-site/` run `mkdocs build --strict`; on push to main build and deploy to GitHub Pages; verify with `actionlint` and one PR dry run
- [ ] 1.3 Verify the org's GitHub plan supports access-controlled Pages on private repositories (GitHub Enterprise Cloud); record the outcome in the rollout notes — if unsupported, mark the Confluence-export fallback as the active destination and keep the prerequisite open
- [ ] 1.4 Add the same-PR docs checklist item to the PR template: "schema/skill/config-contract change → docs-site updated in this PR"

## 2. Core pages

- [ ] 2.1 Write `index.md`: why — one workflow from ticket to documented, standards-conformant code; link into the flow pages
- [ ] 2.2 Write `architecture.md`: schema engine, 3-tier schema resolution, artifact DAG, stores, config/rules injection — lifted from the `add-atd-sdlc-schema` design context, written for consumers
- [ ] 2.3 Write `getting-started.md`: bootstrap (from `docs/atd/bootstrap.md`), `atd-standards` store registration, per-repo `openspec/config.yaml` (from `docs/atd/config-template.yaml`), Atlassian MCP check; verify every command shown runs on a clean machine

## 3. Flow pages

- [ ] 3.1 Write `flows/triage.md`: eligibility decision table summary, bounded preflight, monotonic confirmation, `triage.md` sidecar; diagram lifted from `add-atd-sdlc-lite-triage/design.md`
- [ ] 3.2 Write `flows/full-sdlc.md`: six-artifact pipeline with grilling gate, AC traceability, solution-doc, and the mandatory final task group; diagram lifted from `add-atd-sdlc-schema/design.md`
- [ ] 3.3 Write `flows/lite.md`: three-artifact pipeline and the standard lite task shape
- [ ] 3.4 Write `flows/escalation.md`: pre-tasks escalation and late escalation via `tasks.lite.md`, one-way only
- [ ] 3.5 Verify every flow diagram renders (`mkdocs serve` visual check) and matches the shipped behavior in `schemas/atd-sdlc/` and `schemas/atd-sdlc-lite/`

## 4. Standards, examples, reference

- [ ] 4.1 Write `standards.md`: the `atd-standards` store, explicit stack mapping (python → python-service-standards, spring-boot → spring-boot-standards, oracle-ebs → oracle-ebs-plsql-standards, angular → angular-standards), apply-time fetch, conformance tasks — from `docs/atd/standards-store.md`
- [ ] 4.2 Create `examples/example-full.md` and `examples/example-lite.md` as stubs explicitly stating the pilot wave 1 dependency
- [ ] 4.3 (blocked on pilot wave 1) Populate the example pages from the pilot's real, redacted change artifacts; example-lite includes one escalation walk-through
- [ ] 4.4 Write `reference/config-keys.md`: every `openspec/config.yaml` key with meaning and example; verify against `docs/atd/config-template.yaml`
- [ ] 4.5 Write `reference/faq.md` seeded from questions raised in the schema dry-runs; extend with pilot onboarding questions as they arrive

## 5. Verification

- [ ] 5.1 Full site check: `mkdocs build --strict` clean, navigation matches the required section set in the spec, all mermaid diagrams render
- [ ] 5.2 First deploy reachable by an ATD developer account on GitHub Pages (or the Confluence fallback per 1.3); announce to pilot wave 1 participants
