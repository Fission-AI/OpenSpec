# Implementation Tasks

## 1. Core Implementation
- [x] 1.1 Create `src/core/list.ts` with list logic
  - [x] 1.1.1 Implement directory scanning (exclude archive/)
  - [x] 1.1.2 Implement task counting from tasks.md files
  - [x] 1.1.3 Format output as simple table
- [x] 1.2 Add list command to CLI in `src/cli/index.ts`
  - [x] 1.2.1 Register `pastelsdd list` command
  - [x] 1.2.2 Connect to list.ts implementation

## 2. Error Handling
- [x] 2.1 Handle missing pastelsdd/changes/ directory
- [x] 2.2 Handle changes without tasks.md files
- [x] 2.3 Handle empty changes directory

## 3. Testing
- [x] 3.1 Add tests for list functionality
  - [x] 3.1.1 Test with multiple changes
  - [x] 3.1.2 Test with completed changes
  - [x] 3.1.3 Test with no changes
  - [x] 3.1.4 Test error conditions

## 4. Documentation
- [x] 4.1 Update CLI help text with list command
- [x] 4.2 Add list command to README if applicable