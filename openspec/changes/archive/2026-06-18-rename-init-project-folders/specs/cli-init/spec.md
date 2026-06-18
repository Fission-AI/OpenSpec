## MODIFIED Requirements

### Requirement: Directory Creation

The command SHALL create the ClearSpec directory structure with config file, including dedicated folders for project inputs and outputs.

#### Scenario: Creating ClearSpec structure

- **WHEN** `clearspec init` is executed
- **THEN** create the following directory structure:
```
clearspec/
├── config.yaml
├── specs/
├── changes/
│   └── archive/
├── requirements/
├── context/
├── code/
└── spec-packs/
```

#### Scenario: Creating project folders in extend mode

- **GIVEN** a `clearspec/` directory already exists
- **WHEN** `clearspec init` is executed and enters extend mode
- **THEN** ensure `requirements/`, `context/`, `code/`, and `spec-packs/` exist under `clearspec/`
- **AND** preserve any content already present in those folders

#### Scenario: Creating project folders regardless of tool selection

- **WHEN** `clearspec init` is run with `--tools none`
- **THEN** create the `clearspec/` base structure including `requirements/`, `context/`, `code/`, and `spec-packs/`
- **AND** skip skill and command generation

#### Scenario: Cross-platform folder paths

- **WHEN** the command creates the project folders on macOS, Linux, or Windows
- **THEN** resolve each folder path relative to the `clearspec/` directory using the platform path separator
- **AND** create each folder successfully without assuming forward-slash separators
