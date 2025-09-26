## Why
Recent cross-shell regressions for `openspec` commands revealed that our existing unit/integration tests do not exercise the packaged CLI or shell-specific behavior. The prior attempt at Vitest spawn tests stalled because it coupled e2e coverage with `pnpm pack` installs, which fail in network-restricted environments. With those findings incorporated, we now need an approved plan to realign the work.

## What Changes
- Adopt a phased strategy that first stabilizes direct spawn testing of the built CLI (`node dist/cli/index.js`) using lightweight fixtures and a shared `runCLI` helper.
- Expand coverage once the spawn harness is stable, keeping the initial matrix focused on bash jobs for Linux/macOS and `pwsh` on Windows while exercising both the direct `node dist/cli/index.js` invocation and the bin shim with non-TTY defaults and captured diagnostics.
- Treat packaging/install validation as an optional CI safeguard: when a runner has registry access, run a simple pnpm-based pack→install→smoke-test flow; otherwise document it as out of scope while closing remaining hardening items.
- Close out the remaining cross-shell hardening items: ensure `.gitattributes` covers packaged assets, enforce executable bits for CLI shims during CI, and finish the pending SIGINT handling improvements.

## Impact
- Tests: add `test/cli-e2e` spawn suite, create the shared `runCLI` helper, and adjust `vitest.setup.ts` as needed.
- Tooling: update GitHub Actions workflows with the lightweight matrix above and (optionally) a packaging install check where network is available.
- Docs: note phase progress and any limitations inline in this proposal (or the relevant spec) so future phases have clear context.

### Phase 1 Status
- Shared `test/helpers/run-cli.ts` guarantees the CLI bundle exists before spawning and enforces non-TTY defaults for every invocation.
- New `test/cli-e2e/basic.test.ts` covers `--help`, `--version`, a successful `validate --all --json`, and an unknown-item error path against the `tmp-init` fixture copy.
- Legacy top-level `validate` exec tests now rely on `runCLI`, avoiding manual `execSync` usage while keeping their fixture authoring intact.
- CI matrix groundwork is in place (bash on Linux/macOS, pwsh on Windows) so the spawn suite runs the same way the helper does across supported shells.
