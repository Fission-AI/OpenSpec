## Why
Recent cross-shell regressions for `openspec` commands revealed that our existing unit/integration tests do not exercise the packaged CLI or shell-specific behavior. The prior attempt at Vitest spawn tests stalled because it coupled e2e coverage with `pnpm pack` installs, which fail in network-restricted environments. With those findings incorporated, we now need an approved plan to realign the work.

## What Changes
- Adopt a phased strategy that first stabilizes direct spawn testing of the built CLI (`node dist/cli/index.js`) using lightweight fixtures and shared helpers.
- Expand coverage to cross-shell/OS matrices once the spawn harness is stable, ensuring both the direct `node dist/cli/index.js` invocation and the bin shim are exercised with non-TTY defaults and captured diagnostics.
- Treat packaging/install validation as an optional CI safeguard: when a runner has registry access, run a simple pnpm-based pack→install→smoke-test flow; otherwise document it as out of scope while closing remaining hardening items.

## Impact
- Tests: add `test/cli-e2e` spawn suite, helpers, and fixture usage updates; adjust `vitest.setup.ts` as needed.
- Tooling: update GitHub Actions workflows to add shell/OS matrices and (optionally) a packaging install check where network is available.
- Docs: keep `CROSS-SHELL-PLAN.md` aligned with the phased rollout and record any limitations called out during execution.
