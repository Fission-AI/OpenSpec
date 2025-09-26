## 1. Phase 1 – Stabilize Local Spawn Coverage
- [x] 1.1 Add `test/helpers/run-cli.ts` that ensures the build runs once and executes `node dist/cli/index.js` with non-TTY defaults; update `vitest.setup.ts` to reuse the shared build step.
- [x] 1.2 Seed `test/cli-e2e` using the minimal fixture set (`tmp-init` or copy) to cover help/version, a happy-path `validate`, and a representative error flow via the new helper.
- [x] 1.3 Migrate the highest-value existing CLI exec tests (e.g., validate) onto `runCLI` and summarize Phase 1 coverage in this proposal for the next phase.

## 2. Phase 2 – Expand Cross-Shell Validation
- [ ] 2.1 Exercise both entry points (`node dist/cli/index.js`, `bin/openspec.js`) in the spawn suite and add diagnostics for shell/OS context.
- [x] 2.2 Extend GitHub Actions to run the spawn suite on bash jobs for Linux/macOS and a `pwsh` job on Windows; capture shell/OS diagnostics and note follow-ups for additional shells.

## 3. Phase 3 – Package Validation (Optional)
- [ ] 3.1 Add a simple CI job on runners with registry access that runs `pnpm pack`, installs the tarball into a temp workspace (e.g., `pnpm add --no-save`), and executes `pnpm exec openspec --version`.
- [ ] 3.2 If network-restricted environments can’t exercise installs, skip the job and note the limitation in this proposal’s rollout log.
- [ ] 3.3 Close out the enumerated hardening items: extend `.gitattributes` to cover packaged assets, enforce executable bits for CLI shims during CI, and finish the outstanding SIGINT handling work; update this proposal once they land.
