# atd-developer-docs Specification (delta)

## ADDED Requirements

### Requirement: Site source builds strictly from this repository
The system SHALL provide a MkDocs Material documentation site whose source lives in this repository under `docs-site/`, buildable with `mkdocs build --strict` such that a missing navigation target or broken internal link fails the build.

#### Scenario: Strict build passes
- **WHEN** `mkdocs build --strict` runs against `docs-site/`
- **THEN** the build completes with zero warnings

#### Scenario: Broken link fails the build
- **WHEN** a page links to a nonexistent internal page or the nav references a missing file
- **THEN** `mkdocs build --strict` fails

### Requirement: Required section set
The site navigation SHALL contain: an index page stating the workflow purpose (one workflow: ticket → documented, standards-conformant code); an architecture page covering the schema engine, 3-tier schema resolution, artifact DAG, stores, and config/rules injection; a getting-started page covering bootstrap, `atd-standards` store registration, per-repo `openspec/config.yaml`, and the Atlassian MCP check; flow pages for triage, full SDLC, lite, and escalation; a standards page covering the store, the explicit stack mapping, apply-time fetch, and conformance tasks; example pages for a full change and a lite change including an escalation example; and reference pages for config keys and FAQ.

#### Scenario: Navigation completeness
- **WHEN** the site is built
- **THEN** the navigation resolves index, architecture, getting-started, flows/{triage, full-sdlc, lite, escalation}, standards, examples/{example-full, example-lite}, and reference/{config-keys, faq}

### Requirement: Flow pages carry diagrams matching the shipped schemas
Each flow page SHALL carry a mermaid diagram consistent with the corresponding shipped schema or skill behavior, sourced from the approved change design documents (`add-atd-sdlc-schema`, `add-atd-sdlc-lite-triage`).

#### Scenario: Full SDLC flow page
- **WHEN** a developer opens the full-sdlc flow page
- **THEN** it renders a mermaid diagram showing `ticket → analysis → (specs, design) → solution-doc → tasks → apply`, including the grilling gate and the mandatory final task group, consistent with `schemas/atd-sdlc/`

#### Scenario: Triage and escalation flow pages
- **WHEN** a developer opens the triage or escalation flow page
- **THEN** it renders a mermaid diagram covering eligibility evaluation with monotonic confirmation, and both pre-tasks escalation and late escalation via `tasks.lite.md`, consistent with `schemas/atd-sdlc-lite/` and the `atd-change-triage` skill

### Requirement: Examples sourced from real pilot artifacts
The example pages SHALL be populated from pilot wave 1's real change artifacts, redacted as needed, with example-lite including one escalation walk-through. Until those artifacts exist, each example page SHALL state that it is pending pilot wave 1; synthetic content SHALL NOT be presented as a real example.

#### Scenario: Before pilot wave 1
- **WHEN** the site is published before pilot wave 1 completes
- **THEN** each example page states the pilot dependency and contains no invented ticket content presented as real

#### Scenario: After pilot wave 1
- **WHEN** pilot wave 1 completes
- **THEN** example-full shows the pilot ticket's redacted artifacts end to end and example-lite includes a redacted escalation example

### Requirement: Documentation updated in the same PR
The contributor documentation SHALL require docs-site updates in the same PR as any schema, skill, or config-contract change, backed by a PR-template checklist item, and the CI workflow SHALL run `mkdocs build --strict` on pull requests touching `docs-site/`.

#### Scenario: Schema-changing PR
- **WHEN** a PR modifies a schema or skill in a way that alters a documented flow
- **THEN** the PR-template checklist requires the corresponding docs-site pages and diagrams to be updated in that same PR

#### Scenario: Docs-touching PR is validated
- **WHEN** a PR modifies files under `docs-site/`
- **THEN** CI runs `mkdocs build --strict` and the PR fails on build warnings

### Requirement: Automated deployment with recorded publishing prerequisite
A GitHub Actions workflow SHALL build and deploy the site to GitHub Pages on push to main. The rollout documentation SHALL record the prerequisite that the org's GitHub plan supports access-controlled Pages on private repositories (GitHub Enterprise Cloud), with Confluence export named as the fallback destination; this prerequisite SHALL gate deployment only, not authoring.

#### Scenario: Push to main
- **WHEN** a commit touching `docs-site/` lands on main and Pages is available
- **THEN** the workflow builds the site and publishes it to GitHub Pages

#### Scenario: Pages licensing unavailable
- **WHEN** the org plan does not support access-controlled Pages on private repositories
- **THEN** the site content is delivered via the Confluence-export fallback and the prerequisite remains recorded as open
