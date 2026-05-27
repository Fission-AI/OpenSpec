## 1. Phase 1 – Stabilize Local Spawn Coverage
- [x] 1.1 Add `test/helpers/run-cli.ts` that ensures the build runs once and executes `node dist/cli/index.js` with non-TTY defaults; update `vitest.setup.ts` to reuse the shared build step.
- [x] 1.2 Seed `test/cli-e2e` using the minimal fixture set (`tmp-init` or copy) to cover help/version, a happy-path `validate`, and a representative error flow via the new helper.
- [x] 1.3 Migrate the highest-value existing CLI exec tests (e.g., validate) onto `runCLI` and summarize Phase 1 coverage in this proposal for the next phase.

## 2. Phase 2 – Expand Cross-Shell Validation
- [x] 2.1 Exercise both entry points (`node dist/cli/index.js`, `bin/pastelsdd.js`) in the spawn suite and add diagnostics for shell/OS context.
- [x] 2.2 Extend GitHub Actions to run the spawn suite on bash jobs for Linux/macOS and a `pwsh` job on Windows; capture shell/OS diagnostics and note follow-ups for additional shells.

