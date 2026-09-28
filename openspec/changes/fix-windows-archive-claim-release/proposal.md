# Release archive claims on Windows

## Why

`openspec archive` creates `.openspec-archive.lock` before moving a change into
the archive. On Windows, a successful archive can leave that lock behind because
the cleanup check compares the device id returned by the open file handle with
the one returned by `fs.lstat()`. Node reports a real device id from the handle
and `0n` from the path stat on the affected Windows/NTFS setup, so the ownership
check never passes.

The archive itself succeeds, but the next archive is blocked by the stale claim
and the user has to delete `.openspec-archive.lock` by hand.

## What Changes

- Treat an inode match plus matching claim contents as sufficient when either
  side reports `dev: 0n`, while still requiring the two path stats around the
  read to match.
- Keep the existing protection against deleting a claim that was replaced by
  another process.
- Add a regression test that simulates the Windows path-stat device id behavior.

## Impact

- Affected spec: `cli-archive`
- Affected code: `src/core/archive.ts`
- Affected tests: `test/core/archive.test.ts`
