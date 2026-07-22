# solution-documentation Specification (delta)

## ADDED Requirements

### Requirement: Solution document before implementation
The `solution-doc` artifact SHALL generate `solution.md` — the enterprise-facing functional and technical document — after specs and design and before tasks, so documentation exists before code. Its instructions SHALL define the full section set (executive summary; functional problem and proposed behavior; scope and business rules; acceptance-criteria traceability; current and proposed technical architecture; APIs, data, security, observability; migration and rollback; testing strategy; standards applied; as-built implementation and deviations; publication and release metadata) and SHALL direct the agent to scale depth to the change size and omit sections that do not apply — a section is never filled with boilerplate to satisfy the template.

#### Scenario: Substantial cross-component change
- **WHEN** the agent creates `solution.md` for a change affecting multiple components
- **THEN** the document covers the applicable sections with content specific to the change, and the as-built section is initialized as pending implementation

#### Scenario: Small single-component fix
- **WHEN** the change is a small fix with no API, data, migration, or security surface
- **THEN** `solution.md` contains only the applicable sections (summary, behavior, traceability, testing, standards) and omits the rest entirely

#### Scenario: Tasks gated on solution document
- **WHEN** `solution.md` does not exist
- **THEN** the `tasks` artifact is reported as blocked with an unmet dependency, is not offered by the standard workflow, and MUST NOT be created until `solution.md` exists

### Requirement: Post-implementation reconciliation
The mandatory final task group SHALL include reconciling `solution.md` against the implemented code: updating the as-built section, recording every deviation from the design with its reason, and attaching verification evidence.

#### Scenario: Implementation deviated from design
- **WHEN** the implementation differs from a decision recorded in `design.md` or `solution.md`
- **THEN** the reconciliation task records the deviation, the reason, and the evidence before apply can complete

### Requirement: Configurable publication destination
The mandatory final task group SHALL publish the reconciled `solution.md` to the destination declared in the project's `rules: tasks:` config — one of `confluence`, `repo`, or `both` — which the tasks generator embeds in the generated publication tasks. When no destination is configured, the agent SHALL ask the developer to choose before publishing.

#### Scenario: Confluence destination
- **WHEN** the `rules: tasks:` config declares destination `confluence` with a space and parent page
- **THEN** the agent publishes the document as a Confluence page under that parent via the Atlassian MCP and records the page URL in `solution.md`

#### Scenario: Repo destination
- **WHEN** the `rules: tasks:` config declares destination `repo`
- **THEN** the agent writes the document as markdown under the repository's `docs/` directory

#### Scenario: Both destinations
- **WHEN** the `rules: tasks:` config declares destination `both`
- **THEN** the agent writes the repo markdown first and publishes the same content to Confluence

#### Scenario: No destination configured
- **WHEN** the project's `rules: tasks:` config declares no documentation destination
- **THEN** the agent asks the developer to choose confluence, repo, or both before publishing

### Requirement: Idempotent Jira closure comment
The mandatory final task group SHALL add a Jira comment summarizing what shipped with links to the published documentation, written so that re-running the closure task updates the existing closure comment instead of posting duplicates.

#### Scenario: Documentation published
- **WHEN** documentation has been published to the configured destination
- **THEN** the agent adds a Jira closure comment containing the change summary and documentation links

#### Scenario: Closure re-run
- **WHEN** the closure task runs again for the same change
- **THEN** the existing closure comment is updated rather than a duplicate posted
