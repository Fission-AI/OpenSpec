## 1. Specification

- [x] 1.1 Capture YAML frontmatter carriage-return escaping in a `command-generation` delta spec
- [x] 1.2 Document the shared utility design

## 2. Implementation

- [x] 2.1 Add shared YAML scalar escaping utility
- [x] 2.2 Escape carriage returns in quoted YAML scalar values
- [x] 2.3 Update YAML-frontmatter adapters to use the shared utility

## 3. Verification

- [x] 3.1 Add unit coverage for the shared YAML utility
- [x] 3.2 Add adapter coverage for carriage-return escaping in generated frontmatter
- [x] 3.3 Run targeted command-generation tests
- [x] 3.4 Validate the OpenSpec change
