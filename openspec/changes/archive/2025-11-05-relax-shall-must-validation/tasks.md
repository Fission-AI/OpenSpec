# Tasks

## Implementation
- [ ] Update `src/core/validation/validator.ts` line 166: change SHALL/MUST check from ERROR to WARNING for ADDED requirements
- [ ] Update `src/core/validation/validator.ts` line 187: change SHALL/MUST check from ERROR to WARNING for MODIFIED requirements
- [ ] Update error message to be more guidance-focused (recommend rather than require)

## Testing
- [ ] Add test case: requirement without SHALL/MUST passes validation with WARNING
- [ ] Add test case: requirement without SHALL/MUST fails with ERROR in --strict mode
- [ ] Add test case: non-English requirement text (e.g., Chinese "必须") validates successfully with WARNING
- [ ] Run existing test suite to ensure no regressions

## Validation
- [ ] Run `openspec validate relax-shall-must-validation --strict` and resolve all issues
- [ ] Test with English spec (should show WARNING for missing SHALL/MUST)
- [ ] Test with non-English spec (should show WARNING but pass)
- [ ] Test with --strict mode (should fail on WARNING)
