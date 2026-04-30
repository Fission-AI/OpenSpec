# Phase 15 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Fresh manual smoke run in a copied local fixture context for ROADMAP Phase 15 using the built CLI.

## Scenarios run

- Rebuilt the CLI with `pnpm run build`.
- Copied `test/fixtures/workspace-poc/happy-path/workspace` and `test/fixtures/workspace-poc/happy-path/repos` into a fresh temp root, added an `ops` repo, and updated `.openspec/workspace.yaml` plus `.openspec/local.yaml` so `ops` participated as a fourth target.
- Ran the real CLI from the copied happy-path workspace:

```bash
cd <tmp>/happy-workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js new change manual-phase15 --targets app,api,docs,ops
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change manual-phase15 --repo app
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change manual-phase15 --repo api
cd <tmp>/happy-repos/app
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js archive manual-phase15 --yes --skip-specs --no-validate
rm -rf <tmp>/happy-repos/docs
cd <tmp>/happy-workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-phase15 --json
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-phase15
```

- Copied `test/fixtures/workspace-poc/dirty/workspace` and `test/fixtures/workspace-poc/dirty/repos` into a second fresh temp root, keeping the fixture’s stale `docs` path, and ran:

```bash
cd <tmp>/dirty-workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js new change manual-resume --targets app,api,docs
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change manual-resume --repo app
# mark repos/app/openspec/changes/manual-resume/tasks.md as 1/2 complete
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-resume --json
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-resume
```

- Validated each raw `status --change <id> --json` output parsed cleanly and contained no ANSI escapes, spinner glyphs, or `Loading change status...`.

## Results

- `pnpm run build` passed.
- In the happy-path smoke:
  - text and JSON status both showed `api: materialized`, `app: archived`, `docs: blocked`, and `ops: planned`
  - the text output rendered the archived target as `- app: archived via repo (0/2 tasks)`, which matches the current command and e2e expectations
  - the text output remained readable and listed the stale `docs` problem inline
  - the JSON output remained machine-parseable
- In the dirty-fixture smoke:
  - text and JSON status both showed `app: in-progress`, `api: planned`, and `docs: blocked`
  - overall change state remained `blocked`, which is the honest roll-up while the stale repo path is unresolved
  - the JSON output remained machine-parseable

## Fixes applied

- This manual smoke reconfirmed the Phase 15 product fix: archived repo-local targets are surfaced as `archived` instead of being misreported as `planned`.
- No product code changes were required during this manual-test pass.
- Refreshed this note to record the currently observed archived text rendering and the fresh-context smoke coverage completed in this pass.

## Residual risks

- No additional Phase 15 residual risks were found in this manual smoke pass.
- Explicit workspace archive/completion and `hard-done` remain deferred to Phase 16 by design.
