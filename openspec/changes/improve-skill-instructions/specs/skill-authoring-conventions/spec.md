# skill-authoring-conventions Specification

## Purpose
Define the quality contract every generated OpenSpec agent skill SHALL satisfy, so agents reliably select the right skill, follow it to a known endpoint, recover from failures, and read no more context than the task requires.

## ADDED Requirements

### Requirement: Trigger-Disambiguated Descriptions
Each skill's description SHALL state when to use the skill and SHALL distinguish it from sibling skills whose purpose overlaps, so an agent can choose deterministically when more than one skill could apply.

#### Scenario: Sibling boundary stated
- **WHEN** a skill shares a purpose area with one or more other skills (for example create-a-change: `new-change`, `propose`, `ff-change`, `continue-change`)
- **THEN** its description SHALL name the boundary that distinguishes it from those siblings
- **AND** the distinction SHALL be expressed as an observable condition (what the user wants, or what the skill produces), not by skill name alone

#### Scenario: Every skill has an explicit trigger
- **WHEN** any skill is generated, including the feedback skill
- **THEN** its description SHALL contain an explicit "use when" trigger condition

### Requirement: Canonical Instruction Structure
Each procedural skill SHALL present its instructions using the canonical section taxonomy so structure is consistent and parseable across the skill set.

#### Scenario: Procedural skill sections
- **WHEN** a procedural skill is generated
- **THEN** its instructions SHALL include, in order: a "use when" line, inputs, numbered steps, success criteria, failure-and-recovery guidance, guardrails, and a related-skills reference

#### Scenario: Documented structural variants
- **WHEN** a skill is intentionally non-procedural (a thinking stance or a guided tutorial)
- **THEN** it MAY use a documented variant structure instead of numbered steps
- **AND** it SHALL still declare an explicit completion condition, guardrails, and a related-skills reference

### Requirement: Explicit Success Criteria
Each skill SHALL declare an observable condition that signals successful completion, so an agent can distinguish a finished run from a stalled one.

#### Scenario: Procedural completion condition
- **WHEN** a procedural skill is generated
- **THEN** it SHALL state a "done when" condition expressed as an observable check (for example a status field value, a file existing, or all required artifacts reported complete)
- **AND** the condition SHALL NOT rely on subjective phrasing such as "until finished"

#### Scenario: Non-procedural completion condition
- **WHEN** a stance or tutorial skill is generated
- **THEN** it SHALL state an explicit exit condition that tells the agent when the skill's work is complete

### Requirement: Named Failure Modes And Recovery
Each skill that can pause, block, or error SHALL name those states and SHALL pair each with a concrete recovery action.

#### Scenario: Recovery paired with failure
- **WHEN** a skill describes a pause, blocked, or error state
- **THEN** it SHALL describe the action that resumes or resolves that state
- **AND** the recovery action SHALL be concrete (a command to run, a skill to invoke, or an input to gather), not a generic instruction to "try again"

### Requirement: Single-Source Instruction Generation
A skill and its corresponding command SHALL derive their shared instruction text from one source, so the two cannot drift.

#### Scenario: Skill and command share a source
- **WHEN** a workflow exposes both a skill and a command
- **THEN** the body shared by both SHALL be authored once and reused
- **AND** after removing surface-specific framing (invocation syntax and metadata), the skill body and command body SHALL be identical

#### Scenario: Shared guidance defined once
- **WHEN** guidance is common to multiple skills (store selection, change selection, the artifact-creation loop, the context-and-rules guardrail, or the spec-content guidance)
- **THEN** that guidance SHALL be defined in a single shared location and referenced
- **AND** SHALL NOT be copied inline into individual skills

### Requirement: Lean Always-Loaded Body
Each skill SHALL keep its always-read body within the Agent Skills standard's recommended budget and SHALL move deep reference material to on-demand files, so reading a skill costs no more context than the task requires.

#### Scenario: Body within budget
- **WHEN** a skill's `SKILL.md` body is generated
- **THEN** the body SHALL stay within the recommended budget of under 500 lines (approximately 5000 tokens)
- **AND** a skill whose core procedure plus reference material would exceed the budget SHALL move the reference material out of the body

#### Scenario: Reference material in on-demand files
- **WHEN** a skill includes worked examples or extended reference tables (for example conflict-resolution walkthroughs, a full delta-format reference, or a multi-phase script)
- **THEN** that material SHALL live in a `references/` file beside `SKILL.md` rather than inline in the body
- **AND** the body SHALL link to it with a relative path one level deep
- **AND** an agent SHALL be able to complete the core procedure by reading the body without first reading the reference file

### Requirement: Cross-Skill Navigation
Each skill SHALL reference the related or next skill in the workflow, so multi-step journeys have explicit handoffs.

#### Scenario: Related-skills reference present
- **WHEN** a skill completes its work and a natural next or sibling skill exists
- **THEN** the skill SHALL name that related skill and the condition under which to use it

### Requirement: Embedded Authoring Guidance
Each skill that drafts or updates OpenSpec artifacts SHALL embed the authoring guidance the project docs require but that an agent cannot infer from the workflow procedure alone, so an agent following the skill produces conformant artifacts without being separately instructed. This guidance SHALL be drawn from single shared sources that agree with the project concepts documentation, so the skills and the docs cannot drift.

