# OPSX TDD Skill Spec

## Purpose

Define the expected behavior for the `/opsx:tdd` skill, which converts a change's `tests.md` artifact into failing test skeletons before implementation begins. This enforces a test-first gate between `opsx:propose` and `opsx:apply`.

## Requirements

### Requirement: OPSX TDD Skill

The system SHALL provide an `/opsx:tdd` skill that writes failing test skeletons from the `tests.md` artifact, confirms RED status, and marks the tests artifact done before `opsx:apply` begins.

#### Scenario: tests.md not found

- **WHEN** agent executes `/opsx:tdd` with a change name
- **AND** `openspec/changes/<name>/tests.md` does not exist
- **THEN** display warning: "`tests.md` not found for change <name>. Was this change proposed with opsx:propose?"
- **AND** stop execution

#### Scenario: Automated section absent

- **WHEN** agent reads `tests.md`
- **AND** no `## Automated` section exists
- **THEN** display warning: "tests.md has no Automated section — nothing to write. Add scenarios to tests.md first."
- **AND** stop execution

#### Scenario: Zero scenarios in Automated section

- **WHEN** agent reads `tests.md`
- **AND** `## Automated` section exists but contains zero scenarios
- **THEN** display warning: "tests.md Automated section has no scenarios — nothing to write."
- **AND** stop execution

#### Scenario: Successful test skeleton generation

- **WHEN** agent executes `/opsx:tdd` for a change with Automated scenarios in `tests.md`
- **THEN** agent writes a failing test skeleton for each scenario
- **AND** each skeleton uses forced RED: `expect(true).toBe(false)`
- **AND** agent does NOT write real assertions (those are written during `opsx:apply`)
- **AND** agent runs `bun test --run <file>` for each written file
- **AND** agent confirms each new test is RED (failing)
- **AND** agent reports count of tests written, RED count, and unexpected passes

#### Scenario: Test passes immediately (unexpected)

- **WHEN** agent runs tests after writing skeletons
- **AND** a new test passes without implementation
- **THEN** display warning: "WARNING: test '<name>' passes without implementation — scenario may already be covered or the test is wrong. Review before proceeding."

#### Scenario: Mark tests artifact done

- **WHEN** all test skeletons are written and confirmed RED
- **THEN** agent marks tests artifact done via `openspec done tests --change "<name>"`
- **AND** if command fails (artifact not in schema), skip silently

#### Scenario: Existing describe block in target file

- **WHEN** target test file already contains a `describe` block with the exact matching name
- **THEN** agent appends new `it()` blocks inside the existing describe block
- **AND** does NOT create a duplicate describe block

### Requirement: tests.md Artifact in opsx:propose

The `opsx:propose` skill SHALL generate a `tests.md` artifact after all `applyRequires` artifacts are complete.

#### Scenario: tests.md generated from BDD scenarios

- **WHEN** `opsx:propose` completes all required artifacts
- **AND** `proposal.md` or `design.md` contains BDD scenarios or acceptance criteria
- **THEN** agent generates `openspec/changes/<name>/tests.md`
- **AND** `tests.md` contains an `## Automated` section with scenario groups
- **AND** each scenario group declares `File:`, `Describe:`, and `Scenarios:` fields
- **AND** `tests.md` contains a `## Manual` section for non-automatable behaviors
- **AND** each scenario maps to exactly one `it()` block
- **AND** agent shows progress: "Created tests.md"
- **AND** agent does NOT ask the user for input during generation

#### Scenario: No BDD scenarios found

- **WHEN** `opsx:propose` completes all required artifacts
- **AND** neither `proposal.md` nor `design.md` contains BDD scenarios or acceptance criteria
- **THEN** agent generates `tests.md` with a `## Manual` section only
- **AND** includes HTML comment: `<!-- No automatable scenarios found — add scenarios before running opsx:tdd -->`

#### Scenario: File path derivation — page component

- **WHEN** the change affects a page component (e.g. `app/(innerPages)/foo/page.tsx`)
- **THEN** `File:` in `tests.md` is `app/(innerPages)/foo/page.test.tsx`

#### Scenario: File path derivation — non-page source

- **WHEN** the change affects a non-page source file (query hook, utility, shared lib)
- **THEN** `File:` in `tests.md` mirrors the source path with `.test` inserted before the extension
- **EXAMPLE** `lib/queries/players.ts` → `lib/queries/players.test.ts`

### Requirement: TDD Guard in opsx:apply

The `opsx:apply` skill SHALL check for `tests.md` before beginning implementation.

#### Scenario: tests.md absent — proceed silently

- **WHEN** `opsx:apply` is invoked
- **AND** `openspec/changes/<name>/tests.md` does not exist
- **THEN** proceed with implementation silently (backward compatible — change was proposed without TDD mode)

#### Scenario: tests artifact done — proceed

- **WHEN** `opsx:apply` is invoked
- **AND** `tests.md` exists
- **AND** tests artifact status is `"done"`
- **THEN** proceed with implementation (tests are written; implement to make them GREEN)

#### Scenario: tests artifact not done — warn and prompt

- **WHEN** `opsx:apply` is invoked
- **AND** `tests.md` exists
- **AND** tests artifact status is any value other than `"done"` (e.g. `"pending"`, `"ready"`, `"in_progress"`)
- **THEN** display: "⚠️ tests.md found but tests not yet written for change <name>. Run `/opsx:tdd` first to write failing tests before implementing."
- **AND** prompt user with options: `["Yes, proceed without tests", "No, I'll run opsx:tdd first"]`
- **AND** if user chooses "Yes, proceed without tests" → proceed
- **AND** if user chooses "No" → stop and remind: "Run `/opsx:tdd <name>` to write tests first."

#### Scenario: tests artifact not in schema — proceed silently

- **WHEN** `opsx:apply` is invoked
- **AND** `tests.md` exists
- **AND** the `tests` artifact ID is not present in the change's schema
- **THEN** treat as "not applicable" and proceed silently
