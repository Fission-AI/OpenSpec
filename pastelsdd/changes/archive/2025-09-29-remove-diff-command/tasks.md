# Remove Diff Command - Tasks

## 1. Remove Core Implementation
- [x] Delete `/src/core/diff.ts`
- [x] Remove DiffCommand import from `/src/cli/index.ts`
- [x] Remove diff command registration from CLI

## 2. Remove Specifications
- [x] Delete `/pastelsdd/specs/cli-diff/spec.md`
- [x] Archive the spec for historical reference if needed

## 3. Update Dependencies
- [x] Remove jest-diff from package.json dependencies
- [x] Run pnpm install to update lock file

## 4. Update Documentation
- [x] Update main README.md to remove diff command references
- [x] Update pastelsdd/README.md to remove diff command from command list
- [x] Update CLAUDE.md template if it mentions diff command
- [x] Update any example workflows that use diff command

## 5. Update Related Files
- [x] Search and update any remaining references to "pastelsdd diff" in:
  - Template files
  - Test files (if any exist for diff command)
  - Archive documentation
  - Change proposals

## 7. Testing
- [x] Ensure all tests pass after removal
- [x] Verify CLI help text no longer shows diff command
- [x] Test that show command provides adequate replacement functionality

## 8. Documentation of Alternative Workflows
- [x] Document how to use `pastelsdd show` for viewing changes
- [x] Document how to use git diff for file comparisons
- [x] Add migration guide to help text or documentation