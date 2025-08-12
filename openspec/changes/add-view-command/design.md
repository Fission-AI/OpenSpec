# View Command Design

## Architecture Decisions

### Single Unified View
The view command will provide a single, comprehensive display of a change that aggregates all relevant information in one place.

### Display Components

The view will show the following sections in order:

1. **Header**
   - Change name
   - Creation date and last update
   - Overall progress percentage

2. **Proposal Section**
   - Why: Problem statement
   - What: List of changes
   - Impact: Affected specs and code

3. **Progress Section**
   - Task completion visualization
   - Completed vs total tasks count
   - Task groups if present

4. **Design Section** (if design.md exists)
   - Key architectural decisions
   - Technical approach summary

5. **Spec Changes**
   - List of new specs added
   - List of modified specs
   - Brief description of changes

### Data Collection

1. **Change Discovery**
   - Accept change name as argument
   - If no argument, list available changes
   - Look in `openspec/changes/`, `archive/`, and `abandoned/` directories

2. **File Parsing**
   - Parse proposal.md for metadata
   - Parse tasks.md for progress calculation
   - Parse design.md if present
   - Scan specs/ directory for changed specifications

3. **Progress Calculation**
   - Count `[x]` vs `[ ]` checkboxes in tasks.md
   - Calculate percentage completion
   - Group by headers if present

### Display Format

1. **Terminal Output**
   - Use box drawing characters for structure
   - Color coding for different sections
   - Progress bar visualization
   - Clear visual hierarchy

2. **Graceful Degradation**
   - Fall back to ASCII if Unicode not supported
   - Handle missing files gracefully
   - Show available information even if some files are missing

## Technical Implementation

### Core Components

1. **ChangeParser**
   - Reads and parses change files
   - Extracts structured data from markdown
   - Handles missing files gracefully

2. **ProgressCalculator**
   - Counts task checkboxes
   - Calculates completion percentage
   - Groups tasks by sections

3. **ChangeRenderer**
   - Formats output for terminal display
   - Manages visual hierarchy
   - Handles terminal capabilities

### Error Handling

1. **Missing Change**
   - Show helpful error if change doesn't exist
   - List available changes

2. **Malformed Files**
   - Continue with partial information
   - Show warnings for problematic sections

## Example Output

```
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