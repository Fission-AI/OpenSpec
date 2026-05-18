## ADDED Requirements

### Requirement: Config Injection into Archive Workflow

The `/opsx:archive` skill SHALL fetch archive instructions via `openspec instructions archive --change "<name>" --json` before executing the workflow, and apply any returned `context` and `rules` as constraints throughout the archive process.

#### Scenario: Archive instructions fetched before main workflow steps

- **WHEN** agent executes `/opsx:archive` with a change name
- **THEN** the agent calls `openspec instructions archive --change "<name>" --json` after the built-in readiness checks (artifact completion, task completion) but before executing the main workflow steps (spec sync, archive)
- **AND** uses the returned `context` and `rules` as behavioral constraints for the remaining workflow

#### Scenario: Project context guides archive workflow

- **WHEN** `openspec instructions archive --change "<name>" --json` returns a `context` field
- **THEN** the agent applies that context as background knowledge during the archive workflow
- **AND** the context does not override or suppress the built-in readiness checks

#### Scenario: Workflow rules guide archive decisions

- **WHEN** `openspec instructions archive --change "<name>" --json` returns a `rules` field
- **THEN** the agent follows those rules as additional constraints during the archive workflow
- **AND** the rules do not override or suppress the built-in artifact completion, task completion, or spec sync checks

#### Scenario: No config does not block archive

- **WHEN** `openspec instructions archive --change "<name>" --json` returns no `context` and no `rules`
- **THEN** the agent proceeds with the archive workflow using only the built-in steps

#### Scenario: Built-in safety checks remain enforced regardless of config rules

- **WHEN** `rules.archive` contains guidance that conflicts with built-in safety behavior
- **THEN** the built-in artifact completion check, task completion check, and spec sync prompt are still executed
- **AND** config rules are applied as supplementary guidance only
