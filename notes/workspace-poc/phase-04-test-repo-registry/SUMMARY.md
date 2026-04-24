# Phase 04 Summary

## Changes made

- Added core registry coverage in `test/core/workspace/registry.test.ts` for:
  - alias trimming and invalid alias rejection
  - canonical repo-path persistence
  - committed metadata stability when `local.yaml` changes
  - doctor diagnostics for missing local mappings, missing repo roots, missing `openspec/`, alias/path drift, and extra local aliases
- Added command-surface coverage in `test/commands/workspace/registry.test.ts` for:
  - `workspace add-repo`
  - healthy `workspace doctor`
  - stale `workspace doctor`
- Added CLI e2e coverage in `test/cli-e2e/workspace/workspace-registry-cli.test.ts` for:
  - multiple repo additions in one workspace
  - healthy doctor JSON output
  - stale-path detection and repair via `.openspec/local.yaml`
- Fixed two issues exposed by the new coverage in `src/commands/workspace.ts`:
  - corrected pluralized doctor status text for `aliases` and `entries`
  - changed doctor issue exits to set `process.exitCode = 1` after printing results instead of calling `process.exit(1)` inside the action body

## Tests or research performed

- `pnpm vitest run test/core/workspace test/commands/workspace test/cli-e2e/workspace`
- `pnpm run build`
- `pnpm vitest run test/core/workspace/registry.test.ts test/commands/workspace/registry.test.ts test/cli-e2e/workspace/workspace-registry-cli.test.ts`
- Fresh built-CLI smoke on 2026-04-17 covering:
  - `workspace create phase04-manual --json`
  - two successful `workspace add-repo ... --json` registrations
  - healthy `workspace doctor --json`
  - forced stale `local.yaml` repo path
  - successful doctor recovery after repairing the stale local path

## Results

- All targeted workspace tests passed: 23/23 in the full workspace slice and 8/8 in the Phase 04-focused verification slice.
- Build passed.
- Doctor now reports clean human-readable pluralization in healthy output.
- Doctor still exits non-zero when issues are present, while keeping the command-surface control flow stable enough for interception and tests.
- The registry stayed readable after multiple repo additions, committed metadata remained path-free and stable, and stale local overlay repair restored doctor success.

## Blockers and next-step notes

- No blockers remain for Phase 04.
- No new roadmap phases were required from this test pass.
- Phase 05 can build on the now-covered repo registry and doctor behavior.
