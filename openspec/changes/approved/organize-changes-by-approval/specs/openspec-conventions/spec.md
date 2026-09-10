## MODIFIED Requirements

### Requirement: Project Structure
An OpenSpec project SHALL maintain a consistent directory structure for specifications and changes, using native filesystem paths on Windows, macOS, and Linux.

#### Scenario: Initializing project structure
- **WHEN** an OpenSpec project is initialized
- **THEN** its change organization SHALL have this structure:
```text
openspec/
├── specs/
│   └── <capability-path>/
│       ├── spec.md
│       └── design.md          # Optional capability design
└── changes/
    ├── proposed/              # Awaiting approval
    │   └── <change-name>/
    ├── approved/              # Approved for implementation
    │   └── <change-name>/
    └── archive/               # Archived changes
        └── YYYY-MM-DD-<name>/
```
- **AND** change directories contain their schema's planning artifacts, including proposal, tasks, optional design, and delta specs for the default workflow
- **AND** project context and agent instruction files follow the existing initialization rules

#### Scenario: Existing flat changes
- **WHEN** a project contains `changes/<change-name>/` from an earlier version
- **THEN** it remains a supported legacy location until explicitly moved by approval or archive
