## Why

Currently, the schema (workflow type) must be passed via `--schema` flag on every experimental workflow command. This is repetitive and error-prone. Agents have no way to know which schema a change uses, so they default to `spec-driven` and cannot leverage alternative workflows like `tdd`.

## What Changes

**Scope: Experimental artifact workflow only** (`openspec new change`, `openspec status`, `openspec instructions`, `openspec templates`)

- Store schema choice in `.openspec.yaml` metadata file when creating a change via `openspec new change`
- Auto-detect schema from metadata in experimental workflow commands
- Make `--schema` flag optional (override only, metadata takes precedence)
- Add `--schema` option to `openspec new change` command

**Not affected**: Legacy commands (`openspec validate`, `openspec archive`, `openspec list`, `openspec show`)

## Capabilities

### New Capabilities
- `change-metadata`: Reading/writing per-change metadata files

### Modified Capabilities
- `cli-artifact-workflow`: Commands auto-detect schema from change metadata

## Impact

- **Affected code**: `src/utils/change-utils.ts`, `src/core/artifact-graph/instruction-loader.ts`, `src/commands/artifact-workflow.ts`
- **Agent skills**: Can be simplified - no longer need to pass schema explicitly
- **Backward compatible**: Changes without `.openspec.yaml` fall back to `spec-driven` default
- **Isolation**: All changes contained within experimental workflow code; legacy commands untouched
