## Why

The enpalspec product is a fork of openspec with its own CLI binary, default schema, and skill command namespace. Establishing a distinct package identity and command prefix (`enpalspec`) separates enpalspec from the upstream openspec tool, enabling independent versioning and distribution while keeping the underlying implementation intact.

## What Changes

- **BREAKING** Rename npm package from `@fission-ai/openspec` to the enpalspec package name
- **BREAKING** Rename CLI binary from `openspec` to `enpalspec`
- Change `DEFAULT_SCHEMA` from `spec-driven` to `enpal-spec-driven` in the init command
- Change slash command prefix from `opsx` to `enpalspec` in all generated command files (`.claude/commands/enpalspec/`, `.cursor/commands/enpalspec-*`, `.windsurf/workflows/enpalspec-*`)
- Internal folder names, source code structure, and documentation continue to reference "openspec" — no change

## Capabilities

### New Capabilities

- `enpalspec-binary`: The `enpalspec` bin entry in `package.json` replacing `openspec`; package renamed to enpalspec identity

### Modified Capabilities

- `command-generation`: Command file path patterns change from `opsx` prefix to `enpalspec` for all tool adapters (Claude, Cursor, Windsurf)
- `cli-init`: Default schema written to `openspec/config.yaml` on init changes from `spec-driven` to `enpal-spec-driven`

## Impact

- `package.json`: `name`, `description`, `homepage`, `repository.url`, `bin` key
- `src/core/init.ts`: `DEFAULT_SCHEMA` constant
- `src/core/command-generation/`: adapter path patterns for Claude, Cursor, Windsurf
- `src/core/templates/workflows/`: any hardcoded `opsx` references in workflow skill bodies
- Existing projects using `openspec` CLI are unaffected (different binary name)
- Projects re-initialised with `enpalspec init` will get `enpalspec:*` commands instead of `opsx:*`
