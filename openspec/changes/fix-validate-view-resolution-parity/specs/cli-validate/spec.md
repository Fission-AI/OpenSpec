## ADDED Requirements

### Requirement: Validate SHALL resolve changes through shared planning-home resolution

`openspec validate <item>` SHALL resolve the named change through the same planning-home resolution used by `openspec status` and `openspec instructions`, so that a change living in a managed workspace planning home is validated rather than rejected as unknown. Repo planning-home resolution, ambiguity handling, and `--type` overrides SHALL remain unchanged.

#### Scenario: Validate a change in a workspace planning home

- **GIVEN** a managed workspace planning home in which `openspec status --change <name>` resolves the change and lists its artifacts
- **WHEN** executing `openspec validate <name>` from the same workspace root
- **THEN** validate resolves and validates that change using the workspace planning home
- **AND** it SHALL NOT print `Unknown item '<name>'`

#### Scenario: Repo planning-home resolution is unchanged

- **GIVEN** a change that exists in the repository planning home
- **WHEN** executing `openspec validate <name>`
- **THEN** validate resolves and validates it exactly as before, with identical not-found, ambiguity, and `--type` override behavior

#### Scenario: Workspace-resolution parity with status

- **GIVEN** any change name that `openspec status --change <name>` resolves
- **WHEN** executing `openspec validate <name>` from the same working directory
- **THEN** validate SHALL resolve the same change that status resolved
- **AND** SHALL NOT report it as unknown

### Requirement: SHALL/MUST body-keyword hint SHALL apply to main specs

When a requirement places the normative keyword (SHALL or MUST) only in its `### Requirement:` header and omits it from the requirement body line, `openspec validate` SHALL emit the same targeted remediation hint for main specs under `openspec/specs/**` as it already does for change delta specs, instead of the generic "must contain SHALL or MUST" message.

#### Scenario: Main spec with the keyword in the header only

- **GIVEN** a main spec requirement whose header contains SHALL or MUST but whose body line omits it
- **WHEN** running `openspec validate` over that spec
- **THEN** the error message SHALL direct the author to move the SHALL/MUST statement onto the body line immediately after the `### Requirement: ...` header
- **AND** SHALL NOT be the generic "Requirement must contain SHALL or MUST keyword" message

#### Scenario: Hint parity between main specs and change deltas

- **GIVEN** the same header-only-keyword mistake authored once in a main spec and once in a change delta
- **WHEN** validating each
- **THEN** both SHALL receive the targeted "move the keyword to the body line" remediation hint

#### Scenario: Requirement missing the keyword entirely

- **GIVEN** a main spec requirement that contains no SHALL or MUST in either the header or the body
- **WHEN** running `openspec validate` over that spec
- **THEN** validate SHALL report that the requirement must contain SHALL or MUST, as it does today
