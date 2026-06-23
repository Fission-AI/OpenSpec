# OPSX Archive Skill Delta

## MODIFIED Requirements

### Requirement: Spec Sync Prompt

The skill SHALL prompt to sync delta specs before archiving when specs exist and the corresponding main specs are missing or out of date.

#### Scenario: Greenfield delta specs create main specs

- **WHEN** a change contains a delta spec for a capability
- **AND** `openspec/specs/<capability>/spec.md` does not exist
- **THEN** the archive sync assessment SHALL treat the capability as needing sync
- **AND** the recommended archive option SHALL sync before moving the change to archive
