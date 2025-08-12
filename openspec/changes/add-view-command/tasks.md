# Implementation Tasks

## 1. Core Parsing
- [ ] 1.1 Create ChangeParser class for reading change files
- [ ] 1.2 Implement proposal.md parser
- [ ] 1.3 Implement tasks.md parser with checkbox counting
- [ ] 1.4 Add design.md parser (optional file)
- [ ] 1.5 Create change discovery logic

## 2. Progress Tracking
- [ ] 2.1 Count task checkboxes (completed vs total)
- [ ] 2.2 Calculate completion percentage
- [ ] 2.3 Group tasks by section headers if present

## 3. Spec Analysis
- [ ] 3.1 Scan changes/[change-name]/specs/ directory for spec files
- [ ] 3.2 Parse spec.md files from each capability folder
- [ ] 3.3 Compare with existing specs in openspec/specs/ to determine new vs modified
- [ ] 3.4 Extract spec purpose/description from parsed content
- [ ] 3.5 Build list of spec changes for display

## 4. Display Renderer
- [ ] 4.1 Create ChangeRenderer for terminal output
- [ ] 4.2 Implement box drawing and formatting
- [ ] 4.3 Add progress bar visualization
- [ ] 4.4 Handle Unicode vs ASCII fallback

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