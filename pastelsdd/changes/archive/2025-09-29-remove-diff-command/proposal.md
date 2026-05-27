# Remove Diff Command

## Problem

The `pastelsdd diff` command adds unnecessary complexity to the Pastelsdd CLI for several reasons:

1. **Redundant functionality**: The `pastelsdd show` command already provides comprehensive visualization of changes through structured JSON output and markdown rendering
2. **Maintenance burden**: The diff command requires a separate dependency (jest-diff) and additional code complexity (~227 lines)
3. **Limited value**: Developers can achieve better diff visualization using existing tools:
   - Git diff for actual file changes
   - The `show` command for structured change viewing
   - Standard diff utilities for comparing spec files directly
4. **Inconsistent with verb-noun pattern**: The command doesn't follow the preferred verb-first command structure that other commands are migrating to

## Solution

Remove the `pastelsdd diff` command entirely and guide users to more appropriate alternatives:

1. **For viewing change content**: Use `pastelsdd show <change-name>` which provides:
   - Structured JSON output with `--json` flag
   - Markdown rendering for human-readable format
   - Delta-only views with `--deltas-only` flag
   - Full spec content visualization

2. **For comparing files**: Use standard tools:
   - `git diff` for version control comparisons
   - System diff utilities for file-by-file comparisons
   - IDE diff viewers for visual comparisons

## Benefits

- **Reduced complexity**: Removes ~227 lines of code and the jest-diff dependency
- **Clearer user journey**: Directs users to the canonical `show` command for viewing changes
- **Lower maintenance**: Fewer commands to maintain and test
- **Better alignment**: Focuses on the core Pastelsdd workflow without redundant features

## Implementation

### Files to Remove
- `/src/core/diff.ts` - The entire diff command implementation
- `/pastelsdd/specs/cli-diff/spec.md` - The diff command specification

### Files to Update
- `/src/cli/index.ts` - Remove diff command registration (lines 8, 84-96)
- `/package.json` - Remove jest-diff dependency
- `/README.md` - Remove diff command documentation
- `/pastelsdd/README.md` - Remove diff command references
- Various documentation files mentioning `pastelsdd diff`

### Migration Guide for Users

Users currently using `pastelsdd diff` should transition to:

```bash
# Before
pastelsdd diff add-feature

# After - view the change proposal
pastelsdd show add-feature

# After - view only the deltas
pastelsdd show add-feature --json --deltas-only

# After - use git for file comparisons
git diff pastelsdd/specs pastelsdd/changes/add-feature/specs
```

## Risks

- **User disruption**: Existing users may have workflows depending on the diff command
  - Mitigation: Provide clear migration guide and deprecation period
  
- **Loss of visual diff**: The colored, unified diff format will no longer be available
  - Mitigation: Users can use git diff or other tools for visual comparisons

## Success Metrics

- Successful removal with no broken dependencies
- Documentation updated to reflect the change
- Tests passing without the diff command
- Reduced package size from removing jest-diff dependency