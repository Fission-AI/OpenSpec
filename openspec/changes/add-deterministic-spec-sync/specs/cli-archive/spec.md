## ADDED Requirements

### Requirement: Applied-Delta Baseline Capture

When the archive operation rewrites main specs, it SHALL record a self-contained applied-delta baseline inside the change folder so that the operation can later be reversed deterministically by `openspec unarchive`. The baseline SHALL be forward-only and SHALL NOT alter how archive merges, moves, validates, or what it outputs.

#### Scenario: Baseline captured when specs are updated

- **WHEN** archiving a change applies delta specs to `openspec/specs/`
- **THEN** the command records, for each affected spec, its pre-merge content and its applied-result digest in an applied-delta baseline stored inside the change folder
- **AND** the baseline moves into `openspec/changes/archive/<prefix>-<name>/` together with the rest of the change

#### Scenario: Defined storage location and versioned schema

- **WHEN** the baseline is written
- **THEN** it is stored at a defined path inside the change folder — a versioned manifest `<change-folder>/.openspec/merge-baseline.json` plus, for each affected spec, its captured pre-merge content under `<change-folder>/.openspec/pre-merge/<capability>/spec.md`
- **AND** the manifest carries a schema version and, per affected spec, an entry of the form `{ "capability": "...", "preImage": "pre-merge/<capability>/spec.md" | null, "appliedDigest": "<scheme>:<hex>" }` (`preImage: null` marks a spec the archive created)
- **AND** readers that encounter an unrecognized schema version treat the baseline as unavailable rather than misreading it

#### Scenario: Created specs marked absent

- **WHEN** archiving creates a new spec that did not previously exist
- **THEN** the baseline records the pre-merge state of that spec as absent
- **AND** unarchive can delete it to restore the pre-archive state

#### Scenario: No baseline when specs are not updated

- **WHEN** archiving runs with `--skip-specs`, or the change has no delta specs to apply
- **THEN** no spec content is changed
- **AND** no applied-delta baseline is written

#### Scenario: Archive behavior and output unchanged

- **WHEN** capturing the applied-delta baseline
- **THEN** the merge, move, validation, and confirmation behavior of archive are unchanged
- **AND** the command's human-readable and `--json` output are unchanged

### Requirement: Shared Deterministic Merge Engine

The archive operation SHALL apply delta specs using the same deterministic merge engine as `openspec sync`, so that archiving and syncing produce identical spec output for the same change.

#### Scenario: Archive merge matches sync

- **WHEN** archiving applies a change's deltas to `openspec/specs/`
- **THEN** the resulting spec content is identical to what `openspec sync` produces for the same change
- **AND** the merge is performed in code without AI inference
