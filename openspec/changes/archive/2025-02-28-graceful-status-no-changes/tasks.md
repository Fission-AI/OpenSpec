## 1. Implementation

- [x] 1.1 Extract `getAvailableChanges` in `shared.ts` and use it in `statusCommand` to check for changes before calling `validateChangeExists`
- [x] 1.2 In text mode: print `No active changes. Create one with: openspec new change <name>` and return (exit 0)
- [x] 1.3 In JSON mode: output `{"changes":[],"message":"No active changes."}` and return (exit 0)

## 2. Tests

- [x] 2.1 Add test: `openspec status` with no changes exits gracefully with friendly message (text mode)
- [x] 2.2 Add test: `openspec status --json` with no changes returns valid JSON with empty changes array
- [x] 2.3 Verify existing behavior: `openspec status` without `--change` when changes exist still throws missing option error
- [x] 2.4 Verify cross-platform: tests use `path.join()` for any path assertions

## 3. Release

- [x] 3.1 Add changeset describing the fix
