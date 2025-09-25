## 1. Phase 1 – Stabilize Local Spawn Coverage
- [ ] 1.1 Update `vitest.setup.ts` and helpers so the CLI build runs once and `runCLI` executes `node dist/cli.js` with non-TTY defaults.
- [ ] 1.2 Reuse the minimal fixture set (`tmp-init` or copy) to seed initial spawn tests for help/version, a happy-path `validate`, and a representative error flow.
- [ ] 1.3 Document the Phase 1 coverage details in `CROSS-SHELL-PLAN.md`, noting any outstanding gaps.

## 2. Phase 2 – Expand Cross-Shell Validation
- [ ] 2.1 Exercise both entry points (`node dist/cli.js`, `bin/openspec.js`) in the spawn suite and add diagnostics for shell/OS context.
- [ ] 2.2 Extend GitHub Actions to run the spawn suite across a matrix of shells (bash, zsh, fish, pwsh, cmd) on macOS, Linux, and Windows runners.

## 3. Phase 3 – Package Validation (Optional)
- [ ] 3.1 Add a simple CI job on runners with registry access that runs `pnpm pack`, installs the tarball into a temp workspace (e.g., `pnpm add --no-save`), and executes `pnpm exec openspec --version`.
- [ ] 3.2 If network-restricted environments can’t exercise installs, document the limitation in `CROSS-SHELL-PLAN.md` and skip the job there.
- [ ] 3.3 Close out remaining hardening items from the original cross-shell plan (e.g., `.gitattributes`, chmod enforcement, SIGINT follow-ups) and update the plan accordingly.
