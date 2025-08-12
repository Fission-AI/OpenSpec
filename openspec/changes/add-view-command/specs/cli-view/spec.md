# CLI View Command Specification

## Purpose
Display a concise summary of OpenSpec changes with focus on behavioral specifications (WHEN/THEN patterns) that define what the system will do differently.

## Command Structure
```bash
openspec view [change-name]
```

## Behavior

### Viewing a Specific Change

@behavior view-specific-change
WHEN a user runs `openspec view [change-name]`
THEN display a tree-structured summary containing:
- Change name with status (active/archived/abandoned)
- Brief "why" statement from proposal
- Impact summary (count of new/modified specs)
- Behavioral changes extracted from specs using @behavior markers
  - First 3-4 behavior descriptions per spec
  - Total behavior count if more than shown
  - Clear indication of NEW vs MODIFIED specs
- Reference to tasks.md and design.md if present

@behavior show-limited-behaviors
WHEN the change has many behavioral specifications
THEN show only the first 3-4 behaviors per spec
AND display count of remaining behaviors

@behavior extract-behavior-markers
WHEN specs contain @behavior markers
THEN extract the behavior identifier and description
AND display them in a readable tree format

### Listing All Changes

@behavior list-all-changes
WHEN a user runs `openspec view` without a change name
THEN display a list of all available changes showing:
- Change name
- Directory location (changes/, archive/, abandoned/)
- Brief "why" statement
- Count of specs affected

### Error Handling

@behavior handle-missing-change
WHEN a specified change doesn't exist
THEN display an error message and list available changes

@behavior handle-missing-markers
WHEN spec files don't contain @behavior markers
THEN show spec name with description if available
AND indicate that behaviors could not be extracted

@behavior handle-missing-files
WHEN change files are missing or malformed
THEN display available information and skip missing sections

## Example Output

### Viewing a Change with Behavioral Focus
```bash
$ openspec view add-authentication

add-authentication (active)
├─ Why: User authentication needed for secure access
├─ Impact: 2 new specs, 1 modified
└─ Behavioral Changes:

📝 user-auth (NEW - 12 behaviors)
   ├─ user-register: User registration with email validation
   ├─ user-login: JWT-based authentication
   ├─ user-logout: Session invalidation
   └─ ... 9 more behaviors

📝 api-core (MODIFIED - 3 new behaviors)
   ├─ validate-jwt: Check JWT token in middleware
   ├─ handle-expired-token: Return 401 for expired tokens
   └─ require-auth: Enforce authentication on protected routes

📝 user-profile (NEW - 5 behaviors)
   └─ ... 5 behaviors defined

Tasks: 20 defined (see tasks.md)
Design: Architecture decisions available (see design.md)
```

### Viewing a Simpler Change
```bash
$ openspec view add-view-command

add-view-command (active)
├─ Why: Need unified display of change information
├─ Impact: 1 new spec
└─ Behavioral Changes:

📝 cli-view (NEW - 7 behaviors)
   ├─ view-specific-change: Display change summary with behaviors
   ├─ list-all-changes: Show all available changes
   ├─ handle-missing-change: Error handling for invalid changes
   └─ ... 4 more behaviors

Tasks: 27 defined (see tasks.md)
Design: Architecture decisions available (see design.md)
```

### Listing All Changes
```bash
$ openspec view

Available changes:

ACTIVE (openspec/changes/)
• add-authentication - User authentication needed for secure access (3 specs)
• add-view-command - Need unified display of change information (1 spec)
• refactor-parsers - Improve parser performance (2 specs modified)

ARCHIVED (openspec/changes/archive/)
• 2025-01-11-add-init-command - Initialize OpenSpec structure (2 specs)
• 2025-01-09-fix-path-traversal - Security patch for file access (1 spec)

ABANDONED (openspec/changes/abandoned/)
• add-status-command - Superseded by view command (1 spec)
```