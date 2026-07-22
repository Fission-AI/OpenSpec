# atd-sdlc-workflow Specification (delta)

## ADDED Requirements

### Requirement: ATD SDLC schema availability
The system SHALL provide a built-in schema named `atd-sdlc` with the artifact pipeline `ticket → analysis → (specs, design) → solution-doc → tasks` and an apply phase tracked by `tasks.md`, resolvable through the same three-tier schema resolution as `spec-driven`.

#### Scenario: Selecting the schema
- **WHEN** a project's `openspec/config.yaml` declares `schema: atd-sdlc`
- **THEN** `openspec status` lists the artifacts `ticket`, `analysis`, `specs`, `design`, `solution-doc`, `tasks` with their dependency order, with `tasks` requiring `solution-doc`

#### Scenario: Project-local override still wins
- **WHEN** a project defines its own `openspec/schemas/atd-sdlc/schema.yaml`
- **THEN** the project-local schema is used instead of the built-in one

### Requirement: Ticket intake from Jira and Confluence
The `ticket` artifact instructions SHALL direct the agent to pull the Jira issue named by the change (change names use the ticket key, e.g. `abc-1234-add-export`) and all linked Confluence pages via the Atlassian MCP, and record the normalized problem statement, acceptance criteria, and source links in `ticket.md`. When the Atlassian MCP is unavailable, the instructions SHALL direct the agent to ask the developer to paste the ticket content and continue with the same checklist.

#### Scenario: Ticket with documented requirements
- **WHEN** the agent creates the `ticket` artifact for a change named after a Jira key
- **THEN** `ticket.md` contains the problem statement, acceptance criteria with stable IDs (AC-1, AC-2, …), affected systems, and links to the Jira issue and Confluence sources

#### Scenario: Atlassian MCP unavailable
- **WHEN** the agent cannot reach the Atlassian MCP
- **THEN** the agent asks the developer to paste the ticket content and proceeds with the completeness checklist

### Requirement: Completeness gate with embedded grilling protocol
The `ticket` artifact instructions SHALL define a completeness checklist (problem statement, acceptance criteria, affected systems, edge cases, constraints, out-of-scope) and, when any item is missing, direct the agent to interrogate the developer using the embedded grilling protocol: explore the codebase first for questions the code can answer, otherwise ask exactly one question at a time with a recommended answer attached, looping until the checklist passes.

#### Scenario: Empty Jira ticket
- **WHEN** the pulled Jira issue has no acceptance criteria
- **THEN** the agent asks the developer one targeted question at a time, each with a recommended answer, until acceptance criteria are established and recorded in `ticket.md` under "Clarified Requirements" with the question/answer trace

#### Scenario: Codebase-answerable gap
- **WHEN** a checklist gap can be resolved by reading the repository (e.g. which module owns the behavior)
- **THEN** the agent answers it by exploring the codebase and does not ask the developer

### Requirement: Confirmed, idempotent Jira write-back
The `ticket` artifact instructions SHALL direct the agent to offer updating the Jira issue with clarified requirements after grilling, proceed only after the developer confirms, and write into a clearly delimited managed section of the issue description so repeated runs replace only that section and never human-authored content. A project's `rules: ticket:` config MAY disable write-back entirely.

#### Scenario: Write-back after confirmation
- **WHEN** grilling produced clarified requirements and the developer confirms the write-back
- **THEN** the agent updates only the managed section of the Jira issue description via the Atlassian MCP and notes the update in `ticket.md`

#### Scenario: Re-run does not clobber
- **WHEN** the ticket artifact is regenerated for an issue that already has a managed section
- **THEN** the agent replaces the managed section content and leaves the rest of the description untouched

#### Scenario: Write-back declined or disabled
- **WHEN** the developer declines, or the project config contains a `ticket` rule disabling write-back
- **THEN** the agent records clarified requirements only in `ticket.md`

### Requirement: Branch alignment suggestion
The `ticket` artifact instructions SHALL direct the agent to compare the current git branch name with the Jira ticket key during intake and, when the branch does not reference the key, suggest creating or switching to a branch named after the ticket (e.g. `abc-1234-add-export`). The suggestion SHALL be advisory: the developer may decline and work continues on the current branch; the agent SHALL NOT create or switch branches without explicit developer confirmation. The branch used SHALL be recorded in `ticket.md`.

#### Scenario: Branch already references the ticket
- **WHEN** the current branch name contains the Jira ticket key
- **THEN** the agent proceeds without a suggestion and records the branch in `ticket.md`

