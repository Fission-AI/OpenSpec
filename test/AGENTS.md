# OpenSpec Test Guidance

Applies to tests under `test/`.

## Running Tests

- Focused file: `pnpm exec vitest run test/path/to/file.test.ts`
- Focused case: `pnpm exec vitest run test/path/to/file.test.ts -t "case name"`
- Full suite: `pnpm test`
- Run `pnpm run build` before focused CLI tests when implementation changes may leave `dist/` stale.

## Path Canonicalization

Path identity is a recurring CI failure mode: Windows short/long paths, symlink or
junction aliases, and case-insensitive file systems can spell the same existing
directory differently.

When asserting existing filesystem paths as identities, canonicalize both actual
and expected paths first. Prefer `FileSystemUtils.canonicalizeExistingPath()` in
project code and `fs.realpathSync.native()` in test-only expectations.

Add an alias-path regression when touching path identity logic. If preserving
user-typed path spelling is intentional, assert it separately from identity comparisons.
