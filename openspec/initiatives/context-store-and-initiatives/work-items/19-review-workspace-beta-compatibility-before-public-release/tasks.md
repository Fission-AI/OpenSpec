# Tasks

- [ ] Inventory workspace compatibility code paths and tests.
- [ ] Classify each path as public contract, beta migration, test-only shim, or
  removable dead weight.
- [ ] Decide whether legacy split workspace state remains readable after public
  release.
- [ ] Decide whether old generated `.gitignore` cleanup should remain, become
  more conservative, or be removed entirely.
- [ ] Decide how long `codex` should remain accepted as an alias for
  `codex-cli`.
- [ ] Remove beta-only compatibility paths that do not need to survive public
  release.
- [ ] Update tests to encode the chosen compatibility contract.
- [ ] Update docs, generated guidance, and release notes with the final public
  behavior.
