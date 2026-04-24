# Phase 01 Manual Test

## Scenarios Run

- Rebuilt the CLI with `pnpm run build` so the manual pass used the current source tree.
- Ran `node bin/openspec.js --no-color workspace --help` in a fresh temp XDG config/data root with telemetry disabled.
- Ran `node bin/openspec.js --no-color workspace create alpha-team-binmanual` in that same fresh context.
- Inspected the created workspace root on disk, including `.openspec/workspace.yaml`, `.openspec/local.yaml`, `changes/`, and `.gitignore`.
- Re-ran `node bin/openspec.js --no-color workspace create alpha-team-binmanual` to confirm duplicate handling.
- Ran `node bin/openspec.js --no-color workspace create "Alpha Team"` to confirm invalid-name handling.

## Results

- `workspace --help` exposed the `create <name>` entrypoint as expected.
- Successful create produced a managed workspace root under the temporary XDG data directory with:
  - `.openspec/workspace.yaml`
  - `.openspec/local.yaml`
  - `changes/`
  - `.gitignore` containing `/.openspec/local.yaml`
- The created workspace root did not contain `openspec/changes` or any inner `openspec/` repo-local layout.
- `workspace.yaml` stored the workspace name and empty repo registry as expected for a new workspace.
- `local.yaml` stored the local overlay version and an empty `repoPaths` map.
- Re-running `workspace create` with the same name failed cleanly with an actionable duplicate-workspace error and did not mutate the existing workspace.
- Creating a workspace with `Alpha Team` failed cleanly with the expected kebab-case validation error.

## Fixes Applied

- None.

## Residual Risks

- None found within the Phase 01 scope.
- Broader automated command and CLI coverage for `workspace create` still belongs to Phase 02.
