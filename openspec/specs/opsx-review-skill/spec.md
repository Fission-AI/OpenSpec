# opsx-review-skill Specification

## Purpose

Lets a user run a full review–fix cycle over an OpenSpec change before archiving: an iterative loop in which a read-only reviewer audits the implementation against the change's artifacts, a critic challenges the findings and hunts for misses, and surgical fixers resolve confirmed issues until an evidence-backed consensus gate passes.

## Requirements

### Requirement: Review Skill Invocation
The system SHALL provide an `/opsx:review` command and `openspec-review` skill that run the review–critique–implement loop against a selected change.

#### Scenario: Review with change name provided
- **WHEN** agent executes `/opsx:review <change-name>`
- **THEN** the agent runs the review loop for that specific change
- **AND** announces "Reviewing change: <name>" and how to override by naming a different change

#### Scenario: Review without change name
- **WHEN** agent executes `/opsx:review` without a change name
- **THEN** the agent infers the change from conversation context, or auto-selects it when only one active change exists
- **AND** when ambiguous, lists available changes via `openspec list --json` and prompts the user to select one

#### Scenario: Store-scoped review
- **WHEN** the review targets work in a registered standalone store
- **THEN** every openspec command the skill runs for that work carries `--store <id>` for the selected store

### Requirement: Change Context Loading
The skill SHALL build a shared change context block before involving any role, and pass it verbatim to every role.

#### Scenario: Context block assembled
- **WHEN** the change has been selected
- **THEN** the agent reads the change's status and apply instructions via `openspec status --change "<name>" --json` and `openspec instructions apply --change "<name>" --json`
- **AND** reads every artifact named by the status output (proposal, design, delta specs, tasks)
- **AND** the context block names the change, artifact paths, affected modules/paths, and the build and test commands for those modules

### Requirement: Reviewer Role
The skill SHALL instruct a read-only reviewer to audit the implementation against the change artifacts and report findings with evidence.

#### Scenario: Reviewer audit
- **WHEN** the reviewer role is run with the change context block
- **THEN** the reviewer reads every artifact, verifies each delta-spec requirement and scenario against code citing `file:line` evidence, and verifies each task checkbox is backed by implementation and tests
- **AND** runs the build and test commands from the context block and reports failures with the relevant output
- **AND** checks changed files for security issues and regressions against surrounding code
- **AND** reports findings as `MUST-FIX` or `SUGGESTION` entries with `file:line` and evidence, ending with `Verdict: CLEAN` or `Verdict: ISSUES (N must-fix, M suggestions)`

#### Scenario: Reviewer write boundary
- **WHEN** the reviewer role is run
- **THEN** no file is modified, created, or deleted and no mutating command is run by that role

### Requirement: Critic Role
The skill SHALL instruct a read-only critic to challenge each reviewer finding with evidence and to search for missed defects.

#### Scenario: Critic challenge
- **WHEN** the critic role is run with the change context block and the reviewer's findings
- **THEN** the critic marks each reviewer finding `CONFIRMED` or `REJECTED` with evidence (diff, test output, or quoted code)
- **AND** reports missed edge cases, logic gaps, silent failures, regressions, scope creep, and over-engineering
- **AND** classifies every finding as `BLOCKING`, `WARNING`, or `SUGGESTION` with a concrete alternative for each
- **AND** ends with `Verdict: PASS`, `Verdict: WARNING`, or `Verdict: BLOCKING (N blocking, M warnings, K suggestions)`

#### Scenario: Critic write boundary
- **WHEN** the critic role is run
- **THEN** no file is modified by that role

### Requirement: Surgical Fix Roles
The skill SHALL dispatch write-capable fixer roles that resolve exactly one confirmed issue each, with tests green before finishing.

#### Scenario: Implementer fixes a confirmed defect
- **WHEN** a confirmed must-fix issue calls for behavior change, a missing requirement, or a failing test
- **THEN** an implementer role writes or updates the failing test first, then the minimal fix, staying inside the files named in the issue
- **AND** runs the test command from the context block and shows it passing before reporting
- **AND** if the fix would require editing files outside the issue's scope, stops and reports why instead of proceeding

