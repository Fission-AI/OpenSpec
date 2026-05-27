# Design: Spec Commands

## Architecture Decisions

### Command Hierarchy
We chose a subcommand pattern (`spec show`, `spec list`, `spec validate`) to:
- Group related functionality under a common namespace
- Enable future extensibility without polluting the top-level CLI
- Maintain consistency with the planned `change` command structure

### JSON Schema Structure
The spec JSON schema follows this structure:
```typescript
{
  version: string,        // Schema version for compatibility
  format: "spec",        // Identifies this as a spec document
  sourcePath: string,    // Original markdown file path
  id: string,           // Spec identifier from filename
  title: string,        // Human-readable title
  overview?: string,    // Optional overview section
  requirements: Array<{
    id: string,
    text: string,
    scenarios: Array<{
      id: string,
      text: string
    }>
  }>
}
```

**Rationale:**
- Flat structure for requirements array (vs nested objects) for easier iteration
- Scenarios nested within requirements to maintain relationship
- Metadata fields (version, format, sourcePath) for tooling integration

### Parser Architecture
- **Markdown-first approach**: Parse markdown headings rather than custom syntax
- **Streaming parser**: Process line-by-line to handle large files efficiently
- **Strict heading hierarchy**: Enforce ##/###/#### structure for consistency

### Validation Strategy
- **Parse-time validation**: Catch structural issues during parsing
- **Schema validation**: Use Zod for runtime type checking of parsed data
- **Separate validation command**: Allow validation without full parsing/conversion