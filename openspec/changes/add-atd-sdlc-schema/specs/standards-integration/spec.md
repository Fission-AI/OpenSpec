# standards-integration Specification (delta)

## ADDED Requirements

### Requirement: Standards store convention
The system SHALL document the `atd-standards` store convention: a standalone OpenSpec root whose specs are the explicit list {python-service-standards, spring-boot-standards, oracle-ebs-plsql-standards, angular-standards}, mapped from stacks as python → python-service-standards, spring-boot → spring-boot-standards, oracle-ebs → oracle-ebs-plsql-standards, angular → angular-standards, referenced by ATD repos via `references: [atd-standards]` in `openspec/config.yaml`.

#### Scenario: Repo referencing standards
- **WHEN** a repo's config declares `references: [atd-standards]` and the store is registered on the machine
- **THEN** generated instructions carry an index of the standards specs with one-line summaries and fetch recipes

#### Scenario: Store not registered
- **WHEN** the `atd-standards` store is not registered locally
- **THEN** instruction generation degrades to a warning diagnostic and does not fail

### Requirement: Standards store readiness before pilot
The ATD rollout documentation SHALL declare `establish-atd-standards-store` as a separately owned prerequisite for pilot wave 1. Readiness SHALL require: a standalone `atd-standards` repository; all four mapped standards specs passing strict validation; named stack-lead owners and CODEOWNERS; working registration/bootstrap instructions; and a pilot machine that passes `openspec store doctor atd-standards` and successfully fetches every mapped spec. Pilot wave 1 SHALL NOT begin while any readiness check is incomplete.

#### Scenario: Standards prerequisite ready
- **WHEN** the repository and four mapped specs exist, strict validation passes, ownership and bootstrap are documented, store doctor is healthy, and every mapped spec can be fetched on the pilot machine
- **THEN** the standards prerequisite is marked ready and pilot wave 1 may begin

#### Scenario: Standards prerequisite incomplete
- **WHEN** any standards repository, content, ownership, registration, health, or mapped-fetch check is incomplete
- **THEN** pilot wave 1 remains blocked and the missing readiness check is reported

### Requirement: Standards consultation at apply time
The `atd-sdlc` schema's apply instructions SHALL direct the agent, before implementing any task, to fetch the standards spec mapped to each stack listed in `analysis.md` — using the explicit mapping python → python-service-standards, spring-boot → spring-boot-standards, oracle-ebs → oracle-ebs-plsql-standards, angular → angular-standards — and conform to it.

#### Scenario: Apply on an Angular change
- **WHEN** `analysis.md` lists `angular` as an affected stack and the agent starts apply
- **THEN** the agent fetches `angular-standards` from the store before writing code

### Requirement: Standards conformance verify task
The `tasks` artifact instructions SHALL require the final task group to contain one conformance task per affected stack, naming the mapped standards spec from the explicit mapping (e.g. "Verify conformance to `oracle-ebs-plsql-standards` scenarios; note deviations").

#### Scenario: Generated task list
- **WHEN** the agent creates `tasks.md` for a change affecting spring-boot and angular
- **THEN** the final task group contains a checkbox conformance task for `spring-boot-standards` and one for `angular-standards`
