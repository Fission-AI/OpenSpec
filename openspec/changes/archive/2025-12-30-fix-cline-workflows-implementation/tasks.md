## 1. Update ClineSlashCommandConfigurator
- [x] Change FILE_PATHS in `src/core/configurators/slash/cline.ts` from `.clinerules/openspec-*.md` to `.clinerules/workflows/openspec-*.md`

## 2. Update Tests
- [x] Update "should refresh existing Cline rule files" test in `test/core/update.test.ts` to use workflow paths
- [x] Update "should create Cline rule files with templates" test in `test/core/init.test.ts` to use workflow paths

## 3. Update Documentation
- [x] Update README.md table to show "Workflows in `.clinerules/workflows/` directory" for Cline

## 4. Validate Changes
- [x] Ensure all tests pass with the new paths
- [x] Verify the change follows OpenSpec conventions
