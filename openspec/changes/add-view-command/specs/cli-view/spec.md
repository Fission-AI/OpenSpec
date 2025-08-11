# CLI View Command Specification

## Purpose
Display comprehensive information about OpenSpec changes with rich formatting, progress tracking, and impact analysis.

## Command Structure
```bash
openspec view [change-name] [options]
```

## Options
- `--detailed, -d` - Show complete change information including all sections
- `--diff` - Display spec changes in diff format
- `--format <type>` - Output format: terminal (default), json, ai
- `--interactive, -i` - Launch interactive viewer with navigation
- `--compare <change>` - Compare two changes side-by-side
- `--timeline` - Show temporal view of all changes
- `--related` - Display dependency graph for the change
- `--list, -l` - List all available changes with status

## Behavior

### Default View (Summary Mode)

WHEN a user runs `openspec view [change-name]`
THEN display:
- Change title and current status (ACTIVE/ARCHIVED/ABANDONED)
- Creation and last update timestamps
- Progress bar with completion percentage and task count
- Team breakdown if tasks are grouped
- Impact summary (affected specs, breaking changes)
- Recent activity (last 3 completed tasks)

WHEN no change name is provided
THEN display a list of all changes grouped by status

WHEN run from within a change directory
THEN automatically view that change

### Detailed View

WHEN a user runs `openspec view [change-name] --detailed`
THEN display:
- Everything from summary mode
- Complete proposal content (why, what, impact)
- Full task list with completion checkboxes
- Design decisions if design.md exists
- Complete list of spec changes
- Related changes and dependencies

### Diff Mode

WHEN a user runs `openspec view [change-name] --diff`
THEN display:
- Side-by-side comparison of current vs future specs
- Added capabilities marked with +
- Removed capabilities marked with -
- Modified capabilities with inline diffs
- Summary of behavioral changes

### Output Formats

WHEN a user runs `openspec view [change-name] --format=json`
THEN output structured JSON containing:
- All change metadata
- Parsed task completion data
- Spec change analysis
- Impact assessment

WHEN a user runs `openspec view [change-name] --format=ai`
THEN output optimized text for AI consumption:
- Consolidated change context
- Clear task boundaries
- Pre-computed impact analysis
- Relevant specs included inline

### Interactive Mode

WHEN a user runs `openspec view --interactive`
THEN launch interactive viewer with:
- List of all changes navigable with arrow keys
- Enter to expand/collapse sections
- Tab to switch between changes
- / to search within current view
- q to quit
- t to toggle task completion (if permissions allow)
- a to archive completed change

### Comparison Mode

WHEN a user runs `openspec view --compare change1 change2`
THEN display side-by-side:
- Proposal differences
- Task list comparison
- Overlapping vs unique spec changes
- Timeline comparison

### Timeline View

WHEN a user runs `openspec view --timeline`
THEN display chronological view showing:
- Changes over time with visual timeline
- Deployment dates for archived changes
- Current progress for active changes
- Abandonment reasons for abandoned changes
- Velocity trends

### List Mode

WHEN a user runs `openspec view --list`
THEN display table with:
- Change name
- Status (with color coding)
- Progress percentage
- Last update
- Primary affected capability

## Error Handling

WHEN a specified change doesn't exist
THEN display error message and suggest similar change names

WHEN change files are malformed or missing
THEN display available information with warnings for missing sections

WHEN terminal doesn't support Unicode/colors
THEN fall back to ASCII characters and no colors

## Performance

WHEN viewing large changes (>100 tasks)
THEN paginate task list and provide navigation

WHEN repeatedly viewing same change within 60 seconds
THEN use cached parsed data for faster display

WHEN viewing multiple changes in sequence
THEN preload next likely change in background

## Examples

### View active change with progress
```bash
$ openspec view add-authentication

┌─────────────────────────────────────────────────────────┐
│ CHANGE: add-authentication                  [ACTIVE]     │
│ Created: 5 days ago | Last updated: 2 hours ago         │
├─────────────────────────────────────────────────────────┤
│ PROGRESS: ████████████░░░░░ 70% (14/20 tasks)          │
│ Teams: Backend (8/10), Frontend (6/10)                  │
├─────────────────────────────────────────────────────────┤
│ IMPACT:                                                 │
│   Specs: user-auth (new), api-core (modified)          │
│   Breaking: No breaking changes                         │
│   Systems: 3 services affected                          │
├─────────────────────────────────────────────────────────┤
│ RECENT:                                                 │
│   ✅ Implement JWT token generation (2 hours ago)       │
│   ✅ Add password hashing logic (5 hours ago)          │
│   ✅ Create user model schema (1 day ago)              │
└─────────────────────────────────────────────────────────┘
```

### View with diff format
```bash
$ openspec view add-authentication --diff

SPEC CHANGES for add-authentication:

📝 user-auth (NEW CAPABILITY)
  + POST /auth/register
  + POST /auth/login  
  + POST /auth/logout
  + GET /auth/profile

📝 api-core (MODIFIED)
  ~ Added authentication middleware
  ~ Modified request pipeline
  
  Before:                          After:
  │ 1. Parse request              │ 1. Parse request
  │ 2. Validate                   │ 2. Authenticate ← NEW
  │ 3. Process                    │ 3. Validate
  │ 4. Respond                    │ 4. Process
                                   │ 5. Respond
```

### Interactive mode navigation
```bash
$ openspec view -i

OpenSpec Changes (↑↓ navigate, ↵ expand, / search, q quit)

ACTIVE (3)
→ add-authentication      ████████████░░░░ 70%  Backend, Frontend
  add-view-command        ███░░░░░░░░░░░░░ 20%  CLI
  refactor-parsers        █████████░░░░░░░ 60%  Core

ARCHIVED (15)
  2025-01-11 add-init-command       ✅ Deployed 3 days ago
  2025-01-09 fix-path-traversal     ✅ Security patch
  2025-01-08 update-dependencies    ✅ Routine maintenance
  
ABANDONED (2)
  add-status-command                 ❌ Superseded by view command
  add-websocket-support              ❌ Out of scope
```