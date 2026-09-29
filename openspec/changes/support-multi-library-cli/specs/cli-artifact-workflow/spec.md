## ADDED Requirements

### Requirement: Owning library workflow execution
Status, instructions, apply instructions, and archive instructions SHALL resolve named changes to their unique owning library. New change and library-specific template/schema commands SHALL honor explicit library selection. Workflow output SHALL retain the selected library in artifact paths, action/edit-root context, and follow-up hints.

#### Scenario: Descendant change status
- **WHEN** status --change names a unique descendant change
- **THEN** resolve schema, task artifacts, and all output paths from its owning library

#### Scenario: Descendant apply instructions
- **WHEN** instructions apply targets a descendant change
- **THEN** return instructions and allowed edit roots for that product, retaining existing artifact prerequisites

#### Scenario: Explicit new change
- **WHEN** new change is run with --library batch-worker
- **THEN** create only that product's change and preserve selection in the printed next command
