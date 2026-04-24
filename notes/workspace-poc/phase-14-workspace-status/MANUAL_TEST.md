# Phase 14 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Manual smoke re-run in a fresh local context for ROADMAP Phase 14 using copied workspace fixtures and the built CLI.

## Scenarios run

- Rebuilt the CLI with `pnpm run build`.
- Copied `test/fixtures/workspace-poc/happy-path/workspace` and `test/fixtures/workspace-poc/happy-path/repos` into a fresh temp root and created repo-local `openspec/changes/` roots for `app`, `api`, and `docs`.
- Ran the real CLI from the copied happy-path workspace with telemetry disabled:

```bash
cd <tmp>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js new change manual-status --targets app,api
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-status --json
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change manual-status --repo app --json
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-status --json
# mark workspace coordination tasks complete
# mark repos/app/openspec/changes/manual-status/tasks.md complete
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change manual-status --repo api --json
# mark repos/api/openspec/changes/manual-status/tasks.md complete
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-status --json
```

- Validated each raw `status --change <id> --json` output parsed cleanly and contained no ANSI escapes or spinner glyphs.
- Copied `test/fixtures/workspace-poc/dirty/workspace` and `test/fixtures/workspace-poc/dirty/repos` into a second fresh temp root and created repo-local `openspec/changes/` roots for `app` and `api`.
- Ran the real CLI from the copied dirty workspace:

```bash
cd <dirty-tmp>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js new change docs-repair --targets docs
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change docs-repair --json
```

- Validated the dirty-fixture raw `status --change docs-repair --json` output parsed cleanly and contained no ANSI escapes or spinner glyphs.

## Results

- `pnpm run build` passed.
- In the happy-path smoke:
  - the first status output showed `change.state: "planned"` with both `api` and `app` as `planned` via `workspace`
  - after `apply --repo app`, status showed `change.state: "in-progress"` with `app: materialized via repo` and `api: planned via workspace`
  - after completing coordination plus both repo-local task files, status showed `change.state: "soft-done"` with both targets `complete via repo`
  - `hard-done` never appeared during the run
- In the dirty-workspace smoke:
  - status showed `change.state: "blocked"`
  - the `docs` target reported `blocked via workspace`
  - the problem text was `repo alias 'docs' points to a missing repo path`
- All status outputs were valid JSON with no spinner contamination.
- No Phase 14 behavior drift was found between the implementation summary, verification notes, and this manual smoke re-run.

## Fixes applied

- No product fixes were required from this manual smoke pass.
- No manual-test-only fixes were needed beyond updating this artifact with the exact scenarios and observed assertions from the fresh run.

## Residual risks

- No additional Phase 14 residual risks were found in this manual smoke pass.
- Explicit workspace archive and `hard-done` remain deferred to Phase 16 by design.
