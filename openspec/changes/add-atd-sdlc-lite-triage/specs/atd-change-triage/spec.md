# atd-change-triage Specification (delta)

## ADDED Requirements

### Requirement: Documented eligibility decision table
The system SHALL document the lite-eligibility decision table: single repository and component; small localized file impact; restores existing intended behavior; existing acceptance criteria, specification, or test already defines the behavior; no API contract change; no database/schema/data migration; no authentication, authorization, security, privacy, or compliance impact; no cross-service integration behavior; no new dependency; no deployment or infrastructure change; straightforward automated regression test; trivial rollback; and no need for a new solution document or new durable functional/technical documentation set. A localized correction to existing documentation remains lite-eligible when it does not indicate API, data, security, integration, dependency, deployment, or other full-workflow impact. Lite applies only when ALL conditions pass; any failure or uncertainty routes to the full schema.

#### Scenario: All conditions pass
- **WHEN** a ticket satisfies every eligibility condition
- **THEN** triage recommends `atd-sdlc-lite`

#### Scenario: Localized existing-document correction
- **WHEN** a low-risk correction requires updating an existing README or operational note and no other full-workflow trigger applies
- **THEN** the documentation update does not by itself disqualify the change from `atd-sdlc-lite`

#### Scenario: New durable documentation required
- **WHEN** the change requires a new solution document, API contract documentation, or another new durable functional/technical documentation set
- **THEN** triage recommends the full `atd-sdlc` schema

#### Scenario: Uncertain condition
- **WHEN** any condition cannot be confidently evaluated
- **THEN** triage recommends the full `atd-sdlc` schema

### Requirement: Risk-based classification, never line count
The triage instructions SHALL forbid classifying by change size alone: a one-line change touching authorization conditions, SQL WHERE clauses, or financial calculations SHALL route to the full schema regardless of size.

#### Scenario: One-line authorization change
- **WHEN** the ticket describes a one-line change to an authorization condition
- **THEN** triage recommends the full `atd-sdlc` schema with the security condition as the reason

### Requirement: Monotonic confirmation before creation
The triage skill SHALL present its recommendation with the specific conditions that drove it and obtain developer confirmation before any change is created. Governance is monotonic: when triage recommends lite, the developer may choose lite or full; when triage recommends full, full is mandatory — a weaker workflow SHALL NOT be selectable through ordinary confirmation. The change SHALL then be created via `openspec new change <name> --schema <chosen>`.

#### Scenario: Developer confirms lite recommendation
- **WHEN** triage recommends lite and the developer confirms
- **THEN** the change is created with `--schema atd-sdlc-lite`

#### Scenario: Developer strengthens to full
- **WHEN** triage recommends lite and the developer chooses full
- **THEN** the change is created with `--schema atd-sdlc`

#### Scenario: Downgrade declined
- **WHEN** triage recommends full and the developer requests lite
- **THEN** the workflow declines and identifies the failed or uncertain conditions that require the full schema

### Requirement: Auditable triage record via sidecar
The triage skill SHALL create the change with `openspec new change <name> --schema <chosen> --json` and write its recommendation, the quoted condition evaluations, and the developer's confirmation to a non-artifact sidecar file `triage.md` under the change path returned in the JSON output — never assuming the change lives under the current repository's `openspec/changes/`, since the CLI can resolve another planning root or store. The triage skill SHALL NOT create or modify `ticket.md` — artifact completion is determined by output-file existence, and a partial `ticket.md` would mark the ticket artifact complete and skip intake, completeness checking, grilling, and write-back. The ticket artifact instructions of BOTH `atd-sdlc` and `atd-sdlc-lite` SHALL read `triage.md` when present and include the routing record in the completed `ticket.md`. When no sidecar exists, the full schema proceeds normally; the lite schema SHALL treat a missing, empty, or structurally incomplete record (one lacking the recommendation, the confirmed choice, or an evaluation for every condition) as a mandatory gate — run the eligibility evaluation (bounded preflight plus condition table) at ticket intake and write `triage.md` marked as self-triage. Structural completeness SHALL NOT suffice: lite processing continues only when every condition evaluation passes AND the recommendation is `atd-sdlc-lite` AND the confirmed choice is `atd-sdlc-lite`; any FAIL or UNCERTAIN evaluation, a full recommendation, or an inconsistent confirmed choice SHALL switch the change to `atd-sdlc`. The lite ticket instructions SHALL embed the canonical condition list, since packaged schemas cannot reference repository docs or assume the triage skill is installed. Lite processing without a valid, all-pass triage record SHALL NOT be allowed. Escalation SHALL append to `triage.md`: the trigger discovered, previous schema, new schema, and reason.

