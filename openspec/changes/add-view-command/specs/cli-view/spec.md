# CLI View Command Specification

## Purpose
Display comprehensive information about OpenSpec changes in a unified, easy-to-read format.

## Command Structure
```bash
openspec view [change-name]
```

## Behavior

### Viewing a Specific Change

WHEN a user runs `openspec view [change-name]`
THEN display a formatted view containing:
- Change name with timestamps (created, last updated)
- Progress bar showing task completion percentage
- Proposal content (why, what, impact)
- Task list grouped by sections with completion status
- Design decisions (if design.md exists)
- List of new and modified specs

### Listing All Changes

WHEN a user runs `openspec view` without a change name
THEN display a list of all available changes showing:
- Change name
- Directory location (changes/, archive/, abandoned/)
- Progress percentage (for active changes)
- Brief description from proposal

### Error Handling

WHEN a specified change doesn't exist
THEN display an error message and list available changes

WHEN change files are missing or malformed
THEN display available information and skip missing sections

WHEN terminal doesn't support Unicode
THEN fall back to ASCII characters for box drawing

## Example Output

### Viewing a Change
```bash
$ openspec view add-authentication

┌─────────────────────────────────────────────────────────┐
│ add-authentication                                       │
│ Created: 5 days ago | Updated: 2 hours ago             │
│ Progress: ████████████░░░░░ 70% (14/20 tasks)          │
├─────────────────────────────────────────────────────────┤
│ PROPOSAL                                                │
│                                                         │
│ Why: Need user authentication for secure access         │
│                                                         │
│ What:                                                   │
│ • Add JWT-based authentication                         │
│ • Create user registration flow                        │
│ • Implement login/logout endpoints                     │
│                                                         │
│ Impact:                                                 │
│ • New spec: user-auth                                  │
│ • Modified: api-core                                   │
│ • Code: src/auth/*, src/middleware/*                   │
├─────────────────────────────────────────────────────────┤
│ TASKS                                                   │
│                                                         │
│ Backend (8/10):                                        │
│ ✅ Create user model                                    │
│ ✅ Add password hashing                                 │
│ ✅ Implement JWT generation                             │
│ ⬜ Add refresh token logic                              │
│ ⬜ Create auth middleware                               │
│                                                         │
│ Frontend (6/10):                                       │
│ ✅ Create login form                                    │
│ ✅ Add registration page                                │
│ ⬜ Implement token storage                              │
│ ⬜ Add auth context                                     │
├─────────────────────────────────────────────────────────┤
│ SPEC CHANGES                                           │
│                                                         │
│ New capabilities:                                      │
│ • user-auth: Authentication and authorization          │
│                                                         │
│ Modified capabilities:                                 │
│ • api-core: Added auth middleware to request pipeline  │
└─────────────────────────────────────────────────────────┘
```

### Listing All Changes
```bash
$ openspec view

Available changes:

ACTIVE (openspec/changes/)
• add-authentication    - 70% complete - Add JWT-based authentication
• add-view-command      - 20% complete - Add view command for rich display
• refactor-parsers      - 60% complete - Improve parser performance

ARCHIVED (openspec/changes/archive/)
• 2025-01-11-add-init-command     - Initialize OpenSpec structure
• 2025-01-09-fix-path-traversal   - Security patch for file access
• 2025-01-08-update-dependencies  - Update to latest packages

ABANDONED (openspec/changes/abandoned/)
• add-status-command     - Superseded by view command
• add-websocket-support  - Out of scope for current phase
```