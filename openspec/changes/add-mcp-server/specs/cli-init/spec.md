# Delta for cli-init

## MODIFIED Requirements
### Requirement: Directory Creation
The command SHALL create the complete OpenSpec directory structure in a hidden directory `.openspec/` to reduce clutter.

#### Scenario: Creating OpenSpec structure
- **WHEN** `openspec init` is executed
- **THEN** create the following directory structure:
```
.openspec/
├── project.md
├── AGENTS.md
├── specs/
└── changes/
    └── archive/
```

### Requirement: Legacy Migration
The `init` command SHALL detect legacy `openspec/` directories and offer to migrate them to `.openspec/`.

#### Scenario: Migrating legacy directory
- **GIVEN** a project with an existing `openspec/` directory
- **AND** no `.openspec/` directory exists
- **WHEN** executing `openspec init`
- **THEN** prompt the user: "Detected legacy 'openspec/' directory. Would you like to migrate it to '.openspec/'?"
- **AND** if confirmed, rename the directory
- **AND** update all managed AI instructions to point to the new location
