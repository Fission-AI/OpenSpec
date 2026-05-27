# Design: Zod Validation Framework

## Architecture Decisions

### Validation Levels
Three-tier validation system:
1. **ERROR**: Structural issues that prevent parsing (must fix)
2. **WARNING**: Quality issues that should be addressed (recommended fix)
3. **INFO**: Suggestions for improvement (optional)

**Rationale:** 
- Gradual enforcement allows teams to adopt validation incrementally
- CI/CD can fail on errors but allow warnings initially
- Info level provides guidance without blocking

### Validation Rules Hierarchy

#### Spec Validation Rules
```
ERROR level:
- Missing ## Overview or ## Requirements sections
- Invalid heading hierarchy
- Malformed requirement/scenario structure

WARNING level:
- Requirements without scenarios
- Requirements missing SHALL keyword
- Empty overview section

INFO level:
- Very long requirement text (>500 chars)
- Scenarios without Given/When/Then structure
```

#### Change Validation Rules
```
ERROR level:
- Missing ## Why or ## What Changes sections
- Invalid delta operation types
- Malformed delta structure

WARNING level:
- Why section too brief (<50 chars)
- Deltas without clear descriptions
- Missing requirements in ADDED/MODIFIED

INFO level:
- Very long why section (>1000 chars)
- Too many deltas in single change (>10)
```

### Strict Mode
- **Default**: Show all levels, fail on ERROR only
- **--strict flag**: Fail on both ERROR and WARNING
- **Use case**: Gradual quality improvement in CI/CD pipelines

### Archive Command Safety
**Problem:** Invalid specs could be archived, polluting the archive.

**Solution:** 
1. Pre-archive validation (default behavior)
2. --no-validate flag with safeguards:
   - Interactive confirmation prompt
   - Prominent warning message
   - Console logging with timestamp
   - Not recommended for CI/CD usage

**Rationale:**
- Protect archive integrity by default
- Allow emergency overrides with accountability
- Clear audit trail for validation bypasses

### Validation Report Format
```json
{
  "valid": boolean,
  "issues": [
    {
      "level": "ERROR" | "WARNING" | "INFO",
      "path": "requirements[0].scenarios",
      "message": "Requirement must have at least one scenario",
      "line": 15,
      "column": 0
    }
  ],
  "summary": {
    "errors": 2,
    "warnings": 5,
    "info": 3
  }
}
```

**Benefits:**
- Machine-readable for tooling integration
- Human-friendly messages
- Line/column info for IDE integration
- Summary for quick assessment

### Implementation Strategy
1. **Zod schemas with refinements**: Built-in validation in type definitions
2. **Custom validators**: Additional business logic validation
3. **Composable rules**: Mix and match for different contexts
4. **Extensible framework**: Easy to add new rules without refactoring