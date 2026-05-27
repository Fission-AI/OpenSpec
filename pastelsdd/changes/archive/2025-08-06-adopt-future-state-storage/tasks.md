# Implementation Tasks

## 1. Update Core Documentation
- [x] 1.1 Update pastelsdd/README.md section on "Creating a Change Proposal"
  - [x] Replace `patches/` with `specs/` in directory structure
  - [x] Update step 3 to show storing complete future state
  - [x] Remove diff syntax instructions (+/- prefixes)

## 2. Migrate Existing Change
- [x] 2.1 Convert add-init-command change to new format
  - [x] Create `specs/cli-init/spec.md` with clean content (no diff markers)
  - [x] Delete old `patches/` directory
- [x] 2.2 Test that the migrated change is clear and reviewable

## 3. Update Documentation Examples
- [x] 3.1 Update docs/PRD.md
  - [x] Fix directory structure examples (lines 376-382)
  - [x] Update archive examples (lines 778-783)
  - [x] Ensure consistency throughout
- [x] 3.2 Update docs/pastelsdd-walkthrough.md
  - [x] Replace diff examples with future state examples
  - [x] Ensure the walkthrough reflects new approach

## 4. Create New Spec
- [x] 4.1 Finalize pastelsdd-conventions spec in main specs/ directory
  - [x] Document the future state storage approach
  - [x] Include examples of good proposals
  - [x] Make it the source of truth for conventions

## 5. Validation
- [x] 5.1 Verify all documentation is consistent
- [x] 5.2 Test creating a new change with the new approach
- [x] 5.3 Ensure GitHub PR view shows diffs clearly

## 6. Deployment
- [x] 6.1 Get approval for this change
- [x] 6.2 Implement all tasks above
- [x] 6.3 After deployment, archive this change with completion date