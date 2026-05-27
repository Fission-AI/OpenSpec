# Implementation Tasks

## 1. Update Command Implementation
- [x] 1.1 Create `src/core/update.ts` with `UpdateCommand` class
- [x] 1.2 Check if `pastelsdd` directory exists (use `FileSystemUtils.directoryExists`)
- [x] 1.3 Write `readmeTemplate` to `pastelsdd/README.md` using `FileSystemUtils.writeFile`
- [x] 1.4 Update `CLAUDE.md` using markers via `FileSystemUtils.updateFileWithMarkers` and `TemplateManager.getClaudeTemplate()`
- [x] 1.5 Display ASCII-safe success message: `Updated Pastelsdd instructions`

## 2. CLI Integration
- [x] 2.1 Register `update` command in `src/cli/index.ts`
- [x] 2.2 Add command description: `Update Pastelsdd instruction files`
- [x] 2.3 Handle errors with `ora().fail(...)` and exit code 1 (missing `pastelsdd` directory, file write errors)

## 3. Testing
- [x] 3.1 Verify `pastelsdd/README.md` is fully replaced with latest template
- [x] 3.2 Verify `CLAUDE.md` Pastelsdd block updates without altering user content outside markers
- [x] 3.3 Verify idempotency (running twice yields identical files, no duplicate markers)
- [x] 3.4 Verify error when `pastelsdd` directory is missing with friendly message
- [x] 3.5 Verify success message displays properly in ASCII-only terminals