# OpenSpec Test Guidance

Applies to tests under `test/`.

## Running Tests

- Focused file: `pnpm exec vitest run test/path/to/file.test.ts`
- Focused case: `pnpm exec vitest run test/path/to/file.test.ts -t "case name"`
- Full suite: `pnpm test`
- Run `pnpm run build` before focused CLI tests when implementation changes may leave `dist/` stale.

## Cross-Platform Paths

- Do not hard-code Unix path separators in CLI output expectations unless the implementation intentionally emits POSIX paths.
- For filesystem paths, build expected values with `path.join(...)`, `path.relative(...)`, or `FileSystemUtils.joinPath(...)`.
- For human-readable output, either assert a deliberately normalized display format or normalize both actual and expected strings before comparing, for example with `FileSystemUtils.toPosixPath()` to convert backslashes to forward slashes for cross-platform consistency.
- When touching path behavior, add coverage that would fail on Windows path separators.

## Path Canonicalization

Path identity is a recurring CI failure mode: Windows short/long paths, symlink or
junction aliases, and case-insensitive file systems can spell the same existing
directory differently.

When asserting existing filesystem paths as identities, canonicalize both actual
and expected paths first. Prefer `FileSystemUtils.canonicalizeExistingPath()` in
project code and `fs.realpathSync.native()` in test-only expectations.

Add an alias-path regression when touching path identity logic. If preserving
user-typed path spelling is intentional, assert it separately from identity comparisons.
