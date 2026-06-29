## ADDED Requirements

### Requirement: Archive requirement-recognition SHALL match validate
The requirement validation performed during `openspec archive` SHALL recognize requirements using the same canonical `### Requirement:` rule as `openspec validate`. Archive SHALL NOT report requirement-recognition issues (for example phantom `must contain SHALL or MUST` or `must have at least one scenario` warnings) for level-3 headers that `openspec validate` does not treat as requirements.

#### Scenario: Stray non-requirement header produces no phantom warning at archive
- **GIVEN** a change whose spec deltas pass `openspec validate <change-id> --strict` and whose Requirements/ADDED section contains a stray level-3 header that is not a `### Requirement:` header
- **WHEN** running `openspec archive <change-id>`
- **THEN** the `Proposal warnings in proposal.md` output SHALL NOT include phantom requirement warnings derived from the stray header
- **AND** the archive SHALL succeed as it does today

#### Scenario: Genuinely invalid requirement fails consistently across commands
- **GIVEN** a change whose spec contains a real `### Requirement:` block with no `SHALL`/`MUST` and no scenario
- **WHEN** running `openspec validate <change-id> --strict` and `openspec archive <change-id>`
- **THEN** both commands SHALL report the same requirement as invalid using consistent messaging
