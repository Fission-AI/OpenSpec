# OpenSpec Test Guidance

Scope: this file applies to tests under `test/`. Keep it focused on test-writing
habits and recurring CI failure modes.

## Running Tests

- Focused file: `pnpm exec vitest run test/path/to/file.test.ts`
- Focused case: `pnpm exec vitest run test/path/to/file.test.ts -t "case name"`
- Full suite: `pnpm test`
- CLI integration tests use the built CLI through `test/helpers/run-cli.ts`. Run
  `pnpm run build` before focused CLI tests when the implementation changed and
  `dist/` may be stale.

## Path Canonicalization

Path identity bugs are a recurring CI failure mode. The same existing directory can be
observed through different spellings:

- Windows short paths such as `C:\Users\RUNNER~1\...`
- Windows long paths such as `C:\Users\runneradmin\...`
- symlink or junction aliases
- case differences on case-insensitive file systems

When tests compare, store, or assert existing filesystem paths as identities,
canonicalize every side of the comparison first. Prefer
`FileSystemUtils.canonicalizeExistingPath()` for project code paths; it uses
`fs.realpathSync.native()` first so Windows short-path aliases expand
consistently. In tests where importing the helper is not useful, compute expected
existing paths with `fs.realpathSync.native()`.

High-risk surfaces:

- workspace roots and linked workspace paths
- artifact output paths returned by glob resolution
- CLI `cwd` values when the implementation may canonicalize internally
- registry or local-state paths that are later compared to paths found by walking ancestors

Regression guidance:

- Add at least one alias-path regression when touching path identity logic. Symlinks or
  junctions usually reproduce the same class of bug on non-Windows systems.
- If a test asserts a path that the implementation canonicalizes, compute the expectation
  with `FileSystemUtils.canonicalizeExistingPath()` or `fs.realpathSync.native()` rather
  than raw `path.join(...)`.
- If preserving the user's typed path spelling is intentional, assert that explicitly and
  keep it separate from identity comparisons.
