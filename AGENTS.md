# OpenSpec Contributor Notes

## Path Canonicalization

Path identity bugs are a recurring CI failure mode. The same existing directory can be
observed through different spellings:

- Windows short paths such as `C:\Users\RUNNER~1\...`
- Windows long paths such as `C:\Users\runneradmin\...`
- symlink or junction aliases
- case differences on case-insensitive file systems

When code compares, stores, or returns existing filesystem paths as identities, canonicalize
all sides of the comparison first. Prefer `FileSystemUtils.canonicalizeExistingPath()`
for existing paths; it uses `fs.realpathSync.native()` first so Windows short-path aliases
expand consistently.

Common places this matters:

- workspace roots and linked workspace paths
- artifact output paths returned by glob resolution
- CLI `cwd` values in tests when the implementation may canonicalize internally
- registry or local-state paths that are later compared to paths found by walking ancestors

Testing guidance:

- Add at least one alias-path regression when touching path identity logic. Symlinks or
  junctions usually reproduce the same class of bug on non-Windows systems.
- If a test asserts a path that the implementation canonicalizes, compute the expectation
  with `FileSystemUtils.canonicalizeExistingPath()` or `fs.realpathSync.native()` rather
  than raw `path.join(...)`.
- If preserving the user's typed path spelling is intentional, assert that explicitly and
  keep it separate from identity comparisons.
