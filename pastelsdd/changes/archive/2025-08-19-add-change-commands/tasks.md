# Implementation Tasks (Phase 2: Builds on add-zod-validation)

## 1. Command Implementation
- [x] 1.1 Create src/commands/change.ts
- [x] 1.2 Import ChangeSchema and DeltaSchema from src/core/schemas/change.schema.ts
- [x] 1.3 Import markdown parser from src/core/parsers/markdown-parser.ts
- [x] 1.4 Import ChangeValidator from src/core/validation/validator.ts
- [x] 1.5 Import JSON converter from src/core/converters/json-converter.ts
- [x] 1.6 Implement show subcommand with JSON output using existing converter
- [x] 1.7 Implement list subcommand
- [x] 1.8 Implement validate subcommand using existing ChangeValidator
- [x] 1.9 Add --requirements-only filtering option
- [x] 1.10 Add --strict mode support (leveraging existing validation infrastructure)
- [x] 1.11 Add --json flag for validation reports

## 2. Change-Specific Parser Extensions
- [x] 2.1 Create src/core/parsers/change-parser.ts (extends base markdown parser)
- [x] 2.2 Parse proposal structure (Why, What Changes sections)
- [x] 2.3 Extract ADDED/MODIFIED/REMOVED/RENAMED sections
- [x] 2.4 Parse delta operations within each section
- [x] 2.5 Add tests for change parser

## 3. Legacy Compatibility
- [x] 3.1 Update src/core/list.ts to add deprecation notice
- [x] 3.2 Ensure existing list command continues to work
- [x] 3.3 Add console warning for deprecated command usage

## 4. Integration
- [x] 4.1 Register change command in src/cli/index.ts
- [ ] 4.2 Add integration tests for all subcommands
- [x] 4.3 Test JSON output for changes
- [x] 4.4 Test legacy compatibility
- [x] 4.5 Test validation with strict mode
- [x] 4.6 Update CLI help documentation (add 'change' command to main help, document subcommands: show, list, validate)