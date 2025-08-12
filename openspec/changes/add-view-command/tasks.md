# Implementation Tasks

## 1. Core Parsing
- [ ] 1.1 Create ChangeParser class for reading change files
- [ ] 1.2 Extract brief "why" statement from proposal.md
- [ ] 1.3 Count total tasks in tasks.md (if present)
- [ ] 1.4 Note presence of design.md (optional file)
- [ ] 1.5 Create change discovery logic

## 2. Requirement Extraction
- [ ] 2.1 Create RequirementExtractor class
- [ ] 2.2 Parse @requirement markers and their identifiers
- [ ] 2.3 Extract requirement descriptions following markers
- [ ] 2.4 Count total requirements per spec
- [ ] 2.5 Format requirements as "identifier: description"

## 3. Spec Analysis
- [ ] 3.1 Scan changes/[change-name]/specs/ directory structure
- [ ] 3.2 Identify capability folders and spec.md files
- [ ] 3.3 Compare with openspec/specs/ to classify as NEW or MODIFIED
- [ ] 3.4 Group requirements by spec for display
- [ ] 3.5 Handle specs without @requirement markers gracefully

## 4. Display Renderer
- [ ] 4.1 Create ChangeRenderer for terminal output
- [ ] 4.2 Implement tree structure display
- [ ] 4.3 Show first 3-4 requirements per spec
- [ ] 4.4 Add "... X more requirements" indicator
- [ ] 4.5 Handle Unicode emoji and fallback

## 5. CLI Integration
- [ ] 5.1 Add view command to CLI router
- [ ] 5.2 Parse command arguments (change name)
- [ ] 5.3 List available changes if no argument
- [ ] 5.4 Add help text

## 6. Error Handling
- [ ] 6.1 Handle missing change gracefully
- [ ] 6.2 Handle missing/malformed files
- [ ] 6.3 Provide helpful error messages

## 7. Testing
- [ ] 7.1 Unit tests for ChangeParser
- [ ] 7.2 Unit tests for progress calculation
- [ ] 7.3 Integration test for view command

## 8. Documentation
- [ ] 8.1 Update CLI help text
- [ ] 8.2 Add usage examples