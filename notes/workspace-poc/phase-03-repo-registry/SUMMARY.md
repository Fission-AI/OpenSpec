# Phase 03 Summary

## Changes made

- Added shared workspace metadata helpers in `src/core/workspace/metadata.ts` so committed workspace state and local overlay state are read and written consistently.
- Added repo registry and doctor logic in `src/core/workspace/registry.ts`.
- Extended `src/commands/workspace.ts` with:
  - `openspec workspace add-repo <alias> <path>`
  - `openspec workspace doctor`
- Kept committed alias registration in `.openspec/workspace.yaml`.
- Kept canonical absolute repo paths in `.openspec/local.yaml`.
- Validated repo registration inputs for:
  - kebab-case alias shape
  - existing directory paths
  - repo-local OpenSpec state via `openspec/`
- Implemented doctor diagnostics for:
  - missing local alias mappings
  - missing repo paths
  - non-canonical local overlay paths
  - extra local-only aliases
  - missing repo-local OpenSpec state

## Tests or research performed

- `pnpm run build`
- `pnpm vitest run test/core/workspace/workspace-create.test.ts test/core/workspace/workspace-sandbox.test.ts test/commands/workspace/create.test.ts test/cli-e2e/workspace/workspace-create-cli.test.ts test/cli-e2e/workspace/workspace-sandbox-cli.test.ts`
- Fresh CLI smoke in temporary XDG roots covering:
  - `workspace create`
  - `workspace add-repo` success with a symlinked repo path
  - duplicate alias failure
  - missing path failure
  - missing `openspec/` failure
  - `workspace doctor` success on a healthy workspace
  - `workspace doctor --json` failure reporting stale path and local-overlay drift without mutating files

## Results

- Build passed.
- Existing workspace regression tests passed: 15/15.
- `workspace add-repo` writes only the alias to `.openspec/workspace.yaml` and only the canonical absolute path to `.openspec/local.yaml`.
- Canonicalization resolved a symlinked repo input to the real absolute path before persistence.
- `workspace doctor` reports missing repos and overlay drift and exits non-zero without rewriting workspace files.
- No absolute repo path leaked into committed workspace metadata during the fresh acceptance run.

## Blockers and next-step notes

- No blockers in Phase 03.
- Phase 04 should add permanent automated coverage for the new registry and doctor behaviors across core, command, and CLI layers.
