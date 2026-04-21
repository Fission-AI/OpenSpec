# Proposal: Fix Metadata Field Validation Bug

## Why

The requirement SHALL/MUST validation incorrectly checks metadata fields instead of the requirement description, causing false failures on valid requirements.

**The Bug**: When a requirement includes metadata fields (like `**ID**: REQ-001` or `**Priority**: P1`) immediately after the title, the validator extracts the first non-empty line as the "requirement text". This returns a metadata field like `**ID**: REQ-001`, which doesn't contain SHALL/MUST, causing validation to fail even when the actual requirement description contains proper normative keywords.

**Example that fails incorrectly**:
```markdown
### Requirement: File Serving
**ID**: REQ-FILE-001
**Priority**: P1

The system MUST serve static files from the root directory.
```

The validator checks `**ID**: REQ-FILE-001` for SHALL/MUST instead of checking `The system MUST serve...`, so it fails.

**Root Cause**: The `extractRequirementText()` method in validator.ts collected all lines after the requirement header, joined them, and returned the first non-empty line. It didn't skip metadata field lines (matching pattern `/^\*\*[^*]+\*\*:/`).

**Impact**: Users cannot use metadata fields in requirements without triggering false validation failures, blocking adoption of structured requirement metadata.

## What Changes

- **Fix** requirement text extraction to skip metadata field lines before finding the normative description
- **Add** comprehensive test coverage for requirements with metadata fields

## Impact

- **Modified specs**: cli-validate
- **Bug fix**: Resolves false positive validation failures
- **No breaking changes**: Existing valid requirements continue to pass; previously failing valid requirements now pass correctly
