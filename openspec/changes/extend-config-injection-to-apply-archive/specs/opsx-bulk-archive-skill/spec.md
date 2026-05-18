## ADDED Requirements

### Requirement: Config Injection into Bulk Archive Workflow

The `/opsx:bulk-archive` skill SHALL fetch archive instructions once at the start of the workflow via `openspec instructions archive --change "<first-change>" --json` and apply any returned `context` and `rules` as constraints throughout the entire batch operation.

#### Scenario: Archive instructions fetched once after batch validation

- **WHEN** agent executes `/opsx:bulk-archive`
- **THEN** the agent calls `openspec instructions archive --change "<first-change>" --json` once after batch validation (artifact status, task completion, delta spec collection) but before conflict detection and archive execution
- **AND** the returned `context` and `rules` are applied as constraints for all changes in the batch
- **NOTE** any change name in the batch may be used; archive instructions depend only on project-level config and produce identical output regardless of which change is passed

#### Scenario: Single fetch covers the entire batch

- **WHEN** the bulk archive workflow processes multiple changes
- **THEN** `openspec instructions archive --change "<first-change>" --json` is called only once, not once per change
- **AND** the same `context` and `rules` apply to every change in the batch

#### Scenario: No config does not block bulk archive

- **WHEN** `openspec instructions archive --change "<first-change>" --json` returns no `context` and no `rules`
- **THEN** the agent proceeds with the bulk archive workflow using only the built-in steps

#### Scenario: Built-in safety checks remain enforced for each change

- **WHEN** processing each change in the batch
- **THEN** the built-in per-change checks (artifact completion, task completion, spec conflict resolution) are still executed regardless of config rules
