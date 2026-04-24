# Phase 05 Summary

## Changes made

- Added workspace-aware change creation in [src/commands/workflow/new-change.ts](/Users/tabishbidiwale/fission/repos/openspec/src/commands/workflow/new-change.ts) so `openspec new change <id> --targets <a,b,c>` now detects managed workspaces, requires explicit targets there, and still preserves the existing repo-local path outside a workspace.
- Added [src/core/workspace/change-create.ts](/Users/tabishbidiwale/fission/repos/openspec/src/core/workspace/change-create.ts) to:
  - parse and validate `--targets`
  - reject duplicate or unknown aliases before writing anything
  - create workspace changes under `changes/<id>/`
  - scaffold `proposal.md`, `design.md`, `tasks/coordination.md`, and per-target `targets/<alias>/tasks.md` plus `targets/<alias>/specs/`
- Extended change metadata in [src/core/artifact-graph/types.ts](/Users/tabishbidiwale/fission/repos/openspec/src/core/artifact-graph/types.ts) and reused the shared metadata writer so workspace changes persist explicit `targets` in `.openspec.yaml`.
- Added `findWorkspaceRoot()` in [src/core/workspace/registry.ts](/Users/tabishbidiwale/fission/repos/openspec/src/core/workspace/registry.ts) so the command can detect workspace topology without disturbing the existing registry and doctor flows.
- Extracted schema resolution into [src/utils/change-utils.ts](/Users/tabishbidiwale/fission/repos/openspec/src/utils/change-utils.ts) so repo-local and workspace change creation both resolve schemas through the same path.
- Updated [src/cli/index.ts](/Users/tabishbidiwale/fission/repos/openspec/src/cli/index.ts) to expose `--targets` on `openspec new change`.
- Clarified the `openspec new change --help` text in [src/cli/index.ts](/Users/tabishbidiwale/fission/repos/openspec/src/cli/index.ts) so `--description` no longer incorrectly promises a `README.md` write for workspace-targeted changes.
- Expanded [test/utils/change-metadata.test.ts](/Users/tabishbidiwale/fission/repos/openspec/test/utils/change-metadata.test.ts) so shared metadata coverage now includes persisted target aliases and duplicate-target rejection.

## Tests or research performed

- `pnpm run build`
- `pnpm vitest run test/utils/change-metadata.test.ts test/utils/change-utils.test.ts test/core/workspace/registry.test.ts`
- `node dist/cli/index.js new change --help`
- Fresh isolated CLI smoke on 2026-04-17 (Australia/Sydney) with telemetry disabled:
  - `openspec workspace create phase05-manual`
  - `openspec workspace add-repo app <path>`
  - `openspec workspace add-repo api <path>`
  - `openspec workspace add-repo docs <path>`
  - `openspec new change shared-auth --targets app,api --description "Cross-repo auth rollout"`
  - verified `changes/shared-auth/.openspec.yaml`
  - verified `proposal.md`, `design.md`, `tasks/coordination.md`, and `targets/{app,api}/{tasks.md,specs/}`
  - verified no `openspec/changes/shared-auth` directory was created in any registered repo
  - verified duplicate-target, unknown-target, and duplicate-change-ID failures
- Fresh isolated post-create health check:
  - `openspec workspace doctor --json` after targeted creation

## Results

- Build passed.
- Focused regression coverage passed: 51/51 tests.
- Targeted workspace changes now record the exact target list in `.openspec.yaml`.
- The workspace change layout now includes the central planning scaffold plus per-target task/spec partitions under `changes/<id>/targets/`.
- Unknown targets and duplicate targets fail before any workspace artifacts are written, with actionable error messages.
- Repo-local repos remained untouched during creation; no target repo received a materialized `openspec/changes/<id>` directory.
- Duplicate workspace change IDs still fail predictably at the workspace change path.
- `workspace doctor --json` still reported `status: "ok"` after targeted change creation, so the new flow does not corrupt workspace registry state.
- The CLI help output now describes `--description` generically enough to match both repo-local and workspace-targeted change creation.

## Blockers and next-step notes

- No blockers remain for Phase 05.
- No new roadmap phases were required from this implementation pass.
- Phase 06 should add dedicated permanent unit, command, and CLI coverage for the new workspace-targeted change path instead of relying on the focused shared regressions and CLI smoke used here.
