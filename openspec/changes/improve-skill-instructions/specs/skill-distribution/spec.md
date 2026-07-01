# skill-distribution Specification

## Purpose
Define a standard-conformant, validated, publishable bundle of the OpenSpec skills and the readiness contract for listing them in a public Agent Skills directory, so agents can discover and install OpenSpec's workflow skills from outside the CLI.

## ADDED Requirements

### Requirement: Standard-Conformant Publishable Bundle
OpenSpec SHALL be able to produce a collection of its skills that is valid against the Agent Skills standard and ready to publish as a unit.

#### Scenario: Bundle contents
- **WHEN** the publishable bundle is produced
- **THEN** it SHALL contain one folder per published skill, each holding a `SKILL.md` and any `references/` files the skill links to
- **AND** every skill in the bundle SHALL satisfy the `skill-authoring-conventions` standard-conformance and body-budget requirements

#### Scenario: Validation precedes publish
- **WHEN** the bundle is assembled
- **THEN** every skill in it SHALL pass standard conformance validation before the bundle is considered publishable
- **AND** a single non-conformant skill SHALL block the bundle

### Requirement: Listing Readiness
The publishable bundle SHALL carry the metadata and pass the checks a public Agent Skills directory expects, so listing is a documented, repeatable step.

#### Scenario: Listing metadata present
- **WHEN** the bundle is prepared for listing
- **THEN** each skill SHALL declare a license and an author in its frontmatter metadata
- **AND** each skill description SHALL state what the skill does and when to use it, in keyword terms a directory's search can match

#### Scenario: Documented submission checklist
- **WHEN** a maintainer prepares to list the skills
- **THEN** a checklist SHALL define the steps: pass standard validation, confirm license and metadata, and submit per the target directory's process
- **AND** the checklist SHALL note that directories apply their own curation or security review outside OpenSpec's control

#### Scenario: Versioned regeneration
- **WHEN** OpenSpec releases a new version that changes skill content
- **THEN** the bundle SHALL be regenerable from the current templates so the listed skills can be refreshed
- **AND** each regenerated skill SHALL carry the generating OpenSpec version in its metadata
