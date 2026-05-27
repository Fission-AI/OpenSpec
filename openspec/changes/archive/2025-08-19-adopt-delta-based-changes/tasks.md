# Implementation Tasks

## 1. Update Conventions
- [x] 1.1 Update pastelsdd-conventions spec with delta-based approach
- [x] 1.2 Add Header-Based Requirement Identification
- [x] 1.3 Define ADDED/MODIFIED/REMOVED/RENAMED sections
- [x] 1.4 Document standard output symbols (+ ~ - →)
- [x] 1.5 Update pastelsdd/README.md with delta-based conventions
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
- [x] 3.2 Implement requirement-block extractor that preserves exact headers (`### Requirement: [Name]`) and captures full content (including scenarios)
- [x] 3.3 Implement normalized header matching (trim-only, case-sensitive)
- [x] 3.4 Parse delta sections (ADDED/MODIFIED/REMOVED/RENAMED)
- [x] 3.5 New spec creation when target spec does not exist
  - [x] 3.5.1 Auto-generate minimal skeleton: `# [Spec Name] Specification`, `## Purpose` placeholder, `## Requirements`
  - [x] 3.5.2 Allow only ADDED operations for non-existent specs; abort if MODIFIED/REMOVED/RENAMED present
- [x] 3.6 Apply changes in order: RENAMED → REMOVED → MODIFIED → ADDED
- [x] 3.7 Validation and conflict checks
  - [x] 3.7.1 MODIFIED/REMOVED requirements exist (after applying rename mappings)
  - [x] 3.7.2 ADDED requirements don't already exist (consider post-rename state)
  - [x] 3.7.3 RENAMED FROM headers exist; TO headers don't (including collisions with ADDED)
  - [x] 3.7.4 No duplicate headers within specs after all operations
  - [x] 3.7.5 Detect cross-section conflicts (e.g., same requirement in MODIFIED and REMOVED)
  - [x] 3.7.6 When a rename exists, require MODIFIED to reference the NEW header
- [x] 3.8 Atomic updates
  - [x] 3.8.1 Validate all deltas first; stage updates in-memory per spec
  - [x] 3.8.2 Single write per spec; abort entire archive on any validation failure (no partial writes)
- [x] 3.9 Output and error messaging
  - [x] 3.9.1 Display per-spec operation counts with symbols: `+` added, `~` modified, `-` removed, `→` renamed
  - [x] 3.9.2 Optionally display an aggregated totals line across all specs
  - [x] 3.9.3 Standardize error message format: `[spec] [operation] failed for header "### Requirement: X" — reason`; end with `Aborted. No files were changed.` on failure
- [x] 3.10 Idempotency behavior (v1): abort on precondition failures (e.g., ADDED already exists); do not implement no-op detection
- [x] 3.11 Tests
  - [x] 3.11.1 Header normalization (trim-only) matching
  - [x] 3.11.2 Apply in correct order (RENAMED → REMOVED → MODIFIED → ADDED)
  - [x] 3.11.3 Validation edge cases (missing headers, duplicates, rename collisions, conflicting sections)
  - [x] 3.11.4 Rename + modify interplay (MODIFIED uses new header)
  - [x] 3.11.5 New spec creation via skeleton
  - [x] 3.11.6 Multi-spec mixed operations with independent validation and write

## Notes
- Archive command is critical path - must work reliably
- All new changes must use delta format
- Header normalization: normalize(header) = trim(header)
- Diff command shows only changed requirements in side-by-side comparison