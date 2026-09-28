## Why

`openspec schemas` discovers project-local schemas from the shell's current directory, while commands that consume a schema resolve an authoritative OpenSpec root first. When an explicit store, a local `store:` pointer, or `defaultStore` selects a different root, discovery can recommend a schema that is unavailable where the change will actually be created. Agents currently have to work around this mismatch by resolving a path and trying to change their shell working directory, which is not reliable across supported tools.

## What Changes

- Make `openspec schemas` resolve its project root through the same root-selection contract used by normal OpenSpec commands before listing schemas.
- Add `--store <id>` to `openspec schemas`, including the standard hidden `--store-path` rejection path, so explicit store selection is carried directly by the CLI.
- Honor nearest roots, local `store:` pointers, and global `defaultStore` using existing precedence and diagnostics; do not add a parallel schema-specific root resolver.
- Preserve the successful human and JSON schema-list output shapes and the existing rootless fallback when no root or registered store exists.
- Add CLI regression coverage for explicit stores, declared pointers, global defaults, nearest-root precedence, error handling, and completion metadata.
- Update the shared store-capable command guidance, committed generated skill snapshots, and generated-content parity hashes to name `schemas`, plus the formal CLI and JSON agent-contract references; preserve the existing `propose` compatibility flow while removing its now-false claim that `schemas` cannot accept `--store`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `schema-resolution`: `openspec schemas` resolves and lists schemas from the authoritative OpenSpec root, including explicitly selected and configured stores.

## Impact

- Affected CLI surface: `openspec schemas [--json] [--store <id>]`.
- Affected code: workflow schemas command, CLI option registration, command completion metadata, the shared store-capable command list, and directly affected command-contract documentation.
- Affected tests: a focused schemas command suite plus CLI/completion regression coverage.
- No schema format, selection policy, workflow-specific flow, or change-creation behavior is modified; the only workflow-specific wording change corrects the stale claim that `schemas` cannot accept `--store`.
