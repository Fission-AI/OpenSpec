## 1. Command-Level Regression Coverage

- [x] 1.1 Add a test helper that registers the schema command on a fresh Commander program and restores `cwd`, `process.exitCode`, environment variables, and console spies after each test.
- [x] 1.2 Add a regression test that creates an existing schema with a sentinel file, runs forced initialization with an unknown artifact ID, and verifies the non-zero JSON error plus byte-for-byte preservation of the existing schema.
- [x] 1.3 Add a positive regression test that runs forced initialization with valid artifact IDs and verifies the old sentinel is removed and the expected schema and templates are generated.

## 2. Validation-First Forced Replacement

- [x] 2.1 Reorganize the `schema init` action so it collects inputs, validates artifact IDs, and constructs the in-memory schema before deleting an existing destination.
- [x] 2.2 Keep the existing unknown-artifact output and exit status unchanged while ensuring every pre-mutation return path leaves the destination untouched.
- [x] 2.3 Confirm a valid `--force` invocation still replaces the existing schema and reports the same successful result.

## 3. Cross-Platform Verification and Release Metadata

- [x] 3.1 Use Node.js path helpers and temporary directories in the regression tests, and confirm the affected test runs in the existing Windows CI environment.
- [x] 3.2 Run `pnpm exec vitest run test/commands/schema.test.ts`, `pnpm run lint`, and `pnpm run build`.
- [x] 3.3 Add a patch changeset describing that failed forced schema initialization now preserves the existing schema.
