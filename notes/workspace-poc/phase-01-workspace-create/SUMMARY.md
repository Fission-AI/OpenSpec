# Phase 01 Summary

## Changes Made

- Added `src/commands/workspace.ts` and registered a new `openspec workspace` command group with a `workspace create <name>` entrypoint.
- Added `src/core/workspace/create.ts` to create managed workspace roots under the global OpenSpec data directory at `workspaces/<name>`.
- Added `src/core/setup/bootstrap.ts` and reused it from both `workspace create` and the existing `InitCommand` so writable-target checks and directory bootstrapping stay on one shared setup path.
- `workspace create` now creates a dedicated workspace layout with `.openspec/workspace.yaml`, `.openspec/local.yaml`, and top-level `changes/`, without creating a repo-local `openspec/` tree.
- `workspace create` now writes `/.openspec/local.yaml` into the workspace root `.gitignore` so the local overlay is treated as local-only state.
- Duplicate and invalid workspace names now fail with explicit, actionable errors.

## Tests Performed

- `pnpm run build`
- `pnpm vitest run test/core/init.test.ts test/core/workspace/workspace-sandbox.test.ts test/cli-e2e/workspace/workspace-sandbox-cli.test.ts`
- Fresh CLI smoke in temp XDG config/data roots:
  - `node dist/cli/index.js --no-color workspace create alpha-team-2`
  - repeated create for duplicate handling
  - invalid create with `Alpha Team`

## Results

- Build passed.
- 48 focused Vitest checks passed, including existing init coverage and workspace harness compatibility coverage.
- Fresh CLI smoke created a managed workspace at `XDG_DATA_HOME/openspec/workspaces/alpha-team-2` with:
  - `.openspec/workspace.yaml`
  - `.openspec/local.yaml`
  - `changes/`
  - `.gitignore` containing `/.openspec/local.yaml`
- The created workspace root did not contain `openspec/changes`.
- Re-running against the same name failed explicitly without mutating the workspace.
- Invalid names failed with a workspace-specific kebab-case error.

## Blockers And Next-Step Notes

- No blockers in Phase 01.
- Automated command/unit/e2e coverage for `workspace create` is still intentionally thin and should be expanded in Phase 02.
