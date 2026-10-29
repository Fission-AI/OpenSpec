## Purpose

Lets requirements, scenarios and decisions keep a stable ID through renames, so validate, archive and anything that cites the ID keep working when a heading is reworded.

## ADDED Requirements

### Requirement: IDs in spec headings
The system SHALL read the first word of a requirement or scenario heading as its ID when it is an uppercase token ending in a number, such as `AUTH-3` or `AUTH-3.1`, or a token of letters, digits and hyphens in square brackets that ends in a number, such as `[cap-012]`. Any other first word SHALL remain part of the name.

#### Scenario: Requirement with an ID
- **WHEN** a spec contains `### Requirement: AUTH-3 Users sign in`
- **THEN** the requirement's ID is `AUTH-3`

#### Scenario: Bracketed ID
- **WHEN** a spec contains `#### Scenario: [cap-012] Correct password`
- **THEN** the scenario's ID is `cap-012`

#### Scenario: Ordinary word is not an ID
- **WHEN** a spec contains `### Requirement: Step-2 rollout`
- **THEN** the requirement has no ID

### Requirement: Rename keeps the ID
When a MODIFIED block's heading is not in the main spec but its ID matches exactly one requirement there, or no requirement has that ID and exactly one requirement without an ID has the same name minus the ID, validate and archive SHALL treat the block as that requirement, and archive SHALL write it in the same position under the block's heading. The scenario-loss check SHALL pair scenarios by ID before name.

#### Scenario: Requirement renamed
- **WHEN** the main spec has `AUTH-3 Users sign in` and a MODIFIED block is headed `AUTH-3 Users log in`
- **THEN** validate passes and archive replaces the requirement in place under `AUTH-3 Users log in`

#### Scenario: Scenario renamed
- **WHEN** a MODIFIED block keeps scenario `AUTH-3.1` but changes its name from `Correct password` to `Valid password`
- **THEN** the scenario-loss check does not report `AUTH-3.1` as missing

#### Scenario: Scenario dropped
- **WHEN** a MODIFIED block omits scenario `AUTH-3.2` that the main spec has
- **THEN** validate and archive refuse the block and name `AUTH-3.2`

#### Scenario: Existing requirement gains an ID
- **WHEN** the main spec has `Users sign in` with scenario `Correct password`, and a MODIFIED block is headed `AUTH-3 Users sign in` with scenario `AUTH-3.1 Correct password`
- **THEN** validate passes and archive writes the requirement under its new heading

#### Scenario: Different ID with the same name
- **WHEN** the main spec has scenario `AUTH-3.1 Correct password` and the MODIFIED block has `AUTH-3.4 Correct password` instead
- **THEN** the check reports `AUTH-3.1` as missing

### Requirement: Duplicate IDs are refused
Archive SHALL refuse a delta that would leave two requirements in a capability with the same ID, and validate SHALL report that archive would refuse it. Validate SHALL report two ADDED or two MODIFIED blocks in one delta that share an ID as an error. When the main spec already contains a duplicate ID, the system SHALL match that capability by name and SHALL report a warning.

#### Scenario: Parallel changes pick the same ID
- **WHEN** one change has archived `AUTH-4` and a second change adds its own `AUTH-4`
- **THEN** archive refuses the second change and names both requirements, and validate reports that archive would refuse it

#### Scenario: One delta reuses an ID
- **WHEN** a delta adds two requirements that both start with `AUTH-7`
- **THEN** validate reports a duplicate ID error

#### Scenario: Existing duplicate in a main spec
- **WHEN** a main spec already has two requirements with ID `AUTH-4`
- **THEN** validate warns about the duplicate and matching for that spec uses names, as today

### Requirement: Specs without IDs are unchanged
For specs and deltas that contain no IDs, validate and archive SHALL produce the same results and output as before this change.

#### Scenario: Archive without IDs
- **WHEN** a change with no IDs in its deltas or main specs is archived
- **THEN** the rebuilt main specs are byte-identical to the previous behavior

### Requirement: ID conventions in the spec-driven templates
The `spec-driven` spec template and instructions SHALL show IDs on requirement and scenario headings, keep existing IDs on edits, and never reuse a removed ID. The design template SHALL give each decision a `### D<n>` heading with the choice and reason in one or two sentences, and SHALL list alternatives only when someone raised them. The tasks instructions SHALL cite decisions as `[D<n>](./design.md#d<n>)`.

#### Scenario: Agent writes a decision
- **WHEN** an agent writes `design.md` from the template
- **THEN** each decision has a `### D1`-style heading followed by at most two sentences, with no Alternatives section unless one was raised

#### Scenario: Task cites a decision
- **WHEN** a task implements decision D2
- **THEN** the task line links `[D2](./design.md#d2)`
