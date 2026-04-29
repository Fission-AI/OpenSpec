## ADDED Requirements

### Requirement: External Artifact Output Path

The `openspec instructions <artifact> --change <id>` command SHALL render the artifact's output path using the artifact base directory resolution helper, so artifacts with a `folder` field write to a project-root-relative location rather than the change directory.

The rendered path in both human output (the `Write to:` block) and JSON output (the `outputPath` field) SHALL be the absolute resolved path to the target file (or, for glob `generates` patterns, the resolved base directory followed by the glob).

The command SHALL NOT pre-write, scaffold, overwrite, or otherwise modify any existing file at the resolved path. The instruction text supplied by the schema is the sole mechanism for guiding the agent on whether to read existing files, modify them in place, or add new ones.

#### Scenario: Instructions for external artifact show resolved path
- **WHEN** user runs `openspec instructions adr --change my-change`
- **AND** the `adr` artifact has `folder: "ADR"` and `generates: "*.md"`
- **AND** the project root is `/repo`
- **THEN** the rendered `Write to:` line shows a path under `/repo/ADR/` using the OS path separator
- **AND** the JSON `outputPath` field shows the same resolved path

#### Scenario: Instructions for default artifact unchanged
- **WHEN** user runs `openspec instructions proposal --change my-change`
- **AND** the `proposal` artifact has no `folder` field
- **THEN** the rendered `Write to:` path is `<projectRoot>/openspec/changes/my-change/proposal.md`
- **AND** the path matches the pre-existing behavior exactly

#### Scenario: Instructions on Windows resolve external path with backslash separators
- **WHEN** user runs `openspec instructions adr --change my-change` on Windows
- **AND** the `adr` artifact has `folder: "ADR"`
- **AND** the project root is `C:\\repo`
- **THEN** the rendered output path uses backslash separators (`C:\\repo\\ADR\\...`)

#### Scenario: Existing files at external path are not overwritten
- **WHEN** user runs `openspec instructions adr --change my-change`
- **AND** files already exist at the resolved external folder (e.g., `/repo/ADR/0001-foo.md`)
- **THEN** the command does not write, modify, or remove any file
- **AND** the rendered instruction text is identical to the case where no files exist
- **AND** the agent is responsible for reading existing files per the schema's instruction text
