## ADDED Requirements

### Requirement: A test declares a scenario reference with a line annotation

Any file in a project SHALL be able to declare a reference to one spec scenario by writing `@openspec <reference>` on a line. The annotation SHALL be recognized without knowledge of the file's language or comment syntax, and a file SHALL be able to declare any number of references by writing one annotation per line.

#### Scenario: An annotation in any comment syntax is recognized

- **GIVEN** a line whose `@openspec` token begins the line or follows a character that is not a letter, digit or underscore
- **WHEN** references are collected
- **THEN** the line declares a reference
- **AND** `// @openspec ...`, `# @openspec ...`, `-- @openspec ...`, `/* @openspec ...` and `<!-- @openspec ...` are all recognized without naming a language

#### Scenario: A token that merely contains the word is not an annotation

- **GIVEN** a line containing `foo@openspec cli-show#json-output` or `my_openspec cli-show#json-output`
- **WHEN** references are collected
- **THEN** the line declares no reference
- **AND** no finding is reported for it

#### Scenario: The reference is the first token and the rest of the line is ignored

- **GIVEN** the line `<!-- @openspec cli-show#json-output -->` or `// @openspec cli-show#json-output (see #1234)`
- **WHEN** references are collected
- **THEN** the declared reference is `cli-show#json-output`
- **AND** the text following the reference on that line is ignored

#### Scenario: A reference glued to a comment closer is malformed

- **GIVEN** the line `/*@openspec cli-show#json-output*/`, with no space between the reference and the closer
- **WHEN** references are collected
- **THEN** the reference is reported as malformed rather than silently trimmed
- **AND** the finding names the characters that are not allowed in a reference
- **AND** the finding says to separate the reference from the comment closer with a space

#### Scenario: Several references are several lines

- **GIVEN** a file with two annotation lines above one test
- **WHEN** references are collected
- **THEN** both references are declared
- **AND** each is reported at its own line number
- **AND** no separator for declaring two references on one line is recognized

#### Scenario: An annotation is a location, not a test

- **GIVEN** an annotation anywhere in a file, whether or not a test declaration follows it
- **WHEN** references are collected
- **THEN** the reference is identified by its file and line
- **AND** no test name, test framework or language is parsed to attribute it
- **AND** a file with no annotation contributes nothing

### Requirement: A reference names a scenario in one canonical spelling

A reference SHALL be `<capability>#<scenario>`, or `<capability>#<requirement>#<scenario>` when the short form is ambiguous. Every segment SHALL be the canonical fold of the name it refers to, so a scenario has at most two accepted spellings and exactly one canonical spelling, which SHALL be reported wherever the reference is reported. The capability segment SHALL use `/` to separate the parts of a nested capability id on every platform, matching the spec ids the rest of the tool uses.

#### Scenario: The canonical fold of a name

- **GIVEN** a requirement or scenario name
- **WHEN** its canonical segment is computed
- **THEN** the name is normalized to Unicode NFKC, lowercased, every run of characters that is not a Unicode letter, mark or digit becomes a single `-`, and leading and trailing `-` are removed
- **AND** `JSON output schema for bulk validation` folds to `json-output-schema-for-bulk-validation`
- **AND** a name containing `#`, such as `C# support`, folds to `c-support` and stays referenceable
- **AND** letters outside ASCII are kept rather than transliterated, so a scenario named in French folds to a French segment

#### Scenario: A segment is valid only in canonical form

- **GIVEN** a reference segment
- **WHEN** it is parsed
- **THEN** the segment is valid only when it already equals its own fold
- **AND** `Cli-Show`, `cli--show`, `-cli-show` and a segment carrying a decomposed accent are each reported as malformed
- **AND** the finding names the canonical spelling to use instead
- **AND** no spelling outside the two accepted forms resolves

#### Scenario: Reference parts are separated without escaping

- **GIVEN** a reference token
- **WHEN** it is split into parts
- **THEN** it is split on `#`, and two parts mean capability and scenario while three mean capability, requirement and scenario
- **AND** a capability segment keeps its `/` separators, so `billing/invoices#json-output` names a nested capability
- **AND** a token with fewer than two or more than three parts is reported as malformed
- **AND** no quoting, escaping or backslash rule is needed, because a canonical segment can contain neither `#` nor `/`

#### Scenario: Reference spelling does not depend on the platform

- **GIVEN** the same reference resolved on Windows, macOS and Linux
- **WHEN** it names a nested capability
- **THEN** the reference uses `/` on all three
- **AND** the native path separator never appears in a reference
- **AND** resolution produces the same outcome on all three

#### Scenario: A scenario whose fold is empty cannot be referenced