#### Scenario: Spec content is a behavior contract
- **WHEN** a skill produces or edits a capability spec or spec delta (for example `propose`, `ff-change`, `continue-change`, `sync-specs`)
- **THEN** its instructions SHALL state what belongs in a spec (observable behavior; inputs, outputs, and error conditions; external constraints; testable scenarios) and what to keep out (internal class or function names, library or framework choices, step-by-step implementation, execution plans)

#### Scenario: Right-sized rigor
- **WHEN** a skill guides an agent to write spec requirements
- **THEN** it SHALL convey that a change defaults to lightweight, behavior-first requirements and reserves heavier rigor for higher-risk changes (cross-cutting, contract, migration, or security/privacy), rather than maximizing detail on every change

#### Scenario: Requirement and scenario conventions
- **WHEN** a skill guides an agent to write requirements and scenarios
- **THEN** it SHALL convey the RFC 2119 keyword meanings it uses (MUST/SHALL absolute, SHOULD recommended, MAY optional), that every requirement carries at least one scenario, and that scenarios are concrete, testable, and cover the primary path and its notable edge cases

#### Scenario: Delta conventions
- **WHEN** a skill produces or merges spec deltas
- **THEN** it SHALL convey the delta operation headers (ADDED / MODIFIED / REMOVED / RENAMED) and the reviewer-facing conventions that a MODIFIED requirement shows its prior value and a REMOVED requirement states why

#### Scenario: Guidance shared and aligned with the docs
- **WHEN** any of the above guidance is authored
- **THEN** it SHALL be defined in a single shared source rather than restated inline per skill
- **AND** it SHALL agree with the corresponding project concepts documentation (for example "What a Spec Is (and Is Not)" and the progressive-rigor guidance), so the skills and the docs cannot diverge

### Requirement: Behavior Preservation
Applying these conventions to an existing skill SHALL NOT change the skill's observable workflow behavior; the conventions govern how instructions are written, not what the skill does.

#### Scenario: No behavioral drift from rewrite
- **WHEN** a skill is rewritten to satisfy these conventions
- **THEN** the commands it runs, the artifacts it produces, and the prompts it shows SHALL remain unchanged
- **AND** any success-criteria or failure-recovery text added SHALL describe behavior the skill already performs, not introduce new behavior

#### Scenario: Existing per-skill contracts hold
- **WHEN** a rewritten skill is already governed by a behavioral spec (for example `opsx-verify-skill` or `opsx-archive-skill`)
- **THEN** that spec's requirements and scenarios SHALL continue to pass after the rewrite

### Requirement: Agent Skills Standard Conformance
Each generated skill SHALL be a valid Agent Skills package so it is portable across the agent products and directories that read the standard.

#### Scenario: SKILL.md layout
- **WHEN** a skill is generated
- **THEN** it SHALL be a folder containing a `SKILL.md` file with YAML frontmatter followed by a Markdown body
- **AND** the folder name SHALL equal the frontmatter `name`

#### Scenario: Frontmatter validity
- **WHEN** a skill's frontmatter is generated
- **THEN** `name` SHALL be 1–64 characters, lowercase alphanumeric and hyphens only, with no leading, trailing, or consecutive hyphens
- **AND** `description` SHALL be 1–1024 non-empty characters and state both what the skill does and when to use it
- **AND** `compatibility`, when present, SHALL be at most 500 characters

#### Scenario: Optional fields conform
- **WHEN** the skill includes optional metadata (license, metadata map)
- **THEN** those fields SHALL follow the standard's shape and SHALL NOT introduce fields that violate it

### Requirement: Declared Pre-Approved Tools
Each skill SHALL declare the tools it uses and emit them as the standard's `allowed-tools` frontmatter, so supporting agents pre-approve the deterministic CLI without prompting, and agents that enforce `allowed-tools` as a strict allowlist never block a tool the skill needs.

#### Scenario: allowed-tools generated from a declared set
- **WHEN** a skill is generated
- **THEN** its `allowed-tools` value SHALL be produced from a single declared toolset for that skill, not hand-written per artifact
- **AND** the declared set SHALL be a superset of every tool the skill body uses

#### Scenario: CLI bash pre-approved and narrowly scoped
- **WHEN** a skill invokes the OpenSpec CLI through a shell tool
- **THEN** its `allowed-tools` SHALL pre-approve the OpenSpec CLI invocation scoped to that binary (for example `Bash(openspec:*)`)
- **AND** unrestricted shell access SHALL be declared only for skills that run arbitrary build or test commands (for example the implementation skill)

#### Scenario: Declared tools cover body usage
- **WHEN** the conformance check runs
- **THEN** it SHALL fail if the skill body references a tool that is not in the declared set
- **AND** an agent that ignores `allowed-tools` SHALL still execute the skill correctly

### Requirement: Conformance Validation Gate
Skill generation SHALL validate each emitted skill against this capability and SHALL fail rather than write a non-conformant skill.

#### Scenario: Generation validates output
- **WHEN** `openspec init` or `openspec update` generates skills
- **THEN** each skill SHALL be validated for frontmatter validity, `name` equal to folder, body within budget, resolvable reference links, and declared tools covering body usage
- **AND** a validation failure SHALL stop the operation with an error identifying the skill and the violated rule

#### Scenario: Continuous validation
- **WHEN** the project's checks run in CI
- **THEN** the generated skills SHALL be validated against the standard
- **AND** a non-conformant skill SHALL fail the check
