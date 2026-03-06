## 1. Keyword registry

- [x] 1.1 Add `NORMATIVE_KEYWORDS` constant to `src/core/validation/constants.ts` with `en: ['SHALL', 'MUST']` and `es: ['DEBE', 'DEBERA']`
- [x] 1.2 Add `containsNormativeKeyword(text: string): boolean` function in `src/core/validation/constants.ts` that checks all keywords using word-boundary regex
- [x] 1.3 Update `VALIDATION_MESSAGES.REQUIREMENT_NO_SHALL` to list all accepted keywords (e.g., `SHALL, MUST, DEBE, DEBERA`)
- [x] 1.4 Precompile keyword regex patterns at module load instead of creating them on each call

## 2. Schema integration

- [x] 2.1 Update `RequirementSchema` refinement in `src/core/schemas/base.schema.ts` to call `containsNormativeKeyword()` instead of hardcoded `includes('SHALL') || includes('MUST')`

## 3. Validator integration

- [x] 3.1 Update `containsShallOrMust()` in `src/core/validation/validator.ts` to call `containsNormativeKeyword()` instead of hardcoded regex
- [x] 3.2 Update delta validation error messages in `validateChangeDeltaSpecs()` to reference all accepted keywords

## 4. Tests

- [x] 4.1 Add unit tests for `containsNormativeKeyword()` covering: English keywords, Spanish keywords, accented variant (`DEBERÁ`), lowercase rejection, substring rejection
- [x] 4.2 Add/update schema validation tests in `test/core/validation.test.ts` to verify Spanish keywords pass `RequirementSchema`
- [x] 4.3 Add/update delta validation tests to verify ADDED/MODIFIED requirements with Spanish keywords pass `validateChangeDeltaSpecs()`
- [x] 4.4 Verify existing English-keyword tests still pass (no regressions)
- [x] 4.5 Add tests for keywords adjacent to punctuation (`SHALL,`, `(SHALL`, `DEBE:`)

## 5. Documentation

- [x] 5.1 Update `docs/multi-language.md` to mention that Spanish normative keywords (`DEBE`, `DEBERA`) are accepted by the validator
