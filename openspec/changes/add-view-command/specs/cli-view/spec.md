# CLI View Command Specification

## Purpose
Display a concise summary of OpenSpec changes with focus on behavioral specifications (WHEN/THEN patterns) that define what the system will do differently.

## Command Structure
```bash
openspec view [change-name]
```

## Behavior

### Viewing a Specific Change

WHEN a user runs `openspec view [change-name]`
THEN display a tree-structured summary containing:
- Change name with status (active/archived/abandoned)
- Brief "why" statement from proposal
- Impact summary (count of new/modified specs)
- Behavioral changes extracted from specs
  - First 3-4 WHEN/THEN patterns per spec
  - Total behavior count if more than shown
  - Clear indication of NEW vs MODIFIED specs
- Reference to tasks.md and design.md if present

WHEN the change has many behavioral specifications
THEN show only the first 3-4 behaviors per spec
AND display count of remaining behaviors

WHEN specs contain WHEN/THEN patterns
THEN extract and display them in readable format
AND use arrow notation (→) for clarity

### Listing All Changes

WHEN a user runs `openspec view` without a change name
THEN display a list of all available changes showing:
- Change name
- Directory location (changes/, archive/, abandoned/)
- Brief "why" statement
- Count of specs affected

### Error Handling

WHEN a specified change doesn't exist
THEN display an error message and list available changes

WHEN spec files don't contain WHEN/THEN patterns
THEN show spec name with description if available

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
   ├─ WHEN user registers with valid email → THEN create account and send confirmation
   ├─ WHEN user logs in with correct credentials → THEN return JWT token
   ├─ WHEN user logs out → THEN invalidate token and clear session
   └─ ... 9 more behaviors

📝 api-core (MODIFIED - 3 new behaviors)
   ├─ WHEN request has valid JWT → THEN allow through middleware
   ├─ WHEN request has expired JWT → THEN return 401 unauthorized
   └─ WHEN request missing auth header → THEN return 401 for protected routes

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

📝 cli-view (NEW - 4 behaviors)
   ├─ WHEN user runs view with change name → THEN display behavioral summary
   ├─ WHEN user runs view without argument → THEN list all changes
   ├─ WHEN change doesn't exist → THEN show error and available changes
   └─ ... 1 more behavior

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