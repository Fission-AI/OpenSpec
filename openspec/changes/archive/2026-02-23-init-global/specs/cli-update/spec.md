## ADDED Requirements

### Requirement: Global update mode

The `openspec update` command SHALL support a `--global` flag that updates globally-installed OpenSpec files.

#### Scenario: Global update

- **WHEN** `openspec update --global` is executed
- **THEN** the system SHALL regenerate globally-installed skill and command files for all tools that have global files present
- **AND** use the existing marker-based update logic to refresh managed content
- **AND** preserve any user-authored content outside OpenSpec markers

#### Scenario: Global update with no globally-installed files

- **WHEN** `openspec update --global` is executed
- **AND** no globally-installed OpenSpec files are found
- **THEN** the system SHALL display a message indicating no global installations were found
- **AND** suggest running `openspec init --global --tools <id>` first

#### Scenario: Non-global update unchanged

- **WHEN** `openspec update` is executed without `--global`
- **THEN** the system SHALL only update project-local files
- **AND** SHALL NOT modify or scan globally-installed files
- **AND** all existing update behavior SHALL remain unchanged
