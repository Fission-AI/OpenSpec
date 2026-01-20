## 1. Parser robustness improvements
- [x] 1.1 Update requirement header regex in `requirement-blocks.ts` to allow flexible whitespace: `/^###\s*Requirement:\s*/`
- [x] 1.2 Add early normalization check to ensure `normalizeLineEndings()` is called before all regex operations
- [x] 1.3 Add diagnostic collection: track lines that start with `###` but fail to match the requirement pattern

## 2. Enhanced error messaging
- [x] 2.1 When `emptySectionSpecs` is not empty, include first 5 lines of section content in error message
- [x] 2.2 Add helper function to format diagnostic info (line numbers, escaped text preview)
- [x] 2.3 Update `VALIDATION_MESSAGES.CHANGE_NO_DELTAS` to include troubleshooting steps from spec

## 3. Validator diagnostic improvements
- [x] 3.1 Modify `validateChangeDeltaSpecs()` to collect parse failure diagnostics from parser
- [x] 3.2 When sections are found but parsing yields zero blocks, include:
  - Section names that were detected
  - First few lines of each empty section
  - Expected format reminder
- [x] 3.3 Add debug flag support for verbose parser logging (optional enhancement)

## 4. Tests
- [x] 4.1 Add test case: CRLF line endings in delta spec file
- [x] 4.2 Add test case: Extra whitespace in requirement headers (`###  Requirement:`)
- [x] 4.3 Add test case: Missing space in requirement header (`###Requirement:`)
- [x] 4.4 Add test case: Mixed line endings (LF and CRLF in same file)
- [x] 4.5 Add test case: Verify enhanced error messages include diagnostic details
- [x] 4.6 Regression test: Ensure existing valid specs still parse correctly

## 5. Documentation
- [x] 5.1 Update validation error message templates to reference new diagnostic output
- [x] 5.2 Add troubleshooting section to AGENTS.md covering common parsing issues

## 6. Integration validation
- [x] 6.1 Run full test suite to ensure no regressions
- [x] 6.2 Test with real-world spec files from the repository
- [x] 6.3 Verify Issue #164 reproduction case now passes validation
