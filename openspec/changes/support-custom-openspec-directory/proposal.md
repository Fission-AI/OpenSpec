## Why

OpenSpec can select a standalone store anywhere on disk, but a normal project still has to keep its complete `openspec/` directory at the workspace root. This blocks teams that must place tool-owned content under an existing hierarchy such as `ai/openspec/`, even though the canonical root-selection layer already proves that commands can operate on planning data outside the current directory.

## What Changes

- Add `OPENSPEC_DIR` as an explicit, process-scoped selection of the complete OpenSpec directory.
- Make the canonical root result distinguish the workspace root, where project-local agent integrations live, from the OpenSpec directory, where config, schemas, specs, and changes live.
- Route every shipped CLI command and generated workflow through that canonical directory instead of reconstructing `<root>/openspec` locally.
- Preserve stores as standalone registered planning roots: a store still resolves to `<store root>/openspec`, but it uses the same directory-aware result as a normal or customized project.
- Keep existing root selection, filesystem behavior, and human output unchanged when `OPENSPEC_DIR` is unset or empty; retain every existing JSON field and meaning while adding the authoritative directory field.
- Reject invalid or conflicting custom-directory selection before reading or writing files, with the selected directory visible in human and JSON provenance.

## Capabilities

### New Capabilities

- `custom-openspec-directory`: Environment-based selection, precedence, diagnostics, provenance, and command parity for a relocated complete OpenSpec directory.

### Modified Capabilities

- `cli-init`: Initialize planning files in the selected OpenSpec directory while keeping project-local agent integrations at the requested workspace root.
- `cli-update`: Refresh planning instructions in the selected OpenSpec directory and agent integrations at the workspace root.
- `config-loading`: Load project configuration from the selected OpenSpec directory.
- `schema-resolution`: Resolve project-local schemas from the selected OpenSpec directory.
- `ai-tool-paths`: Keep project-local tool paths anchored to the workspace when planning files are relocated.

## Impact

- Root contract: `ResolvedOpenSpecRoot`, `PlanningHome`, human root banners, and JSON root output gain an authoritative OpenSpec-directory path and environment provenance.
- CLI: `init`, `update`, normal root-scoped commands, config/schema commands, view, doctor, and deprecated-but-shipped command paths must share the same directory resolution.
- Generated content: workflow templates and GitHub Copilot agent files must consume the resolved directory rather than assume `openspec/` beneath the process working directory.
- Tests and docs: cross-platform path, symlink identity, precedence, store parity, JSON, init/update, and generated-content parity coverage; CLI and agent-contract documentation; a minor changeset.
- No new project file, registry format, dependency, directory scan, or `specsPath`-style partial layout is introduced.
