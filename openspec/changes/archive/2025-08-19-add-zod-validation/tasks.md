# Implementation Tasks (Foundation Phase)

## 1. Core Schemas
- [x] 1.1 Add zod dependency to package.json
- [x] 1.2 Create src/core/schemas/base.schema.ts with ScenarioSchema and RequirementSchema
- [x] 1.3 Create src/core/schemas/spec.schema.ts with SpecSchema
- [x] 1.4 Create src/core/schemas/change.schema.ts with DeltaSchema and ChangeSchema
- [x] 1.5 Create src/core/schemas/index.ts to export all schemas

## 2. Parser Implementation
- [x] 2.1 Create src/core/parsers/markdown-parser.ts
- [x] 2.2 Implement heading extraction (##, ###, ####)
- [x] 2.3 Implement content capture between headings
- [x] 2.4 Add tests for parser edge cases

## 3. Validation Infrastructure
- [x] 3.1 Create src/core/validation/types.ts with ValidationLevel, ValidationIssue, ValidationReport types
- [x] 3.2 Create src/core/validation/constants.ts with validation rules and thresholds
- [x] 3.3 Create src/core/validation/validator.ts with SpecValidator and ChangeValidator classes

## 4. Enhanced Validation Rules
- [x] 4.1 Add RequirementValidation refinements (must have scenarios, must contain SHALL)
- [x] 4.2 Add SpecValidation refinements (must have requirements)
- [x] 4.3 Add ChangeValidation refinements (must have deltas, why section length)
- [x] 4.4 Implement custom error messages for each rule

## 5. JSON Converter
- [x] 5.1 Create src/core/converters/json-converter.ts
- [x] 5.2 Implement spec-to-JSON conversion
- [x] 5.3 Implement change-to-JSON conversion
- [x] 5.4 Add metadata fields (version, format, sourcePath)

## 6. Archive Command Enhancement
- [x] 6.1 Add pre-archive validation check using new validators
- [x] 6.2 Add --no-validate flag with required confirmation prompt and warning message: "⚠️  WARNING: Skipping validation may archive invalid specs. Continue? (y/N)"
- [x] 6.3 Display validation errors before aborting
- [x] 6.4 Log all --no-validate usages to console with timestamp and affected files
- [x] 6.5 Add tests for validation scenarios including --no-validate confirmation flow

## 7. Diff Command Enhancement
- [x] 7.1 Add validation check before diff using new validators
- [x] 7.2 Show validation warnings (non-blocking)
- [x] 7.3 Continue with diff even if warnings present

## 8. Testing
- [x] 8.1 Unit tests for all schemas
- [x] 8.2 Unit tests for parser
- [x] 8.3 Unit tests for validation rules
- [x] 8.4 Integration tests for validation reports
- [x] 8.5 Test various invalid spec/change formats
- [x] 8.6 Test strict mode behavior
- [x] 8.7 Test pre-archive validation
- [x] 8.8 Test validation report JSON output

## 9. Documentation
- [x] 9.1 Document schema structure and validation rules (pastelsdd/VALIDATION.md)
- [x] 9.2 Update CLI help for archive (document --no-validate flag and its warnings)
- [x] 9.3 Update CLI help for diff (document validation warnings behavior)
- [x] 9.4 Create migration guide for future command integration (pastelsdd/MIGRATION.md)