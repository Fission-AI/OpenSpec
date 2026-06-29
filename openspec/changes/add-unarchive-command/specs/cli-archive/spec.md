## ADDED Requirements

### Requirement: Reversal Snapshot Capture

When the archive operation rewrites main specs, it SHALL capture a self-contained reversal snapshot inside the change folder so that the operation can later be reversed deterministically by `openspec unarchive`. The snapshot SHALL be forward-only and SHALL NOT alter how archive merges, moves, validates, or what it outputs.

#### Scenario: Snapshot captured when specs are updated

- **WHEN** archiving a change applies delta specs to `openspec/specs/`
- **THEN** the command records, for each affected spec, its pre-merge content and its post-merge content digest in a reversal snapshot stored inside the change folder
- **AND** the snapshot moves into `openspec/changes/archive/<prefix>-<name>/` together with the rest of the change

#### Scenario: Created specs marked absent

- **WHEN** archiving creates a new spec that did not previously exist
- **THEN** the snapshot records the pre-merge state of that spec as absent
- **AND** unarchive can delete it to restore the pre-archive state

#### Scenario: No snapshot when specs are not updated

- **WHEN** archiving runs with `--skip-specs`, or the change has no delta specs to apply
- **THEN** no spec content is changed
- **AND** no reversal snapshot is written

#### Scenario: Archive behavior and output unchanged

- **WHEN** capturing the reversal snapshot
- **THEN** the merge, move, validation, and confirmation behavior of archive are unchanged
- **AND** the command's human-readable and `--json` output are unchanged
