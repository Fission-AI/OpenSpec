## Purpose

OpenSpec SHALL support a vendor-neutral shared skills directory for AGENTS-compatible assistants.

## MODIFIED Requirements

### Requirement: AGENTS-compatible installs use the shared `.agents` root
OpenSpec SHALL treat `agents` as a first-class skills target rooted at `.agents`.

#### Scenario: Shared agents install path
- **WHEN** OpenSpec generates skills for `agents`
- **THEN** each generated skill SHALL be written under `.agents/skills/openspec-*/SKILL.md`

#### Scenario: Detect an existing shared agents install
- **WHEN** `.agents/skills/openspec-explore/SKILL.md` exists in the project
- **THEN** OpenSpec detects `agents` as a configured skills target

### Requirement: Legacy tool migrations remain unchanged
OpenSpec SHALL leave `.pi` and `.codex` migration behavior unchanged in this change.

#### Scenario: Existing legacy tools
- **WHEN** a project already uses `.pi` or `.codex`
- **THEN** enabling `agents` does not add new migration or cleanup behavior for those tool roots
