# Technical Design

## Architecture Decisions

### Simplicity First
- No version tracking - always update when commanded
- Full replacement for Pastelsdd-managed files only (e.g., `pastelsdd/README.md`)
- Marker-based updates for user-owned files (e.g., `CLAUDE.md`)
- Templates bundled with package - no network required
- Minimal error handling - only check prerequisites

### Template Strategy
- Use existing template utilities
  - `readmeTemplate` from `src/core/templates/readme-template.ts` for `pastelsdd/README.md`
  - `TemplateManager.getClaudeTemplate()` for `CLAUDE.md`
- Directory name is fixed to `pastelsdd` (from `PASTELSDD_DIR_NAME`)

### File Operations
- Use async utilities for consistency
  - `FileSystemUtils.writeFile` for `pastelsdd/README.md`
  - `FileSystemUtils.updateFileWithMarkers` for `CLAUDE.md`
- No atomic operations needed - users have git
- Check directory existence before proceeding

## Implementation

### Update Command (`src/core/update.ts`)
```typescript
export class UpdateCommand {
  async execute(projectPath: string): Promise<void> {
    const pastelsddDirName = PASTELSDD_DIR_NAME;
    const pastelsddPath = path.join(projectPath, pastelsddDirName);

    // 1. Check pastelsdd directory exists
    if (!await FileSystemUtils.directoryExists(pastelsddPath)) {
      throw new Error(`No Pastelsdd directory found. Run 'pastelsdd init' first.`);
    }

    // 2. Update README.md (full replacement)
    const readmePath = path.join(pastelsddPath, 'README.md');
    await FileSystemUtils.writeFile(readmePath, readmeTemplate);

    // 3. Update CLAUDE.md (marker-based)
    const claudePath = path.join(projectPath, 'CLAUDE.md');
    const claudeContent = TemplateManager.getClaudeTemplate();
    await FileSystemUtils.updateFileWithMarkers(
      claudePath,
      claudeContent,
      PASTELSDD_MARKERS.start,
      PASTELSDD_MARKERS.end
    );

    // 4. Success message (ASCII-safe, checkmark optional by terminal)
    console.log('Updated Pastelsdd instructions');
  }
}
```

## Why This Approach

### Benefits
- **Dead simple**: ~40 lines of code total
- **Fast**: No version checks, minimal parsing
- **Predictable**: Same result every time; idempotent
- **Maintainable**: Reuses existing utilities

### Trade-offs Accepted
- No version tracking (unnecessary complexity)
- Full overwrite only for Pastelsdd-managed files
- Marker-managed updates for user-owned files

## Error Handling

Only handle critical errors:
- Missing `pastelsdd` directory → throw error handled by CLI to present a friendly message
- File write failures → let errors bubble up to CLI

## Testing Strategy

Manual smoke tests are sufficient initially:
1. Run `pastelsdd init` in a test project
2. Modify both files (including custom content around markers in `CLAUDE.md`)
3. Run `pastelsdd update`
4. Verify `pastelsdd/README.md` fully replaced; `CLAUDE.md` Pastelsdd block updated without altering user content outside markers
5. Run the command twice to verify idempotency and no duplicate markers
6. Test with missing `pastelsdd` directory (expect failure)