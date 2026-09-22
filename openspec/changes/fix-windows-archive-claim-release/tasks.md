# Tasks

## 1. Release owned claims cross-platform
- [x] 1.1 Compare archive claim files by inode and tolerate a missing device id from either stat result
- [x] 1.2 Preserve the content and repeated-path-stat checks before unlinking

## 2. Verify behavior
- [x] 2.1 Add regression coverage for the Windows `dev: 0n` path-stat case
- [x] 2.2 Run the focused archive regression test

## 3. Record behavior
- [x] 3.1 Add a `cli-archive` spec delta for successful claim cleanup
