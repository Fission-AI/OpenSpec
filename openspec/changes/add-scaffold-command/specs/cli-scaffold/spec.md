## ADDED Requirements
### Requirement: Scaffolding Command Registration
The CLI SHALL expose an `openspec scaffold <change-id>` command that validates the change identifier before generating files.

#### Scenario: Registering scaffold command
- **WHEN** a user runs `openspec scaffold add-user-notifications`
- **THEN** the CLI SHALL reject invalid identifiers (non kebab-case) before proceeding
- **AND** display usage documentation via `openspec scaffold --help`
- **AND** exit with code 0 after successful scaffolding

### Requirement: Change Directory Structure
The scaffold command SHALL create the standard change workspace (if it does not already exist) with proposal, tasks, optional design, and `specs/` directories laid out according to OpenSpec conventions.

#### Scenario: Generating change workspace
- **WHEN** scaffolding a new change with id `add-user-notifications`
- **THEN** create `openspec/changes/add-user-notifications/` if it does not exist
- **AND** copy the default template bundle (proposal, tasks, design placeholders) into that directory in a single operation
- **AND** create an empty `openspec/changes/add-user-notifications/specs/` directory ready for capability-specific deltas that will be authored later

### Requirement: Template Content Guidance
The scaffold command SHALL populate generated Markdown files with OpenSpec-compliant templates so authors can copy, edit, and pass validation without reformatting.

#### Scenario: Populating proposal and tasks templates
- **WHEN** the scaffold command writes `proposal.md`
- **THEN** include the `## Why`, `## What Changes`, and `## Impact` headings with placeholder guidance text
- **AND** ensure `tasks.md` starts with `## 1. Implementation` and numbered checklist items using `- [ ]` syntax
- **AND** annotate optional sections (like `design.md`) with inline TODO comments so users understand when to keep or delete them
- **AND** include a short reminder inside `specs/README.md` (or similar) instructing authors to add deltas once they know the affected capability

### Requirement: Idempotent Execution
The scaffold command SHALL be safe to rerun, preserving user edits while filling in any missing managed sections.

#### Scenario: Rerunning scaffold on existing change
- **WHEN** the command is executed again for an existing change directory containing user-edited files
- **THEN** leave existing content untouched except for managed placeholder regions or missing files that need creation
- **AND** update the filesystem summary to highlight which files were skipped, created, or refreshed