#### Scenario: Sidecar written at creation
- **WHEN** a change is created through triage
- **THEN** `triage.md` exists under the change path returned by `--json` with the recommendation, each condition's evaluation, and the developer's confirmed choice, and `ticket.md` does not exist

#### Scenario: Ticket artifact still pending after triage
- **WHEN** triage has created the change and written `triage.md`
- **THEN** `openspec status` reports the `ticket` artifact as ready-to-create, not done

#### Scenario: Full schema selected through triage
- **WHEN** triage routes a change to `atd-sdlc` and the agent completes the `ticket` artifact
- **THEN** the full schema's `ticket.md` includes the routing record read from `triage.md`

#### Scenario: Lite schema selected through triage
- **WHEN** triage routes a change to `atd-sdlc-lite` and the agent completes the `ticket` artifact
- **THEN** the lite `ticket.md` includes the routing record read from `triage.md`

#### Scenario: Full change created directly without triage
- **WHEN** a change is created directly with `--schema atd-sdlc` and no `triage.md` exists
- **THEN** ticket generation proceeds normally without a routing record

#### Scenario: Lite change created directly without triage
- **WHEN** a change is created directly with `--schema atd-sdlc-lite` and no `triage.md` exists
- **THEN** the ticket instructions direct the agent to run the eligibility evaluation before intake continues, write `triage.md` marked as self-triage, and switch the change to `atd-sdlc` if any condition fails or is uncertain

#### Scenario: Empty or incomplete sidecar treated as missing
- **WHEN** a lite change's `triage.md` exists but lacks the recommendation, the confirmed choice, or an evaluation for any condition
- **THEN** the ticket instructions direct the agent to treat it exactly like a missing record and run the self-triage gate

#### Scenario: Complete sidecar containing a failed condition
- **WHEN** a lite change's `triage.md` is structurally complete but any condition evaluation is FAIL or UNCERTAIN, or the recommendation or confirmed choice is not `atd-sdlc-lite`
- **THEN** the ticket instructions direct the agent to inform the developer, append the escalation to `triage.md`, and switch the change's `.openspec.yaml` to `schema: atd-sdlc` before proceeding

#### Scenario: Escalation history appended
- **WHEN** a lite change escalates to the full schema
- **THEN** `triage.md` gains an escalation entry with the trigger, previous schema, new schema, and reason

### Requirement: Bounded codebase preflight before classification
Before recommending lite, the triage skill SHALL perform a bounded codebase preflight scoped to the ticket: locate the owning component, inspect the relevant entry points and call path, identify existing tests or specifications covering the behavior, and check for API contract, data, security, dependency, integration, and deployment impact. Any condition not verifiable from the Jira ticket or the code SHALL be treated as uncertain and route to the full schema. The preflight SHALL remain lighter than `analysis.md` — only enough investigation to classify safely.

#### Scenario: Preflight confirms lite eligibility
- **WHEN** the preflight locates the owning component, finds a covering test, and finds no contract, data, security, dependency, integration, or deployment impact
- **THEN** triage may recommend lite, citing the preflight findings in the condition evaluations

#### Scenario: Condition unverifiable from ticket and code
- **WHEN** a condition (e.g. integration impact) cannot be confirmed from the Jira ticket or the inspected code
- **THEN** triage treats it as uncertain and recommends the full schema
