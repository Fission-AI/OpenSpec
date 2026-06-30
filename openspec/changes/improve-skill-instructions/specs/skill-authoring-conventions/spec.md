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
- **AND** the two artifacts SHALL differ only in surface-specific framing (invocation syntax and metadata)

#### Scenario: Shared guidance defined once
- **WHEN** guidance is common to multiple skills (store selection, change selection, the artifact-creation loop, or the context-and-rules guardrail)
- **THEN** that guidance SHALL be defined in a single shared location and referenced
- **AND** SHALL NOT be copied inline into individual skills

### Requirement: Lean Always-Loaded Body
Each skill SHALL keep its always-read body focused on the core procedure and SHALL separate deep reference material, so reading a skill costs no more context than the task requires.

#### Scenario: Reference material separated
- **WHEN** a skill includes worked examples or extended reference tables (for example conflict-resolution walkthroughs, a full delta-format reference, or a multi-phase script)
- **THEN** that material SHALL be in a clearly separated section distinct from the core procedure
- **AND** the core procedure SHALL be readable without consuming the reference material

### Requirement: Cross-Skill Navigation
Each skill SHALL reference the related or next skill in the workflow, so multi-step journeys have explicit handoffs.

#### Scenario: Related-skills reference present
- **WHEN** a skill completes its work and a natural next or sibling skill exists
- **THEN** the skill SHALL name that related skill and the condition under which to use it
