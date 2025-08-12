# View Command Design

## Architecture Decisions

### Focus on Behavioral Specifications
The view command will prioritize showing behavioral changes identified by @behavior markers in specs, as these define what the system will actually do differently. Instead of trying to display all content, we focus on what matters most: the requirements and behaviors being added or modified.

### Display Components

The view will show a concise summary with behavioral focus:

1. **Header**
   - Change name and status (active/archived/abandoned)
   - Brief "why" from proposal

2. **Impact Summary**
   - Count of new/modified specs
   - Total number of behavioral changes

3. **Behavioral Changes**
   - Extracted from @behavior markers in specs
   - First few behavior identifiers and descriptions shown
   - Count indicator for additional behaviors
   - Grouped by spec (new vs modified)

### Data Collection

1. **Change Discovery**
   - Accept change name as argument
   - If no argument, list available changes
   - Scan `openspec/changes/`, `archive/`, and `abandoned/` directories

2. **Behavioral Extraction**
   - Parse spec.md files in changes/[name]/specs/
   - Extract @behavior markers and their identifiers
   - Count total behaviors per spec
   - Identify new vs modified specs by comparing with openspec/specs/

3. **Proposal Parsing**
   - Extract brief "why" statement (first sentence/paragraph)
   - Count tasks if tasks.md exists
   - Note presence of design.md

### Display Strategy

1. **Concise Summary**
   - Show just enough to understand the change
   - Point to files for full details
   - Focus on behavioral requirements

2. **Progressive Detail**
   - Show first 3-4 behaviors per spec
   - Indicate total count if more exist
   - Collapse modified specs to just count by default

## Technical Implementation

### Core Components

1. **ChangeParser**
   - Reads change directory structure
   - Extracts brief proposal summary
   - Handles missing files gracefully

2. **BehaviorExtractor**
   - Parses spec.md files for @behavior markers
   - Extracts behavior identifier and description
   - Counts and categorizes behaviors
   - Compares with existing specs for new/modified classification

3. **ChangeRenderer**
   - Formats compact terminal output
   - Uses tree structure for clarity
   - Emphasizes behavioral changes

### Pattern Matching

```javascript
// Extract @behavior markers and identifiers
const behaviorPattern = /@behavior\s+([\w-]+)/g;

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
   - Handle specs without @behavior markers

2. **Large Spec Files**
   - Show first few behaviors
   - Provide count of remaining
   - Don't attempt to show all

## Example Output

```
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

## Benefits of This Approach

1. **Immediate Understanding**: Developers see what the system will do differently
2. **Concise Display**: Fits in a terminal window without scrolling
3. **Actionable Information**: Points to files for deeper investigation
4. **Requirements Focus**: Emphasizes behaviors over implementation details