#### Scenario: Branch unrelated to the ticket
- **WHEN** the current branch is `main` or otherwise does not reference the ticket key
- **THEN** the agent suggests a branch named after the ticket, and on confirmation creates or switches to it before continuing

#### Scenario: Suggestion declined
- **WHEN** the developer declines the branch suggestion
- **THEN** the agent continues on the current branch and records the declined suggestion and chosen branch in `ticket.md`

### Requirement: Evidence-cited analysis
The `analysis` artifact instructions SHALL require every claim about current behavior to cite the repository commit SHA (recorded once per document) and `file:line` ranges, and require the artifact to name the affected stacks from the explicit set {python, spring-boot, oracle-ebs, angular}.

#### Scenario: Analysis of current behavior
- **WHEN** the agent creates `analysis.md`
- **THEN** the document records the commit SHA it was written against, each statement about existing code carries a `file:line` citation, and the artifact lists the affected stacks

### Requirement: Code as the source of truth
The `analysis` artifact instructions SHALL direct the agent to derive current behavior from the code itself, treating documentation (Confluence, comments, wikis) as hints to be verified. When documentation and code disagree, the code's behavior SHALL be recorded as current truth and the discrepancy noted in `analysis.md`.

#### Scenario: Documentation contradicts code
- **WHEN** a Confluence page describes behavior that the cited code does not implement
- **THEN** `analysis.md` records the code's actual behavior as current truth and lists the documentation discrepancy for the developer

#### Scenario: Undocumented business rule
- **WHEN** the code contains business logic no documentation mentions
- **THEN** `analysis.md` captures the rule from the code with its citation

### Requirement: Token-efficient code reading
The `analysis` artifact instructions SHALL define a reading strategy scoped to the ticket's acceptance criteria: locate entry points (endpoint, job, UI action) relevant to each AC, trace the call path from there, and read only the sections that path touches — never whole-directory or whole-file sweeps when a targeted read answers the question. When the project's `rules: analysis:` config names code-index or code-graph tooling, the instructions SHALL direct the agent to prefer it over raw file reads.

#### Scenario: Tracing an endpoint change
- **WHEN** an acceptance criterion concerns one API endpoint's behavior
- **THEN** the agent traces controller → service → data access for that endpoint and does not read unrelated modules

#### Scenario: Repo declares code-index tooling
- **WHEN** the project's `rules: analysis:` config names a code-index tool available in the developer's agent
- **THEN** the agent uses that tool for symbol lookup and call-path tracing instead of reading raw files

### Requirement: Spec traceability to acceptance criteria
The `specs` artifact instructions SHALL require every requirement to reference at least one acceptance-criterion ID from `ticket.md`, and SHALL forbid requirements without a corresponding acceptance criterion.

#### Scenario: Requirement with traceability
- **WHEN** the agent writes a requirement in a delta spec
- **THEN** the requirement text references the acceptance-criterion IDs it satisfies (e.g. "Covers: AC-2")

#### Scenario: Scope invention rejected
- **WHEN** a candidate requirement has no matching acceptance criterion
- **THEN** the instructions direct the agent to either drop it or return to the ticket artifact to add the criterion with the developer

### Requirement: Design with purposeful diagrams
The `design` artifact instructions SHALL require a mermaid Solution Flow diagram when the change spans multiple components or the flow is otherwise non-trivial, SHALL permit omitting it for single-component changes, and SHALL direct the agent to omit empty sections instead of filling them with boilerplate.

#### Scenario: Cross-component change
- **WHEN** the agent creates `design.md` for a change touching more than one component or system
- **THEN** it contains a Solution Flow section with a mermaid diagram whose nodes tasks can reference

#### Scenario: Trivial single-component change
- **WHEN** the change is confined to one component with a straightforward flow
- **THEN** `design.md` omits the diagram rather than drawing one to satisfy the template

### Requirement: Verifiable tasks
The `tasks` artifact instructions SHALL require each task to name the target files or modules, the acceptance-criterion IDs it serves, and a verification command or check, so both developers and agents can confirm completion. Governance tasks in the mandatory final group (standards conformance, reconciliation, publication, Jira closure) MAY omit code files and AC IDs but SHALL still state their verification evidence.

#### Scenario: Task format
- **WHEN** the agent writes a task
- **THEN** the task names the files/modules it touches, references the AC IDs it serves, and states how completion is verified (test command, CLI invocation, or observable output)

#### Scenario: Governance task format
- **WHEN** the agent writes a final-group governance task
- **THEN** the task states its verification evidence (e.g. deviation list recorded, published URL noted) even though it names no code files or AC IDs
