# Implementation Tasks

## 1. Update Conventions
- [x] 1.1 Update openspec-conventions spec with delta-based approach
- [x] 1.2 Add Header-Based Requirement Identification
- [x] 1.3 Define ADDED/MODIFIED/REMOVED/RENAMED sections
- [x] 1.4 Document standard output symbols (+ ~ - →)
- [x] 1.5 Update openspec/README.md with delta-based conventions
- [x] 1.6 Update examples to use delta format

## 2. Update Diff Command
- [ ] 2.1 Update cli-diff spec with requirement-level comparison
- [ ] 2.2 Parse specs into requirement-level structures
- [ ] 2.3 Apply deltas to generate future state
- [ ] 2.4 Implement side-by-side comparison view (changes only)
- [ ] 2.5 Add tests for requirement-level comparison
- [ ] 2.6 Add tests for side-by-side view formatting

## 3. Update Archive Command
- [x] 3.1 Update cli-archive spec with delta processing behavior
- [x] 3.2 Implement normalized header matching (trim whitespace)
- [x] 3.3 Parse delta sections (ADDED/MODIFIED/REMOVED/RENAMED)
- [x] 3.4 Apply changes in order: RENAMED → REMOVED → MODIFIED → ADDED
- [x] 3.5 Validate delta operations:
  - [x] 3.5.1 MODIFIED/REMOVED requirements exist
  - [x] 3.5.2 ADDED requirements don't already exist
  - [x] 3.5.3 RENAMED FROM headers exist, TO headers don't
  - [x] 3.5.4 No duplicate headers within specs
  - [x] 3.5.5 Renamed requirements aren't also in ADDED
- [x] 3.6 Display operation counts (+ 2 added, ~ 3 modified, etc.)
- [x] 3.7 Add tests for header normalization
- [x] 3.8 Add tests for applying deltas in correct order
- [x] 3.9 Add tests for validation edge cases

## Notes
- Archive command is critical path - must work reliably
- All new changes must use delta format
- Header normalization: normalize(header) = trim(header)
- Diff command shows only changed requirements in side-by-side comparison