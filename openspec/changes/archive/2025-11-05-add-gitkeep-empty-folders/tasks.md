# Tasks

## Implementation
- [ ] Modify `src/core/init.ts` `createDirectoryStructure` method to create `.gitkeep` files in empty directories
- [ ] Add `.gitkeep` file creation for `openspec/specs/`
- [ ] Add `.gitkeep` file creation for `openspec/changes/`
- [ ] Add `.gitkeep` file creation for `openspec/changes/archive/`

## Testing
- [ ] Add test case verifying `.gitkeep` exists in `specs/` after init
- [ ] Add test case verifying `.gitkeep` exists in `changes/` after init
- [ ] Add test case verifying `.gitkeep` exists in `changes/archive/` after init
- [ ] Run existing test suite to ensure no regressions

## Validation
- [ ] Run `openspec validate add-gitkeep-empty-folders --strict` and resolve all issues
- [ ] Test `openspec init` manually in a fresh directory
- [ ] Verify Git tracks the empty directories with `.gitkeep` files
- [ ] Test `openspec list` works immediately after clone in a new repository
