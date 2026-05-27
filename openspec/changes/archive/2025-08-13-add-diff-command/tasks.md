# Implementation Tasks

## 1. Core Implementation
- [x] 1.1 Create `src/core/diff.ts` with diff logic
- [x] 1.2 Implement change directory scanning
- [x] 1.3 Implement file comparison using unified diff format
- [x] 1.4 Add color support for terminal output

## 2. CLI Integration
- [x] 2.1 Add diff command to `src/cli/index.ts`
- [x] 2.2 Implement interactive change selection when no argument provided
- [x] 2.3 Add error handling for missing changes

## 3. Enhancements
- [x] 3.1 Replace with jest-diff for professional diff output
- [x] 3.2 Improve file headers with status and statistics
- [x] 3.3 Add summary view with file counts and line changes

## 4. Testing
- [ ] 4.1 Test diff generation for modified files
- [ ] 4.2 Test handling of new files
- [ ] 4.3 Test handling of deleted files
- [ ] 4.4 Test interactive mode