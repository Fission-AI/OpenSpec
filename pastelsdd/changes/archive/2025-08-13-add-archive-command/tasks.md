# Implementation Tasks

## 1. Core Implementation
- [ ] 1.1 Create `src/core/archive.ts` with ArchiveCommand class
  - [ ] 1.1.1 Implement change selection (interactive if not provided)
  - [ ] 1.1.2 Implement incomplete task checking from tasks.md
  - [ ] 1.1.3 Implement confirmation prompt for incomplete tasks
  - [ ] 1.1.4 Implement spec update functionality
    - [ ] 1.1.4.1 Detect specs in change directory
    - [ ] 1.1.4.2 Compare with existing main specs
    - [ ] 1.1.4.3 Display summary of new vs updated specs
    - [ ] 1.1.4.4 Show confirmation prompt for spec updates
    - [ ] 1.1.4.5 Copy specs to main spec directory
  - [ ] 1.1.5 Implement archive move with date prefixing
  - [ ] 1.1.6 Support --yes flag to skip confirmations

## 2. CLI Integration
- [ ] 2.1 Add archive command to `src/cli/index.ts`
  - [ ] 2.1.1 Import ArchiveCommand
  - [ ] 2.1.2 Register command with commander
  - [ ] 2.1.3 Add --yes/-y flag option
  - [ ] 2.1.4 Add proper error handling

## 3. Error Handling
- [ ] 3.1 Handle missing pastelsdd/changes/ directory
- [ ] 3.2 Handle change not found
- [ ] 3.3 Handle archive target already exists
- [ ] 3.4 Handle user cancellation

## 4. Testing
- [ ] 4.1 Test with fully completed change
- [ ] 4.2 Test with incomplete tasks (warning shown)
- [ ] 4.3 Test interactive selection mode
- [ ] 4.4 Test duplicate archive prevention
- [ ] 4.5 Test spec update functionality
  - [ ] 4.5.1 Test creating new specs
  - [ ] 4.5.2 Test updating existing specs
  - [ ] 4.5.3 Test confirmation prompt display
  - [ ] 4.5.4 Test declining confirmation (no changes made)
  - [ ] 4.5.5 Test --yes flag skips confirmation

## 5. Build and Validation
- [ ] 5.1 Ensure TypeScript compilation succeeds
- [ ] 5.2 Test command execution