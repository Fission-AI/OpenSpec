# CLI Init Specification Changes

## MODIFIED Requirements

### Requirement: Directory Creation
The command SHALL create the complete OpenSpec directory structure with all required directories and files, including `.gitkeep` files to ensure empty directories are tracked by Git.

#### Scenario: Creating OpenSpec structure
- **WHEN** `openspec init` is executed
- **THEN** create the following directory structure:
```
openspec/
├── project.md
├── AGENTS.md
├── specs/
│   └── .gitkeep
└── changes/
    ├── .gitkeep
    └── archive/
        └── .gitkeep
```
- **AND** each `.gitkeep` file SHALL be an empty file that forces Git to track the directory

#### Scenario: Preserving empty directories in Git
- **WHEN** a user commits and pushes the OpenSpec structure to a Git repository
- **THEN** the `specs/`, `changes/`, and `changes/archive/` directories SHALL persist in the repository
- **AND** after cloning the repository, all three directories SHALL exist
- **AND** `openspec list` SHALL work immediately without manual directory creation

#### Scenario: Working with fresh clones
- **GIVEN** a repository initialized with OpenSpec
- **WHEN** a new team member clones the repository
- **THEN** running `openspec list` SHALL succeed without errors
- **AND** no manual directory creation SHALL be required
