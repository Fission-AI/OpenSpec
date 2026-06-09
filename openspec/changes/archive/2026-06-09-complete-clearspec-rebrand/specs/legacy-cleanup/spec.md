## MODIFIED Requirements

### Requirement: Legacy artifact detection

The system SHALL detect legacy ClearSpec artifacts from previous init versions. The system SHALL only detect artifacts it can attribute to ClearSpec via ClearSpec markers, and SHALL NOT treat any `openspec`-named file or directory as a legacy artifact, since such artifacts may belong to a separately installed OpenSpec.

#### Scenario: Detecting legacy config files

- **WHEN** running `clearspec init` on an existing project
- **THEN** the system SHALL check for config files with ClearSpec markers:
  - `CLAUDE.md`
  - `.cursorrules`
  - `.windsurfrules`
  - `.clinerules`
  - `.kilocode_rules`
  - `.github/copilot-instructions.md`
  - `.amazonq/instructions.md`
  - `CODEBUDDY.md`
  - `IFLOW.md`
  - And all other tool config files from the legacy ToolRegistry

#### Scenario: Detecting legacy ClearSpec structure files

- **WHEN** running `clearspec init` on an existing project
- **THEN** the system SHALL check only for a root `AGENTS.md` that contains ClearSpec markers
- **AND** the system SHALL NOT inspect any `openspec` directory or its contents

### Requirement: Surgical removal of config file content

The system SHALL preserve user content when removing ClearSpec markers from config files. The system SHALL only remove blocks delimited by ClearSpec markers and SHALL NOT remove blocks delimited by OpenSpec markers, which may belong to a separately installed OpenSpec.

#### Scenario: Config file with only ClearSpec content

- **WHEN** a config file contains only a ClearSpec marker block (whitespace outside is acceptable)
- **THEN** the system SHALL remove the ClearSpec marker block
- **AND** preserve the file (even if empty or whitespace-only)
- **AND** NOT delete the file (config files belong to the user's project root)

#### Scenario: Config file with mixed content

- **WHEN** a config file contains content outside ClearSpec markers
- **THEN** the system SHALL remove only the `<!-- CLEARSPEC:START -->` to `<!-- CLEARSPEC:END -->` block
- **AND** preserve all content before and after the markers
- **AND** clean up any resulting double blank lines
- **AND** never remove an `<!-- OPENSPEC:START -->` to `<!-- OPENSPEC:END -->` block

#### Scenario: Root AGENTS.md with mixed content

- **WHEN** root `AGENTS.md` contains ClearSpec markers AND other content
- **THEN** the system SHALL remove only the ClearSpec marker block
- **AND** preserve the rest of the file

## REMOVED Requirements

### Requirement: Legacy directory removal

**Reason**: The legacy directories targeted by this requirement (e.g. `.claude/commands/openspec/`) and the legacy `openspec/AGENTS.md` file are `openspec`-named artifacts. Because ClearSpec must coexist with a separately installed OpenSpec, ClearSpec no longer deletes any `openspec`-named directory or file — doing so could destroy a working OpenSpec installation.

**Migration**: Users upgrading from a ClearSpec version that stored output under `openspec`-named paths may delete those stale directories manually if they are certain no OpenSpec installation owns them. ClearSpec's current command output lives under `.<tool>/commands/clsx/`, which is unaffected.

### Requirement: project.md migration hint

**Reason**: This requirement inspected `openspec/project.md` and emitted a migration hint, which requires reading inside an `openspec` directory. Under the coexistence guarantee, ClearSpec no longer reads any `openspec` path.

**Migration**: Project context is configured in `clearspec/config.yaml`'s `context:` field. Users with content in a legacy `openspec/project.md` may copy it into `clearspec/config.yaml` manually.
