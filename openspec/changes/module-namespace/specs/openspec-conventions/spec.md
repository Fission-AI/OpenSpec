# OpenSpec Conventions Specification — Delta

## MODIFIED Requirements

### Requirement: Project Structure

An OpenSpec project SHALL maintain a consistent directory structure for specifications and changes. Specs MAY be organized in nested directory hierarchies. When modules are configured, specs are distributed across module boundaries.

#### Scenario: Initializing project structure (single module)

- **WHEN** an OpenSpec project is initialized without module configuration
- **THEN** it SHALL have this structure:
```
openspec/
├── config.yaml             # Project config (optional)
├── specs/                  # Current deployed capabilities
│   └── [capability]/       # Single, focused capability (may be nested)
│       └── spec.md         # WHAT and WHY
└── changes/                # Proposed changes
    ├── [change-name]/      # Descriptive change identifier
    │   ├── proposal.md     # Why, what, and impact
    │   ├── tasks.md        # Implementation checklist
    │   ├── design.md       # Technical decisions (optional)
    │   └── specs/          # Delta specs
    │       └── [capability-path]/
    │           └── spec.md # Delta operations (ADDED/MODIFIED/REMOVED/RENAMED)
    └── archive/            # Completed changes
        └── YYYY-MM-DD-[name]/
```

#### Scenario: Initializing project structure with modules

- **WHEN** an OpenSpec project uses module configuration
- **THEN** the root project has:
```
openspec/
├── config.yaml             # Module registry (module, modules fields)
├── specs/                  # This module's specs (if any)
│   └── [capability-path]/
│       └── spec.md
└── changes/                # Changes (may span modules)
    └── [change-name]/
        └── specs/
            ├── [module]/           # Module-prefixed delta specs
            │   └── [capability]/
            │       └── spec.md
            └── [capability]/       # Current-module delta specs (no prefix)
                └── spec.md
```
- **AND** each referenced module location contains its own `openspec/specs/` directory

#### Scenario: Nested capability paths in specs directory

- **WHEN** specs are organized hierarchically
- **THEN** the capability path MAY include intermediate grouping directories:
```
specs/
├── auth/                   # Grouping directory
│   ├── oauth/spec.md       # Capability: auth/oauth
│   └── session/spec.md     # Capability: auth/session
└── billing/spec.md         # Capability: billing
```
- **AND** the capability name is the full relative path from the spec root to the directory containing `spec.md`

### Requirement: Capability Naming

Capabilities SHALL use clear, descriptive names following consistent conventions, and MAY be organized in nested hierarchies.

#### Scenario: Naming conventions

- **WHEN** naming a capability
- **THEN** it SHALL use verb-noun patterns (e.g., `user-auth`, `payment-capture`)
- **AND** each path segment SHALL use hyphenated lowercase names
- **AND** each capability SHALL have singular focus (one responsibility per capability)
- **AND** capability names MAY include forward-slash-separated path segments for organizational grouping (e.g., `auth/oauth`, `checkout/web`)

### Requirement: Archive Process Enhancement

The archive process SHALL programmatically apply delta changes to current specifications using header-based matching, supporting both nested capability paths and module-qualified delta specs.

#### Scenario: Archiving changes with deltas

- **WHEN** archiving a completed change
- **THEN** the archive command SHALL:
  1. Discover all delta specs recursively under `changes/{name}/specs/`
  2. For each delta spec, determine the target: if the first path segment matches a registered module name, target that module's spec root; otherwise target the current module's spec root
  3. Parse RENAMED sections first and apply renames
  4. Parse REMOVED sections and remove by normalized header match
  5. Parse MODIFIED sections and replace by normalized header match (using new names if renamed)
  6. Parse ADDED sections and append new requirements
- **AND** validate that all MODIFIED/REMOVED headers exist in current spec
- **AND** validate that ADDED headers don't already exist
- **AND** generate the updated spec in the appropriate module's specs directory
- **AND** skip delta specs targeting read-only (remote) modules with a warning

#### Scenario: Handling conflicts during archive

- **WHEN** delta changes conflict with current spec state
- **THEN** the archive command SHALL report specific conflicts including the module and full capability path
- **AND** require manual resolution before proceeding
- **AND** provide clear guidance on resolving conflicts
