# Change: Add View Dashboard Command

## Why

Users need a quick, at-a-glance overview of their Pastelsdd project status without running multiple commands. Currently, users must run `pastelsdd list --changes` and `pastelsdd list --specs` separately to understand the project state. A unified dashboard view would improve developer experience and provide immediate insight into project progress.

## What Changes

### Added `pastelsdd view` Command

The new command provides an interactive dashboard displaying:
- Summary metrics (total specs, requirements, changes, task progress)
- Active changes with visual progress bars
- Completed changes
- Specifications with requirement counts

### Specifications Affected

- **cli-view** (NEW): Complete specification for the view dashboard command

## Implementation Details

### File Structure
- Created `/src/core/view.ts` implementing the `ViewCommand` class
- Registered command in `/src/cli/index.ts`
- Reuses existing utilities from `task-progress.ts` and `MarkdownParser`

### Visual Design
- Uses Unicode box drawing characters for borders
- Color coding: cyan for specs, yellow for active, green for completed
- Progress bars using filled (█) and empty (░) blocks
- Clean alignment with proper padding

### Technical Approach
- Async data fetching from changes and specs directories
- Parallel processing of specs and changes
- Error handling for missing or invalid data
- Maintains consistency with existing list command output