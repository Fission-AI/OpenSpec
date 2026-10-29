## Purpose

Lets requirements, scenarios and decisions keep a stable ID through renames, so validate, archive and anything that cites the ID keep working when a heading is reworded.

## ADDED Requirements

### Requirement: IDs in spec headings
The system SHALL read a requirement or scenario heading's ID from a square-bracketed word at the start of its name that contains a hyphen and ends in a number, such as `[AUTH-3]`, `[AUTH-3.1]` or `[cap-012]`. Without brackets, the first word SHALL remain part of the name.

#### Scenario: Requirement with an ID
- **WHEN** a spec contains `### Requirement: [AUTH-3] Users sign in`
- **THEN** the requirement's ID is `AUTH-3`

#### Scenario: Scenario with an ID
- **WHEN** a spec contains `#### Scenario: [cap-012] Correct password`
- **THEN** the scenario's ID is `cap-012`

#### Scenario: Look-alike word is not an ID
- **WHEN** a spec contains `#### Scenario: SHA-256 checksum verified` or `### Requirement: HTTP-2 support`
- **THEN** neither has an ID, and both match by name exactly as before

### Requirement: Rename keeps the ID
When a MODIFIED block's heading is not in the main spec but its ID matches exactly one requirement there, or no requirement has that ID and exactly one requirement without an ID has the same name minus the ID, validate and archive SHALL treat the block as that requirement, and archive SHALL write it in the same position under the block's heading. The scenario-loss check SHALL pair scenarios by ID before name.

#### Scenario: Requirement renamed
- **WHEN** the main spec has `[AUTH-3] Users sign in` and a MODIFIED block is headed `[AUTH-3] Users log in`
- **THEN** validate passes and archive replaces the requirement in place under `[AUTH-3] Users log in`

#### Scenario: Scenario renamed
- **WHEN** a MODIFIED block keeps scenario `[AUTH-3.1]` but changes its name from `Correct password` to `Valid password`
- **THEN** the scenario-loss check does not report `[AUTH-3.1]` as missing

#### Scenario: Scenario dropped
- **WHEN** a MODIFIED block omits scenario `[AUTH-3.2] Wrong password` that the main spec has
- **THEN** validate and archive refuse the block and name `[AUTH-3.2] Wrong password`

#### Scenario: Existing requirement gains an ID
- **WHEN** the main spec has `Users sign in` with scenario `Correct password`, and a MODIFIED block is headed `[AUTH-3] Users sign in` with scenario `[AUTH-3.1] Correct password`
- **THEN** validate passes and archive writes the requirement under its new heading

#### Scenario: Different ID with the same name
- **WHEN** the main spec has scenario `[AUTH-3.1] Correct password` and the MODIFIED block has `[AUTH-3.4] Correct password` instead
- **THEN** the check reports `[AUTH-3.1] Correct password` as missing

#### Scenario: Validate applies REMOVED first
- **WHEN** a delta removes `[AUTH-3] Login` and modifies `[AUTH-3] Sign in` against a main spec that has `Sign in`
- **THEN** validate passes, matching what archive does

### Requirement: An ID match never overrides another part of the delta
Archive SHALL refuse a MODIFIED block whose ID lookup lands on a requirement that another MODIFIED block in the same delta already changed, or that a RENAMED entry in the same delta renamed.

#### Scenario: Two blocks land on one requirement
- **WHEN** a delta has a MODIFIED `Login` and a MODIFIED `[AUTH-3] Login` against a main spec with `Login`
- **THEN** archive refuses the second block instead of overwriting the first

#### Scenario: MODIFIED would undo a rename
- **WHEN** a delta renames `[AUTH-3] Users sign in` to `[AUTH-3] Users log in` and also modifies `[AUTH-3] Users log on`
- **THEN** archive refuses the MODIFIED block and names the RENAMED header to use

### Requirement: Duplicate IDs are refused
Archive SHALL refuse a delta that would leave two requirements in a capability with the same ID, and validate SHALL report that archive would refuse it. Validate SHALL report two ADDED or two MODIFIED blocks in one delta that share an ID as an error, and SHALL warn when a requirement repeats a scenario ID. When the main spec already contains a duplicate requirement ID, the system SHALL match that capability by name and SHALL report a warning.

#### Scenario: Parallel changes pick the same ID
- **WHEN** one change has archived `[AUTH-4]` and a second change adds its own `[AUTH-4]`
- **THEN** archive refuses the second change and names both requirements, and validate reports that archive would refuse it

#### Scenario: One delta reuses an ID
- **WHEN** a delta adds two requirements that both start with `[AUTH-7]`
- **THEN** validate reports a duplicate ID error

#### Scenario: Existing duplicate in a main spec
- **WHEN** a main spec already has two requirements with ID `[AUTH-4]`
- **THEN** validate warns about the duplicate and matching for that spec uses names, as today

### Requirement: Specs without IDs are unchanged
For specs and deltas that contain no bracketed IDs, validate and archive SHALL produce the same results and output as before this change.

#### Scenario: Archive without IDs
- **WHEN** a change with no bracketed IDs in its deltas or main specs is archived
- **THEN** the rebuilt main specs are byte-identical to the previous behavior

### Requirement: ID conventions in the spec-driven templates
The `spec-driven` spec template and instructions SHALL show bracketed IDs on requirement and scenario headings, keep existing IDs on edits, and never reuse a removed ID. The design template SHALL give each decision a `### D<n>` heading with the choice and reason in one or two sentences, and SHALL list alternatives only when someone raised them. The tasks instructions SHALL cite decisions as `[D<n>](./design.md#d<n>)`.

#### Scenario: Agent writes a decision
- **WHEN** an agent writes `design.md` from the template
- **THEN** each decision has a `### D1`-style heading followed by at most two sentences, with no Alternatives section unless one was raised

#### Scenario: Task cites a decision
- **WHEN** a task implements decision D2
- **THEN** the task line links `[D2](./design.md#d2)`
