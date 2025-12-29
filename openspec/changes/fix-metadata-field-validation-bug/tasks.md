# Tasks

## Test-Driven Development (Red-Green)

1. **✅ Write failing test (RED)**
   - Added test case: "should pass when requirement has metadata fields before description with SHALL/MUST"
   - Test creates requirement with `**ID**` and `**Priority**` metadata before normative description
   - Test expects validation to pass (description contains MUST)
   - With buggy code (pre-c782462): Test FAILS (validator checks metadata field instead of description)

2. **✅ Verify test fails for correct reason**
   - Confirmed test fails with buggy code
   - Error: `expect(report.valid).toBe(true)` but got `false`
   - Root cause: `extractRequirementText()` returns `**ID**: REQ-FILE-001` which lacks SHALL/MUST

3. **✅ Implement fix (GREEN)**
   - Modified `extractRequirementText()` in src/core/validation/validator.ts
   - Changed from collecting all lines and finding first non-empty
   - To: iterating through lines, skipping blanks and metadata fields
   - Returns first line that is NOT blank and NOT metadata pattern `/^\*\*[^*]+\*\*:/`
   - Fix implemented in commit c782462

4. **✅ Verify test passes without modification**
   - Test now passes with fixed code
   - No changes to test needed - acceptance criteria met
   - Validator correctly skips metadata and checks actual description

## Validation

5. **Run full test suite**
   - Execute `pnpm test` to ensure no regressions
   - All existing tests should pass
   - New test provides coverage for metadata field bug

6. **Validate proposal**
   - Run `openspec validate fix-metadata-field-validation-bug --strict`
   - Ensure proposal structure is correct
   - Confirm all sections present and valid
