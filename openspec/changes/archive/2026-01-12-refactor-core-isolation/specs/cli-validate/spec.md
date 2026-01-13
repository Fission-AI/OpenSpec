## ADDED Requirements

### Requirement: Success Guidance
The command SHALL display suggested next steps upon successful validation to guide the user through the OpenSpec workflow.

#### Scenario: Suggesting next steps for a change
- **WHEN** a change is successfully validated
- **THEN** display a "Next steps:" section
- **AND** suggest viewing the change details: `openspec show [id]`
- **AND** suggest archiving the change if tasks are complete: `openspec archive [id]` (contextual hint)
