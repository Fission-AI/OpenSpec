## MODIFIED Requirements

### Requirement: Change validation SHALL report scenarios a MODIFIED block would drop

The `validate` command SHALL compare every `MODIFIED` requirement in a change against the main specs and report, as an error naming the delta file, each scenario the main spec still has that the `MODIFIED` block omits and does not declare renamed. A `MODIFIED` requirement replaces the whole requirement block, so archive refuses to apply one that drops a scenario; this is the same check, run without writing anything.

The comparison SHALL match archive's operation order, comparing a `MODIFIED` that names the new header of a rename against the renamed requirement's scenarios.

A scenario the block declares renamed — `RENAMED SCENARIO FROM:`/`TO:`, with the scenario named by `TO:` present in the same block — SHALL be accounted for and not reported. The declaration SHALL be read from the `MODIFIED` block only, never from the main spec, and SHALL account for exactly one instance of the old title. Where the named successor is absent no old title SHALL be accounted for, so the omission is still reported.

The check SHALL be silent when the main spec file or the requirement header is absent, because a `MODIFIED` written against a base that has not landed yet is a separate condition that archive gates. A main spec that exists but cannot be read SHALL be reported instead, since archive fails on it too.

Validation run inside `openspec archive` SHALL NOT report these issues, because archive enforces the same check when it applies the deltas.

#### Scenario: MODIFIED omits an existing scenario

- **GIVEN** the main spec's requirement has scenarios "A" and "B"
- **WHEN** a change MODIFIES that requirement with only scenario "A" and `openspec validate <change>` runs
- **THEN** report an error naming the delta file and scenario "B"
- **AND** exit with code 1

#### Scenario: MODIFIED names the new header of a rename

- **GIVEN** the main spec has requirement "A" with scenarios "S1" and "S2"
- **WHEN** a change renames "A" to "B" and MODIFIES "B" with only scenario "S1"
- **THEN** report an error naming scenario "S2"

#### Scenario: MODIFIED header is not in the main spec

- **GIVEN** a change MODIFIES a requirement header the main spec does not contain
- **WHEN** `openspec validate <change>` runs
- **THEN** do not report a dropped-scenario error for that requirement

#### Scenario: MODIFIED declares the omitted scenario renamed

- **GIVEN** the main spec's requirement has scenario "A"
- **WHEN** a change MODIFIES that requirement with scenario "B", declaring `RENAMED SCENARIO FROM: A` and `RENAMED SCENARIO TO: B`
- **THEN** do not report "A" as an omission
- **AND** `openspec archive` SHALL apply the block

## ADDED Requirements

### Requirement: Change validation SHALL report a scenario rename declaration it cannot back up

The `validate` command SHALL report, as an error naming the delta file and the requirement, each `RENAMED SCENARIO` declaration in a `MODIFIED` block that does not describe a rename the block carries out: a `FROM:` with no `TO:` after it, a `TO:` with no `FROM:` before it, or a `TO:` naming a scenario title the block does not contain. The error SHALL name the declared title and the line within the requirement block.

`openspec archive` SHALL refuse the same block with the same sentence rather than guess at what the declaration meant, so a declaration accepted by `validate` cannot be refused by `archive`.

#### Scenario: Declared successor is not in the block

- **GIVEN** a `MODIFIED` block declaring `RENAMED SCENARIO TO:` a title the block does not contain
- **WHEN** `openspec validate <change>` runs
- **THEN** report an error naming that title and saying the block has no scenario with it
- **AND** `openspec archive` SHALL refuse the block with the same sentence

#### Scenario: Unpaired declaration half

- **GIVEN** a `MODIFIED` block with a `RENAMED SCENARIO FROM:` line and no `RENAMED SCENARIO TO:` after it
- **WHEN** `openspec validate <change>` runs
- **THEN** report an error naming the declared title and the line within the requirement block

#### Scenario: A declaration inside a fenced example

- **GIVEN** a `MODIFIED` block whose body documents the declaration syntax inside a fenced code block
- **WHEN** `openspec validate <change>` runs
- **THEN** do not treat it as a declaration, and do not report it
