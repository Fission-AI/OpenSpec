## ADDED Requirements

### Requirement: Validate SHALL resolve changes by directory existence, matching status

`openspec validate` SHALL resolve whether a named item is a change using the same rule `openspec status` and `openspec instructions` use — directory existence within the resolved root — rather than requiring a `proposal.md` to be present. This SHALL apply to targeted validation (`openspec validate <name>`) and to bulk validation (`openspec validate --all` / `--changes`), within both the repository root and a `--store`-selected root. A resolved change with a nested multi-area spec layout SHALL have its deltas discovered and validated. Spec/change ambiguity handling and `--type` overrides SHALL remain unchanged.

#### Scenario: Scaffolded change without proposal.md

- **GIVEN** a change directory created by `openspec new change <name>` that has not yet had `proposal.md` written
- **WHEN** executing `openspec validate <name>`
- **THEN** validate resolves the change and validates it
- **AND** it SHALL NOT print `Unknown item '<name>'`

#### Scenario: Targeted-resolution parity with status

- **GIVEN** any change that `openspec status --change <name>` resolves, including a change in a `--store`-selected root
- **WHEN** executing `openspec validate <name>` (passing the same `--store` when applicable)
- **THEN** validate SHALL resolve the same change that status resolved, and SHALL NOT report it as unknown

#### Scenario: Bulk validation includes proposal-less changes

- **GIVEN** a repository whose active changes include one without `proposal.md` that `openspec status` lists
- **WHEN** executing `openspec validate --all` (or `--changes`)
- **THEN** the proposal-less change SHALL be included in the validation run
- **AND** SHALL NOT be silently skipped

#### Scenario: Nested multi-area delta discovery

- **GIVEN** a resolved change whose deltas live at `specs/<area>/<capability>/spec.md` (nested deeper than one directory)
- **WHEN** validating that change
- **THEN** validate SHALL discover and validate those delta specs
- **AND** SHALL NOT report "No delta sections found" for a change that does contain deltas

#### Scenario: Change/spec ambiguity is preserved

- **GIVEN** a name that exists both as a change directory and as a spec
- **WHEN** executing `openspec validate <name>`
- **THEN** validate SHALL print the ambiguity error and respect `--type change` / `--type spec`, exactly as before

#### Scenario: Changes with proposal.md are unaffected

- **GIVEN** a change that already contains `proposal.md`
- **WHEN** validating it targeted or in bulk
- **THEN** resolution and validation behavior SHALL be byte-for-byte unchanged from today

### Requirement: SHALL/MUST body-keyword hint SHALL apply to main specs

When a requirement places the normative keyword (SHALL or MUST) only in its `### Requirement:` header and omits it from the requirement body line, `openspec validate` SHALL emit the same targeted remediation guidance for main specs under `openspec/specs/**` as it already does for change delta specs, instead of the generic "must contain SHALL or MUST" message. The targeted message SHALL be emitted exactly once for such a requirement, and SHALL be produced uniformly across every main-spec validation surface (`openspec validate <spec>`, `--all`, JSON output, `openspec spec validate`, and rebuilt-spec validation).

#### Scenario: Main spec with the keyword in the header only

- **GIVEN** a main spec requirement whose header contains SHALL or MUST but whose body line omits it
- **WHEN** running `openspec validate` over that spec
- **THEN** the error message SHALL contain the actionable sentence: "must contain SHALL or MUST in the requirement body, not only in the header. Move the SHALL/MUST statement to the line immediately after the \"### Requirement: ...\" header."
- **AND** SHALL NOT be the generic "Requirement must contain SHALL or MUST keyword" message

#### Scenario: Actionable-sentence parity with change deltas

- **GIVEN** the identical header-only-keyword mistake authored once in a main spec and once in a change delta
- **WHEN** validating each
- **THEN** the actionable remediation sentence SHALL be byte-identical between the two (the change-delta `ADDED`/`MODIFIED` prefix is not required for the main-spec message)

#### Scenario: Exactly one issue is emitted

- **GIVEN** a main spec requirement with the keyword in the header only
- **WHEN** validating it
- **THEN** validate SHALL emit exactly one issue for the missing body keyword
- **AND** SHALL NOT emit both the generic message and the targeted message for the same requirement

#### Scenario: Requirement missing the keyword entirely still errors

- **GIVEN** a main spec requirement that contains no SHALL or MUST in either the header or the body
- **WHEN** running `openspec validate` over that spec
- **THEN** validate SHALL report that the requirement must contain SHALL or MUST, as it does today

#### Scenario: Keyword present in the body is not flagged

- **GIVEN** a main spec requirement whose body line contains SHALL or MUST (whether or not the header also does)
- **WHEN** running `openspec validate` over that spec
- **THEN** validate SHALL NOT raise a missing-keyword error for that requirement
