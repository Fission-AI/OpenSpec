# View Command Design

## Architecture Decisions

### Focus on System Requirements
The view command will prioritize showing requirements identified by @requirement markers in specs, as these define what the system must fulfill. Instead of trying to display all content, we focus on what matters most: the requirements being added or modified.

### Display Components

The view will show a concise summary with requirement focus:

1. **Header**
   - Change name and status (active/archived/abandoned)
   - Brief "why" from proposal

2. **Impact Summary**
   - Count of new/modified specs
   - Total number of requirements

3. **Requirements**
   - Extracted from @requirement markers in specs
   - First few requirement identifiers and descriptions shown
   - Count indicator for additional requirements
   - Grouped by spec (new vs modified)

### Data Collection

1. **Change Discovery**
   - Accept change name as argument
   - If no argument, list available changes
   - Scan `openspec/changes/`, `archive/`, and `abandoned/` directories

2. **Requirement Extraction**
   - Parse spec.md files in changes/[name]/specs/
   - Extract @requirement markers and their identifiers
   - Count total requirements per spec
   - Identify new vs modified specs by comparing with openspec/specs/

3. **Proposal Parsing**
   - Extract brief "why" statement (first sentence/paragraph)
   - Count tasks if tasks.md exists
   - Note presence of design.md

### Display Strategy

1. **Concise Summary**
   - Show just enough to understand the change
   - Point to files for full details
   - Focus on system requirements

2. **Progressive Detail**
   - Show first 3-4 requirements per spec
   - Indicate total count if more exist
   - Collapse modified specs to just count by default

## Technical Implementation

### Core Components

1. **ChangeParser**
   - Reads change directory structure
   - Extracts brief proposal summary
   - Handles missing files gracefully

2. **RequirementExtractor**
   - Parses spec.md files for @requirement markers
   - Extracts requirement identifier and description
   - Counts and categorizes requirements
   - Compares with existing specs for new/modified classification

3. **ChangeRenderer**
   - Formats compact terminal output
   - Uses tree structure for clarity
   - Emphasizes requirement changes

### Pattern Matching

```javascript
// Extract @requirement markers and identifiers
const requirementPattern = /@requirement\s+([\w-]+)/g;

// Extract the description from the following WHEN clause
const extractDescription = (content, markerIndex) => {
  const whenMatch = content.slice(markerIndex).match(/WHEN\s+(.+?)(?=THEN|\n\n|$)/s);
  return whenMatch ? whenMatch[1].trim() : null;
};
```

### Error Handling

1. **Missing Files**
   - Show what's available
   - Skip missing sections gracefully
   - Handle specs without @requirement markers

2. **Large Spec Files**
   - Show first few requirements
   - Provide count of remaining
   - Don't attempt to show all

## Example Output

```
add-authentication (active)
├─ Why: User authentication needed for secure access
├─ Impact: 2 new specs, 1 modified
└─ Requirements:

📝 user-auth (NEW - 12 requirements)
   ├─ user-register: User registration with email validation
   ├─ user-login: JWT-based authentication
   ├─ user-logout: Session invalidation
   └─ ... 9 more requirements

📝 api-core (MODIFIED - 3 new requirements)
   ├─ validate-jwt: Check JWT token in middleware
   ├─ handle-expired-token: Return 401 for expired tokens
   └─ require-auth: Enforce authentication on protected routes

📝 user-profile (NEW - 5 requirements)
   └─ ... 5 requirements defined

Tasks: 20 defined (see tasks.md)
Design: Architecture decisions available (see design.md)
```

## Benefits of This Approach

1. **Immediate Understanding**: Developers see what the system will do differently
2. **Concise Display**: Fits in a terminal window without scrolling
3. **Actionable Information**: Points to files for deeper investigation
4. **Requirements Focus**: Emphasizes requirements over implementation details