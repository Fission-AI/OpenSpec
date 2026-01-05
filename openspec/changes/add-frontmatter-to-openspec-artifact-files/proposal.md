## Why

Artifact files (proposal.md, design.md, spec.md, tasks.md) lack machine-readable metadata. Adding frontmatter enables tooling to identify artifact types without relying on file paths or parsing content structure.

## What Changes

- Add YAML frontmatter to artifact templates with `artifact: <type>` field
- Update artifact detection logic to optionally read frontmatter for artifact type identification
- Templates in `schemas/*/templates/*.md` will include frontmatter block

## Capabilities

### New Capabilities

- `artifact-frontmatter`: YAML frontmatter support for artifact files, including schema definition and parsing

### Modified Capabilities

- `artifact-graph`: Update state detection to recognize files with frontmatter as valid artifacts
- `instruction-loader`: Include frontmatter in generated templates

## Impact

- Schema template files (`schemas/*/templates/*.md`)
- Artifact detection in `src/artifact-graph/` (state detection logic)
- Instruction generation in `src/instruction-loader/`
- Existing artifact files in changes will remain valid (frontmatter is optional)
