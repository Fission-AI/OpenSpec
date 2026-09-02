## MODIFIED Requirements

### Requirement: Archive Process

The archive operation SHALL follow a structured process to safely move changes to the archive.

#### Scenario: Performing archive

- **WHEN** archiving a change
- **THEN** execute these steps:
  1. Create archive/ directory if it doesn't exist
  2. Generate target name as `YYYY-MM-DD-[change-name]` using current date, keeping the name as-is when it already starts with a `YYYY-MM-DD-` prefix
  3. Claim the target and verify that it does not already exist
  4. Prepare and validate spec updates from the active change's delta specs
  5. Apply the spec updates as a rollback-capable transaction
  6. Move the entire change directory to the archive location
  7. If a spec mutation or final move fails before a complete archive is secured, restore the spec transaction and leave or return the change at its active path
  8. If a verified fallback copy completes but staged-source cleanup fails, retain the complete archive and committed spec state for recovery instead of risking the only complete copy

#### Scenario: Archive already exists

- **WHEN** target archive already exists
- **THEN** fail with error message
- **AND** do not overwrite existing archive

#### Scenario: Successful archive

- **WHEN** move succeeds
- **THEN** display success message with archived name and list of updated specs

#### Scenario: Successful archive releases its own claim

- **WHEN** an archive run successfully moves a change to its archive destination
- **THEN** remove the temporary archive claim it created
- **AND** do so on supported platforms even when a path stat does not report a device id
- **AND** never remove a claim whose path identity or contents changed before cleanup
