## ADDED Requirements

### Requirement: Spec document title as canonical display title

A spec's document title SHALL be the first level-1 heading (`# H1`) in the spec file. This title SHALL be the canonical display title for the spec and SHALL be exposed in list output and APIs (e.g. when listing specs with a detail option). When the document has no level-1 heading or it cannot be parsed, the spec id (directory name) SHALL be used as the display title. Required sections (Purpose, Requirements) SHALL remain unchanged.

#### Scenario: Document with H1

- **WHEN** a spec file has a first level-1 heading (e.g. `# List Command Specification`)
- **THEN** that heading text SHALL be used as the spec's display title
- **AND** tooling that exposes spec titles (e.g. list with detail) SHALL show this title

#### Scenario: Document without H1

- **WHEN** a spec file has no level-1 heading (e.g. only `## Purpose`, `## Requirements`)
- **THEN** the spec id (capability directory name) SHALL be used as the display title
- **AND** tooling that exposes spec titles SHALL show the spec id
