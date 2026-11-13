## ADDED Requirements

### Requirement: Scenario Rename Declaration

A `MODIFIED` requirement block SHALL be able to declare that a scenario the main spec still carries was renamed rather than dropped, so that a deliberate rename is distinguishable from an accidental omission without weakening the omission check.

The declaration is written inside the `MODIFIED` requirement block it applies to, one level down from `## RENAMED Requirements`:

```markdown
## MODIFIED Requirements

### Requirement: Full car park refuses entry
The system SHALL refuse entry when no bay is free, unless the driver holds a permit.

- RENAMED SCENARIO FROM: `#### Scenario: Car arrives at a full car park`
- RENAMED SCENARIO TO: `#### Scenario: Car without a permit arrives at a full car park`

#### Scenario: Car without a permit arrives at a full car park
- **WHEN** a car arrives, no bay is free, and the driver holds no permit
- **THEN** entry is refused
```

The bullet is optional and every CommonMark bullet marker is accepted, matching `## RENAMED Requirements`. The declared name MAY be written as a full `#### Scenario: Title` header, as `Scenario: Title`, or as the bare `Title`, with or without surrounding backticks; all three name the same scenario. A declaration inside a fenced code block declares nothing.

#### Scenario: Declaring a scenario rename

- **WHEN** a `MODIFIED` requirement retitles a scenario the main spec still has
- **THEN** the block MAY carry a `RENAMED SCENARIO FROM:` line followed by a `RENAMED SCENARIO TO:` line
- **AND** the old title SHALL be accounted for rather than reported as an omission
- **AND** the scenario named by `TO:` SHALL be present in the same block

#### Scenario: A declaration whose successor is absent

- **WHEN** a `MODIFIED` block declares a rename to a scenario title the block does not contain
- **THEN** the declaration SHALL be reported as an error
- **AND** the old title SHALL still be reported as an omission, because nothing accounted for it

#### Scenario: An unpaired declaration

- **WHEN** a `RENAMED SCENARIO FROM:` line has no `RENAMED SCENARIO TO:` after it, or a `TO:` line has no `FROM:` before it
- **THEN** it SHALL be reported as an error rather than ignored

#### Scenario: Several scenarios merged into one

- **WHEN** two scenarios are superseded by a single narrower one
- **THEN** the block MAY carry one declaration per old title, each naming that same successor
- **AND** each declaration SHALL account for exactly one instance of its old title

#### Scenario: Declarations do not reach the main spec

- **WHEN** a `MODIFIED` block carrying declarations is applied to the main spec
- **THEN** the declaration lines SHALL NOT appear in the main spec, which never carries delta operation markers
- **AND** applying the same block again SHALL be recognized as already in sync
