## ADDED Requirements

### Requirement: Store-aware schema discovery

The system SHALL discover schemas and artifact types from a store when the store
is selected with `--store` or referenced by the current repo, in addition to the
current repo's own schemas.

#### Scenario: Listing a store's schemas

- **WHEN** a user runs `openspec schemas --store acme-plans`
- **THEN** the system lists the schemas defined in the `acme-plans` store
- **AND** each schema shows its name and description

#### Scenario: Referenced store schemas are visible from a repo

- **WHEN** a repo references the `acme-plans` store and the user runs
  `openspec context`
- **THEN** the referenced store's custom artifact types are listed as read-only
  context
- **AND** each entry includes a one-line summary and a fetch command

#### Scenario: No store referenced falls back to current repo

- **WHEN** the current repo references no store and the user runs
  `openspec schemas`
- **THEN** the system lists only the current repo's schemas, exactly as it does
  today

### Requirement: Initiative precedence between a store and a local repo

The system SHALL treat a store initiative as canonical and a local initiative
with the same id as a shadow, and SHALL report the shadow without blocking local
work.

#### Scenario: Local initiative shadows a canonical store initiative

- **WHEN** a repo references a store that has an initiative `smoother-setup`
- **AND** the repo also has a local initiative `smoother-setup`
- **THEN** the system reports that the local initiative shadows the canonical one
  in the store
- **AND** local commands continue to operate on the local initiative

#### Scenario: No collision means no shadow report

- **WHEN** a local initiative id does not match any initiative in a referenced
  store
- **THEN** the system reports no shadow for that initiative

### Requirement: Initiative status rollup

The system SHALL list initiatives and roll up the live status of the changes each
initiative groups.

#### Scenario: Listing initiatives in a store

- **WHEN** a user runs `openspec list --initiatives --store acme-plans`
- **THEN** the system lists each initiative in the store
- **AND** each initiative shows the rolled-up status of the changes it groups
