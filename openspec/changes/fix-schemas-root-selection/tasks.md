## 1. Lock the root-selection regression with CLI tests

- [x] 1.1 Add `test/commands/schemas.test.ts` with real temporary local and registered-store roots, valid distinct project schemas, isolated XDG data/config homes, canonical cleanup, and a store path containing spaces.
- [x] 1.2 Add failing cases proving `schemas --json --store <id>` returns the store-only schema rather than the cwd-only schema, and `schemas --store-path <path>` reaches the deliberate removed-option diagnostic.
- [x] 1.3 Add failing cases proving config-only `store:` and global `defaultStore` roots supply schemas without a flag, while a nearest real root wins over `defaultStore`.
- [x] 1.4 Add failing cases for rootless compatibility, unselected registered-store failure, invalid/unavailable store failure, one-document JSON diagnostics, and unchanged successful array output.
- [x] 1.5 Extend `test/core/completions/command-registry.test.ts` to require the common `store` flag on the `schemas` definition and require the shared store-selection guidance to name it.
- [x] 1.6 Run `pnpm exec vitest run test/commands/schemas.test.ts test/core/completions/command-registry.test.ts` and verify the new tests fail only because `schemas` lacks authoritative root selection and `--store` support.

## 2. Implement canonical schemas root selection

- [x] 2.1 Extend `SchemasOptions` in `src/commands/workflow/schemas.ts` with `store` and `storePath`, resolve through `resolveRootForCommand()`, return on a JSON resolution failure, and pass `root.path` to `listSchemasWithInfo()`.
- [x] 2.2 Update the `schemas` registration in `src/cli/index.ts` with `--store <id>`, the shared hidden `--store-path` option, and JSON-aware failure handling without changing successful output shapes.
- [x] 2.3 Add `COMMON_FLAGS.store` to the `schemas` entry in `src/core/completions/command-registry.ts`, add `schemas` to the shared store-capable command guidance, synchronize committed generated skill snapshots and the formal CLI/JSON agent-contract references, remove the stale `propose` claim without changing its compatibility flow, and refresh generated-content parity hashes.
- [x] 2.4 Run `pnpm run build`, then rerun `pnpm exec vitest run test/commands/schemas.test.ts test/core/completions/command-registry.test.ts` and verify all root, error, output-compatibility, and completion cases pass.

## 3. Regression and cross-platform verification

- [x] 3.1 Run `pnpm exec vitest run test/cli-e2e/basic.test.ts test/commands/context.test.ts test/commands/global-default-store.test.ts test/core/root-selection.test.ts test/core/artifact-graph/resolver.test.ts` to verify adjacent root and schema behavior.
- [x] 3.2 Run `pnpm run lint`, `pnpm run build`, and `pnpm test`; confirm no successful `schemas` output regression and no changes outside the scoped CLI, tests, generated guidance/documentation, and proposal files.
- [x] 3.3 Run `pnpm exec openspec validate fix-schemas-root-selection --strict` and `git diff --check`.
- [ ] 3.4 Verify the focused schemas suite on Windows CI, specifically the spaced native store path and absence of hard-coded path separators.
