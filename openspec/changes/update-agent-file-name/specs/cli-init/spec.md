## MODIFIED Requirements

### Requirement: Directory Creation
The command SHALL create the complete OpenSpec directory structure with all required directories and files.

#### Scenario: Creating OpenSpec structure
- **WHEN** `openspec init` is executed
- **THEN** create the following directory structure:
```
openspec/
├── project.md
├── AGENTS.md
├── specs/
└── changes/
    └── archive/
```

### Requirement: File Generation
The command SHALL generate required template files with appropriate content for immediate use.

#### Scenario: Generating template files
- **WHEN** initializing OpenSpec
- **THEN** generate `AGENTS.md` containing complete OpenSpec instructions for AI assistants
- **AND** generate `project.md` with project context template

### Requirement: AI Tool Configuration Details

#### Scenario: Creating new CLAUDE.md
- **WHEN** CLAUDE.md does not exist
- **THEN** create new file with OpenSpec content wrapped in markers including reference to `@openspec/AGENTS.md`

### Requirement: Success Output

#### Scenario: Displaying success message
- **WHEN** initialization completes successfully
- **THEN** include prompt: "Please explain the OpenSpec workflow from openspec/AGENTS.md and how I should work with you on this project"
