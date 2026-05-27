## 1. Enhance validation messages
- [x] 1.1 Add remediation guidance for "No deltas found"
- [x] 1.2 Include file path and structured path in all issues
- [x] 1.3 Improve messages for missing required sections (Spec, Change)
- [x] 1.4 Detect likely misformatted scenarios and warn with conversion example
- [x] 1.5 Add "Next steps" footer for non-JSON invalid output

## 2. Update constants and helpers
- [x] 2.1 Centralize guidance snippets in `VALIDATION_MESSAGES`
- [x] 2.2 Provide minimal skeleton examples for missing sections

## 3. Parser integration
- [x] 3.1 Capture parser-thrown errors and wrap with richer context
- [x] 3.2 Add file/section references to surfaced parser errors

## 4. Tests
- [x] 4.1 Unit tests for validator message composition
- [x] 4.2 CLI integration tests for human-readable output (with footer)
- [x] 4.3 JSON mode tests (structure unchanged, content enriched)


