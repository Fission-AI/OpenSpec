# Technical Design for Init Command

## Architecture Overview

The init command follows a modular architecture with clear separation of concerns:

```
CLI Layer (src/cli/index.ts)
    ↓
Core Logic (src/core/init.ts)
    ↓
Templates (src/core/templates/)
    ↓
File System Utils (src/utils/file-system.ts)
```

## Key Design Decisions

### 1. Template Management

**Decision**: Store templates as TypeScript modules rather than separate files
**Rationale**: 
- Ensures templates are bundled with the compiled code
- Allows for dynamic content insertion
- Type-safe template handling
- No need for complex file path resolution

### 2. Interactive vs Non-Interactive Mode

**Decision**: Support both interactive (default) and non-interactive modes
**Rationale**:
- Interactive mode for developer experience
- Non-interactive for CI/CD and automation
- Flags: `--yes` to accept defaults, `--no-input` for full automation

### 3. Directory Structure Creation

**Decision**: Create all directories upfront, then populate files
**Rationale**:
- Fail fast if permissions issues
- Clear transaction boundary
- Easier to clean up on failure

### 4. Error Handling Strategy

**Decision**: Implement rollback on failure
**Rationale**:
- Prevent partial installations
- Clear error states
- Better user experience

## Implementation Details

### File System Operations

```typescript
// Atomic directory creation with rollback
interface InitTransaction {
  createdPaths: string[];
  rollback(): Promise<void>;
  commit(): Promise<void>;
}
```

### Template System

```typescript
interface Template {
  path: string;
  content: string | ((context: ProjectContext) => string);
}

interface ProjectContext {
  projectName: string;
  description: string;
  techStack: string[];
  conventions: string;
}
```

### CLI Command Structure

```bash
pastelsdd init [path]           # Initialize in specified path (default: current directory)
  --yes                       # Accept all defaults
  --no-input                  # Skip all prompts
  --force                     # Overwrite existing Pastelsdd directory
  --dry-run                   # Show what would be created
```

## Security Considerations

1. **Path Traversal**: Sanitize all user-provided paths
2. **File Permissions**: Check write permissions before starting
3. **Existing Files**: Never overwrite without explicit --force flag
4. **Template Injection**: Sanitize user inputs in templates

## Future Extensibility

The design supports future enhancements:
- Custom template sources
- Project type presets (API, web app, library)
- Migration from other documentation systems
- Integration with version control systems