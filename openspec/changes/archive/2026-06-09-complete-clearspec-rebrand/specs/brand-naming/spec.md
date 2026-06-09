## ADDED Requirements

### Requirement: Generated change-management home is named clearspec

When a user initializes or operates ClearSpec in a project, the change-management home directory SHALL be named `clearspec` (containing `config.yaml`, `specs/`, and `changes/archive/`). All ClearSpec commands, generated skills, generated slash commands, and CLI operations SHALL read from and write to this `clearspec` home, never an `openspec` directory.

#### Scenario: Initializing produces a clearspec home

- **WHEN** a user runs `clearspec init` in a project with no existing ClearSpec home
- **THEN** a directory named `clearspec` is created at the project root
- **AND** it contains `config.yaml`, an empty `specs/` directory, and `changes/archive/`
- **AND** no directory named `openspec` is created

#### Scenario: Commands resolve the clearspec home cross-platform

- **WHEN** any ClearSpec command resolves the change-management home on macOS, Linux, or Windows
- **THEN** the home path is composed with the platform path separator (via `path.join`) ending in the `clearspec` segment
- **AND** the resolved path is correct regardless of operating system

### Requirement: Generated command titles use the CLSX prefix

The slash-command artifacts generated for AI tools SHALL be titled with the `CLSX:` prefix (for example `CLSX: Apply`, `CLSX: Archive`, `CLSX: Propose`, `CLSX: Explore`), never the `OPSX:` prefix.

#### Scenario: Generated command carries a CLSX title

- **WHEN** ClearSpec generates the command artifacts during initialization
- **THEN** each generated command's display title begins with `CLSX:`
- **AND** no generated command title contains `OPSX`

### Requirement: Generated skills are authored by clearpoint

The YAML frontmatter of every skill ClearSpec generates SHALL declare `author: clearpoint`.

#### Scenario: Generated skill declares clearpoint author

- **WHEN** ClearSpec generates a skill file during initialization
- **THEN** the skill's frontmatter `author` field is `clearpoint`
- **AND** no generated skill declares `author: openspec`

### Requirement: ClearSpec uses identifiers distinct from OpenSpec

So that ClearSpec can coexist with a separately installed OpenSpec, all of ClearSpec's ancillary identifiers SHALL use a ClearSpec-specific name rather than an `openspec` name. This includes the global configuration and data directories, the completion opt-out environment variable, the managed-block markers written into shared config files, the checked-in change-metadata filename, and the workspace and context-store metadata directories.

#### Scenario: Global directories use the clearspec name

- **WHEN** ClearSpec resolves its global configuration or data directory on any platform
- **THEN** the resolved directory uses the `clearspec` name (for example `~/.config/clearspec`)
- **AND** does not use an `openspec` directory

#### Scenario: Managed markers and metadata use clearspec naming

- **WHEN** ClearSpec writes a managed block into a shared config file, creates a checked-in change-metadata file, or creates workspace/context-store metadata
- **THEN** the markers are `<!-- CLEARSPEC:START -->` / `<!-- CLEARSPEC:END -->`, the metadata file is `.clearspec.yaml`, and the metadata directories are `.clearspec-workspace` / `.clearspec-store`
- **AND** none of these use an `openspec` name

#### Scenario: Completion opt-out variable is ClearSpec-specific

- **WHEN** a user sets `CLEARSPEC_NO_COMPLETIONS` before installation
- **THEN** ClearSpec skips installing shell completions
- **AND** ClearSpec does not read an `OPENSPEC_NO_COMPLETIONS` variable

### Requirement: ClearSpec never modifies OpenSpec-owned artifacts

ClearSpec SHALL coexist with a separately installed OpenSpec without disturbing it. ClearSpec SHALL NOT read, create, rename, delete, or migrate any file or directory inside an `openspec` directory. A pre-existing `openspec` directory SHALL be left completely untouched.

#### Scenario: Pre-existing openspec directory is preserved

- **GIVEN** a project already contains an `openspec` directory (for example created by the OpenSpec tool)
- **WHEN** the user runs any ClearSpec command, including `clearspec init`
- **THEN** the `openspec` directory and all of its contents are left unchanged
- **AND** ClearSpec operates only within its own `clearspec` home and ClearSpec-owned artifacts

#### Scenario: Both tools coexist in one project

- **GIVEN** a project that has been initialized by both OpenSpec and ClearSpec
- **WHEN** the user runs ClearSpec commands
- **THEN** the `openspec` and `clearspec` directories exist side by side
- **AND** neither tool's operation depends on or alters the other tool's directory