- **GIVEN** a scenario whose name consists only of characters the fold removes, such as `...`
- **WHEN** the specs are indexed
- **THEN** that scenario is reported as unreferenceable, naming its capability and requirement
- **AND** it is not treated as a scenario whose segment is the empty string

### Requirement: Resolution reports one outcome for every reference

Resolving a reference SHALL compare it against the scenarios in `openspec/specs/`, and SHALL report exactly one of `resolved`, `malformed`, `unresolved` or `ambiguous` for it. Resolution SHALL use the same requirement and scenario names the rest of the tool uses, so a reference and `show --json` cannot disagree about what a scenario is called.

#### Scenario: Names come from the existing parsers

- **GIVEN** the spec index used for resolution
- **WHEN** a requirement or scenario name is read
- **THEN** the requirement name is the one `normalizeRequirementName` produces
- **AND** the scenario name is the one `scenarioNameFromHeaderText` produces, which is the name `show --json` reports
- **AND** a scenario is any non-fenced level-4 header under a requirement, matching `SCENARIO_HEADER`
- **AND** the spec Markdown is not parsed a second way for resolution

#### Scenario: A short reference matching one scenario resolves

- **GIVEN** a valid reference `<capability>#<scenario>`
- **WHEN** exactly one scenario in that capability folds to that scenario segment
- **THEN** the reference is `resolved`
- **AND** the outcome names the capability, requirement and scenario it resolved to
- **AND** the requirement that contains the scenario does not need to be written in the reference

#### Scenario: An expanded reference resolves within one requirement

- **GIVEN** a valid reference `<capability>#<requirement>#<scenario>`
- **WHEN** exactly one scenario under that requirement in that capability folds to that scenario segment
- **THEN** the reference is `resolved`

#### Scenario: An expanded reference to an unambiguous scenario resolves and is reported as redundant

- **GIVEN** an expanded reference whose scenario segment is already unique in its capability
- **WHEN** it is resolved
- **THEN** the reference is `resolved`, because it identifies exactly one scenario
- **AND** the outcome reports the short form as the canonical reference
- **AND** the outcome marks the requirement segment as more specific than needed
- **AND** the outcome is not an error, so removing an unrelated colliding scenario elsewhere in the capability never invalidates a reference that still identifies one scenario

#### Scenario: An unresolved reference says which part is missing

- **GIVEN** a valid reference
- **WHEN** no scenario matches it
- **THEN** the reference is `unresolved`
- **AND** the finding identifies whether the capability, the requirement or the scenario was not found
- **AND** the finding reports the file and line that declared it

#### Scenario: Renaming a scenario invalidates its references

- **GIVEN** a reference that resolved before a scenario was renamed
- **WHEN** resolution runs against the renamed spec
- **THEN** the reference is `unresolved` and names the scenario segment that is gone
- **AND** the outcome is not softened by matching a similar scenario name
- **AND** no similarity, distance or inference decides any outcome

#### Scenario: Resolution reads only the current main specs

- **GIVEN** a project with active changes under `openspec/changes/`
- **WHEN** references are resolved
- **THEN** only `openspec/specs/**/spec.md` is indexed
- **AND** a scenario that exists only in a change's delta does not resolve
- **AND** archived changes are not indexed

### Requirement: An ambiguous scenario name requires the requirement segment

When a scenario segment matches more than one scenario in a capability, resolution SHALL report the reference as ambiguous and SHALL name the requirement segments available to disambiguate it, rather than choosing one. When an expanded reference is still ambiguous, resolution SHALL report that against the spec, because the convention cannot express the difference.

#### Scenario: An ambiguous short reference lists the choices

- **GIVEN** the reference `cli-change#non-interactive-fallback-keeps-current-behavior`, where two requirements in `cli-change` both declare that scenario
- **WHEN** it is resolved
- **THEN** the reference is `ambiguous`
- **AND** the finding lists the requirement segments `interactive-show-selection` and `interactive-validation-selection`
- **AND** the finding shows the expanded reference to use for each
- **AND** neither candidate is chosen

#### Scenario: An expanded reference that is still ambiguous is a spec problem

- **GIVEN** one requirement declaring two scenarios whose names fold to the same segment
- **WHEN** an expanded reference to that segment is resolved
- **THEN** the reference is `ambiguous`
- **AND** the finding reports it against the capability and requirement, naming both scenarios
- **AND** the finding states that the convention cannot distinguish them

#### Scenario: The canonical reference for a scenario is reported

- **GIVEN** any scenario in the specs
- **WHEN** resolution reports it
- **THEN** the canonical reference for that scenario is the short form when its scenario segment is unique in its capability
- **AND** the expanded form otherwise
- **AND** that canonical reference is reported so an author or agent can copy it into a test
