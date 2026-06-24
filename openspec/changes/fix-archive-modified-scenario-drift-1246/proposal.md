# Fix archive modified scenario drift

## Why

Issue #1246 reports that two active changes can both modify the same requirement from the same original base. Archiving the first change updates the canonical spec, but archiving the second change then replaces the whole requirement block and silently removes scenarios added by the first change.

## What Changes

- Add a conservative archive-time guard for `MODIFIED` requirement blocks.
- When the current canonical requirement contains scenario headings that the incoming modified block does not contain, abort instead of replacing the block.
- Keep existing whole-requirement replacement behavior when the incoming modified block includes all current scenarios.
- Add a regression test that archives two changes modifying the same requirement sequentially and verifies the second archive does not delete the first change's scenario.

## Impact

This prevents silent spec data loss without changing the delta file format. Users must refresh/rebase a stale `MODIFIED` requirement block before archiving if the canonical spec has gained scenarios since the change was authored.
