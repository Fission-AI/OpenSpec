# Design: Change Commands

## Architecture Decisions

### Command Structure
Similar to spec commands, we use subcommands (`change show`, `change list`, `change validate`) for:
- Consistency with spec command pattern
- Clear separation of concerns
- Future extensibility for change management features

### JSON Schema for Changes
```typescript
{
  version: string,           // Schema version
  format: "change",         // Identifies as change document
  sourcePath: string,       // Original markdown file path
  id: string,              // Change identifier
  title: string,           // Change title
  why: string,            // Motivation section
  whatChanges: Array<{
    type: "ADDED" | "MODIFIED" | "REMOVED" | "RENAMED",
    deltas: Array<{
      specId: string,
      description: string,
      requirements?: Array<Requirement>  // Only for ADDED/MODIFIED
    }>
  }>
}
```

**Rationale:**
- Group deltas by operation type for clearer organization
- Optional requirements field (only relevant for ADDED/MODIFIED)
- Reuse RequirementSchema from spec commands for consistency

### Delta Operations
**Four operation types:**
1. **ADDED**: New requirements added to specs
2. **MODIFIED**: Changes to existing requirements
3. **REMOVED**: Requirements being deleted
4. **RENAMED**: Spec identifier changes

**Design choice:** Explicit operation types rather than diff-based approach for:
- Human readability in markdown
- Clear intent communication
- Easier validation and tooling

### Dependency on Spec Commands
- **Shared schemas**: RequirementSchema and ScenarioSchema reused
- **Implementation order**: spec commands must be implemented first
- **Common parser utilities**: Share markdown parsing logic

### Legacy Compatibility
- Keep existing `list` command functional with deprecation warning
- Migration path: `list` → `change list` with same functionality
- Gradual transition to avoid breaking existing workflows