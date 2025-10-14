## ADDED Requirements
### Requirement: Quick Reference Placement
The AI instructions SHALL begin with a quick-reference section that surfaces required file structures, templates, and formatting rules before any narrative guidance.

#### Scenario: Loading templates at the top
- **WHEN** `openspec/AGENTS.md` is regenerated or updated
- **THEN** the first substantive section after the title SHALL provide copy-ready headings for `proposal.md`, `tasks.md`, spec deltas, and scenario formatting
- **AND** link each template to the corresponding workflow step for deeper reading

### Requirement: Embedded Templates and Examples
`openspec/AGENTS.md` SHALL include complete copy/paste templates and inline examples exactly where agents make corresponding edits.

#### Scenario: Providing file templates
- **WHEN** authors reach the workflow guidance for drafting proposals and deltas
- **THEN** provide fenced Markdown templates that match the required structure (`## Why`, `## ADDED Requirements`, `#### Scenario:` etc.)
- **AND** accompany each template with a brief example showing correct header usage and scenario bullets

### Requirement: Pre-validation Checklist
`openspec/AGENTS.md` SHALL offer a concise pre-validation checklist that highlights common formatting mistakes before running `openspec validate`.

#### Scenario: Highlighting common validation failures
- **WHEN** a reader reaches the validation guidance
- **THEN** present a checklist reminding them to verify requirement headers, scenario formatting, and delta sections
- **AND** include reminders about at least `#### Scenario:` usage and descriptive requirement text before scenarios

### Requirement: Progressive Disclosure of Workflow Guidance
The documentation SHALL separate beginner essentials from advanced topics so newcomers can focus on core steps without losing access to advanced workflows.

#### Scenario: Organizing beginner and advanced sections
- **WHEN** reorganizing `openspec/AGENTS.md`
- **THEN** keep an introductory section limited to the minimum steps (scaffold, draft, validate, request review)
- **AND** move advanced topics (multi-capability changes, archiving details, tooling deep dives) into clearly labeled later sections
- **AND** provide anchor links from the quick-reference to those advanced sections