#### Scenario: Simplifier reduces flagged complexity
- **WHEN** a confirmed finding flags over-complexity
- **THEN** a simplifier role makes behavior-preserving cleanup steps (dead code, nesting, duplication, naming), checking usages before removing or renaming anything and never changing exported or public contracts
- **AND** runs the test command from the context block after each step and reverts a step that fails

#### Scenario: Fixers run sequentially on disjoint scopes
- **WHEN** multiple issues are confirmed in one cycle
- **THEN** fixer roles run one at a time, one issue per role, with disjoint file scopes

### Requirement: Consensus Gate
The skill SHALL end the loop only when all four consensus conditions hold on evidence, and SHALL otherwise feed the failing evidence back into the fix step.

#### Scenario: Consensus reached
- **WHEN** the reviewer reports `Verdict: CLEAN` and the critic reports `Verdict: PASS` and `openspec validate --change "<name>" --json` reports the change valid and all tests for the affected modules pass with the build completing without errors
- **THEN** the loop ends and the skill reports consensus REACHED

#### Scenario: Consensus not reached
- **WHEN** any consensus condition fails
- **THEN** the failing evidence is fed back into the fix step and the loop repeats
- **AND** a single clean reviewer pass without the other conditions is not sufficient to end the loop

#### Scenario: Pre-existing failures do not block
- **WHEN** a test or build failure is shown to predate the change
- **THEN** it is noted separately in the report and does not block consensus

### Requirement: Cycle Report
The skill SHALL report the outcome of every cycle and the final readiness verdict.

#### Scenario: Report content
- **WHEN** the loop ends or stops with outstanding items
- **THEN** the report includes a per-cycle table (reviewer verdict, critic verdict, fixes applied)
- **AND** states consensus REACHED or NOT REACHED with outstanding items, a test summary, the validate result, and whether the change is ready for archive

### Requirement: Multi-Change Sequencing
The skill SHALL complete the full loop for one change before starting the loop for another.

#### Scenario: Several changes in scope
- **WHEN** the user asks for review of multiple changes
- **THEN** each change runs its own complete loop to consensus (or a reported stop) before the next begins

### Requirement: Workflow Availability
The review workflow SHALL be available as an opt-in workflow: listed among the workflows a user can enable, and excluded from the default core selection.

#### Scenario: Listed as available
- **WHEN** a user inspects the workflows available for configuration
- **THEN** `review` is listed with the name "Review" and a description of the review–fix cycle

#### Scenario: Core selection excludes review
- **WHEN** a user initializes a project with the default core profile
- **THEN** no `openspec-review` skill and no `/opsx:review` command file is installed

#### Scenario: Custom selection includes review
- **WHEN** the effective workflow selection includes `review`
- **THEN** the `openspec-review` skill and the `/opsx:review` command file are installed for the tools configured to receive them

### Requirement: Skills.sh Distribution Copy
The committed skills.sh copy of the review skill SHALL equal the content the generator produces from the review template, so the published tree stays true to its source.

#### Scenario: Regeneration reproduces the committed copy
- **WHEN** the skill distribution is regenerated with `pnpm build && pnpm generate:skills`
- **THEN** `skills/openspec-review/SKILL.md` is produced byte-for-byte equal to the committed file
- **AND** the committed frontmatter carries the skill name, description, allowed tools, license, compatibility, and author/version metadata without volatile generation fields

#### Scenario: Reference-to-command spellings in the distributed copy
- **WHEN** the skills.sh copy is generated
- **THEN** canonical command references in the template are rewritten to the `/openspec-review` spellings used in the distributed copy

#### Scenario: Parity guard keeps the copy honest
- **WHEN** the repository's generated-distribution parity checks run
- **THEN** the committed review skill file is verified against freshly generated content, and the committed skill directory set equals the set of templates the generator owns
