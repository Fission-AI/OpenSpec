# OpenSpec Instructions

This document provides instructions for AI coding assistants on how to use OpenSpec conventions for spec-driven development. Follow these rules precisely when working on OpenSpec-enabled projects.

## Core Principle

OpenSpec is an AI-native system for change-driven development where:
- **Specs** (`specs/`) reflect what IS currently built and deployed
- **Changes** (`changes/`) contain proposals for what SHOULD be changed
- **AI drives the process** - You generate proposals, humans review and approve
- **Specs are living documentation** - Always kept in sync with deployed code

## Start Simple

**Default to minimal implementations:**
- New features should be <100 lines of code initially
- Use the simplest solution that works
- Avoid premature optimization (no caching, parallelization, or complex patterns without proven need)
- Choose boring technology over cutting-edge solutions

**Complexity triggers** - Only add complexity when you have:
- **Performance data** showing current solution is too slow
- **Scale requirements** with specific numbers (>1000 users, >100MB data)
- **Multiple use cases** requiring the same abstraction
- **Regulatory compliance** mandating specific patterns
- **Security threats** that simple solutions cannot address

When triggered, document the specific justification in your change proposal.

## Directory Structure

```
openspec/
├── project.md              # Project-specific context (tech stack, conventions)
├── README.md               # This file - OpenSpec instructions
├── specs/                  # Current truth - what IS built
│   ├── [capability]/       # Single, focused capability
│   │   ├── spec.md         # WHAT the capability does and WHY
│   │   └── design.md       # HOW it's built (established patterns)
│   └── ...
├── changes/                # Proposed changes - what we're CHANGING
│   ├── [change-name]/
│   │   ├── proposal.md     # Why, what, impact (consolidated)
│   │   ├── tasks.md        # Implementation checklist
│   │   ├── design.md       # Technical decisions (optional, for complex changes)
│   │   └── specs/          # Future state of affected specs
│   │       └── [capability]/
│   │           └── spec.md # Clean markdown (no diff syntax)
│   └── archive/            # Completed changes (dated)
```

### Capability Organization

**Use capabilities, not features** - Each directory under `specs/` represents a single, focused responsibility:
- **Verb-noun naming**: `user-auth`, `payment-capture`, `order-checkout`
- **10-minute rule**: Each capability should be understandable in <10 minutes
- **Single purpose**: If it needs "AND" to describe it, split it

Examples:
```
✅ GOOD: user-auth, user-sessions, payment-capture, payment-refunds
❌ BAD: users, payments, core, misc
```

## Key Behavioral Rules

### 1. Always Start by Reading

Before any task:
1. **Read relevant specs** in `specs/[capability]/spec.md` to understand current state
2. **Check pending changes** in `changes/` directory for potential conflicts
3. **Read project.md** for project-specific conventions

### 2. When to Create Change Proposals

**ALWAYS create a change proposal for:**
- New features or functionality
- Breaking changes (API changes, schema updates)
- Architecture changes or new patterns
- Performance optimizations that change behavior
- Security updates affecting auth/access patterns
- Any change requiring multiple steps or affecting multiple systems

**SKIP proposals for:**
- Bug fixes that restore intended behavior
- Typos, formatting, or comment updates
- Dependency updates (unless breaking)
- Configuration or environment variable changes
- Adding tests for existing behavior
- Documentation fixes

**Complexity assessment:**
- If your solution requires >100 lines of new code, justify the complexity
- If adding dependencies, frameworks, or architectural patterns, document why simpler alternatives won't work
- Default to single-file implementations until proven insufficient

### 3. Creating a Change Proposal

When a user requests a significant change:

```bash
# 1. Create the change directory
openspec/changes/[descriptive-name]/

# 2. Generate proposal.md with all context
## Why
[1-2 sentences on the problem/opportunity]

## What Changes  
[Bullet list of changes, including breaking changes]

## Impact
- Affected specs: [list capabilities that will change]
- Affected code: [list key files/systems]
- Potential conflicts: [list pending changes affecting same specs]

# 3. Create future state specs for ALL affected capabilities
# - Store complete spec files as they will exist after the change
# - Use clean markdown without diff syntax (+/- prefixes)
# - Include all formatting and structure of the final intended state
specs/
└── [capability]/
    └── spec.md

# 4. Create tasks.md with implementation steps
## 1. [Task Group]
- [ ] 1.1 [Specific task]
- [ ] 1.2 [Specific task]

# 5. For complex changes, add design.md
[Technical decisions and trade-offs]
```

### 4. The Change Lifecycle

1. **Propose** → Create change directory with all documentation
2. **Review** → User reviews and approves the proposal
3. **Implement** → Follow the approved tasks.md (can be multiple PRs)
4. **Deploy** → User confirms deployment
5. **Update Specs** → Sync specs/ with new reality (IF the change affects system capabilities)
6. **Archive** → Move to `changes/archive/YYYY-MM-DD-[name]/`

### 5. Implementing Changes

When implementing an approved change:
1. Follow the tasks.md checklist exactly
2. **Mark completed tasks** in tasks.md as you finish them (e.g., `- [x] 1.1 Task completed`)
3. Ensure code matches the proposed behavior
4. Update any affected tests
5. **Keep change in `changes/` directory** - do NOT archive in implementation PR

**Multiple Implementation PRs:**
- Changes can be implemented across multiple PRs
- Each PR should update tasks.md to mark what was completed
- Different developers can work on different task groups
- Example: PR #1 completes tasks 1.1-1.3, PR #2 completes tasks 2.1-2.4

### 6. Updating Specs and Archiving After Deployment

**Create a separate PR after deployment** that:
1. Moves change to `changes/archive/YYYY-MM-DD-[name]/`
2. Updates relevant files in `specs/` to reflect new reality (if needed)
3. If design.md exists, incorporates proven patterns into `specs/[capability]/design.md`

This ensures changes are only archived when truly complete and deployed.

### 7. Types of Changes That Don't Require Specs

Some changes only affect development infrastructure and don't need specs:
- Initial project setup (package.json, tsconfig.json, etc.)
- Development tooling changes (linters, formatters, build tools)
- CI/CD configuration
- Development dependencies

For these changes:
1. Implement → Deploy → Mark tasks complete → Archive
2. Skip the "Update Specs" step entirely

### What Deserves a Spec?

Ask yourself:
- Is this a system capability that users or other systems interact with?
- Does it have ongoing behavior that needs documentation?
- Would a new developer need to understand this to work with the system?

If NO to all → No spec needed (likely just tooling/infrastructure)

## Handling Concurrent Spec Modifications

When multiple changes modify the same spec, conflicts can arise. OpenSpec handles this through optimistic concurrency and natural conflict resolution.

### Core Principles

1. **No Forced Dependencies** - Changes proceed in parallel without blocking
2. **First Deployed Wins** - Later changes adapt to deployed reality
3. **Natural Resolution** - Use git's conflict resolution during implementation
4. **Document Conflicts** - Note potential conflicts in proposal.md

### Detecting Conflicts

When creating a change:
1. Check `changes/` directory for other pending changes
2. Identify changes affecting the same specs
3. Document potential conflicts in your proposal's Impact section

Example in proposal.md:
```markdown
## Impact
- Affected specs: user-auth, user-sessions
- Potential conflicts: change-add-oauth also modifies user-auth
```

### Resolution Workflow

```
1. Detect → Notice overlapping changes during planning
2. Document → Note conflicts in proposal.md
3. Proceed → Implement optimistically
4. Resolve → Handle git conflicts during implementation
5. Adapt → Update proposal if resolution differs from plan
```

### Common Conflict Scenarios

#### Additive Changes
Two changes adding different features to the same spec:
- Change A: Adds OAuth to user-auth
- Change B: Adds 2FA to user-auth
- Resolution: Both features coexist, natural git merge

#### Competing Changes
Two changes modifying the same behavior:
- Change A: Password timeout 30min → 1hr
- Change B: Password timeout 30min → 2hr
- Resolution: Human decision during merge, document in PR

#### Structural Changes
One change restructures while another adds features:
- Change A: Splits user-auth into auth + sessions
- Change B: Adds password complexity rules
- Resolution: May need to update Change B's target spec

### Best Practices

1. **Check for conflicts early** - Review pending changes before proposing
2. **Communicate in proposals** - Document known conflicts
3. **Coordinate on complex conflicts** - Discuss resolution strategy
4. **Update proposals after resolution** - Keep documentation accurate
5. **Consider change ordering** - Some changes naturally precede others

### Tooling Support (Future)

Future tooling may include:
- `openspec check-conflicts` - Detect overlapping spec changes
- `openspec show-conflicts [change-name]` - Show specific conflicts
- Base spec tracking in proposals

For now, manual review and git's natural conflict resolution handle most cases effectively.

## Understanding Specs vs Code

### Specs Document WHAT and WHY
```markdown
# Authentication Spec

Users SHALL authenticate with email and password.

WHEN credentials are valid THEN issue JWT token.
WHEN credentials are invalid THEN return generic error.

WHY: Prevent user enumeration attacks.
```

### Code Documents HOW
```javascript
// Implementation details
const user = await db.users.findOne({ email });
const valid = await bcrypt.compare(password, user.hashedPassword);
```

**Key Distinction**: Specs capture intent, constraints, and decisions that aren't obvious from code.

## Common Scenarios

### New Feature Request
```
User: "Add password reset functionality"

You should:
1. Read specs/user-auth/spec.md
2. Check changes/ for pending auth changes
3. Create changes/add-password-reset/ with proposal
4. Wait for approval before implementing
```

### Bug Fix
```
User: "Getting null pointer error when bio is empty"

You should:
1. Check if spec says bios are optional
2. If yes → Fix directly (it's a bug)
3. If no → Create change proposal (it's a behavior change)
```

### Infrastructure Setup
```
User: "Initialize TypeScript project"

You should:
1. Create change proposal for TypeScript setup
2. Implement configuration files (PR #1)
3. Mark tasks complete in tasks.md
4. After deployment, create separate PR to archive
   (no specs update needed - this is tooling, not a capability)
```

## Summary Workflow

1. **Receive request** → Determine if it needs a change proposal
2. **Read current state** → Check specs and pending changes
3. **Create proposal** → Generate complete change documentation
4. **Get approval** → User reviews the proposal
5. **Implement** → Follow approved tasks, mark completed items in tasks.md
6. **Deploy** → User deploys the implementation
7. **Archive PR** → Create separate PR to:
   - Move change to archive
   - Update specs if needed
   - Mark change as complete

## PR Workflow Examples

### Single Developer, Simple Change
```
PR #1: Implementation
- Implement all tasks
- Update tasks.md marking items complete
- Get merged and deployed

PR #2: Archive (after deployment)
- Move changes/feature-x/ → changes/archive/2025-01-15-feature-x/
- Update specs if needed
```

### Multiple Developers, Complex Change
```
PR #1: Alice implements auth components
- Complete tasks 1.1, 1.2, 1.3
- Update tasks.md marking these complete

PR #2: Bob implements UI components  
- Complete tasks 2.1, 2.2
- Update tasks.md marking these complete

PR #3: Alice fixes integration issues
- Complete remaining task 1.4
- Update tasks.md

[Deploy all changes]

PR #4: Archive
- Move to archive with deployment date
- Update specs to reflect new auth flow
```

### Key Rules
- **Never archive in implementation PRs** - changes aren't done until deployed
- **Always update tasks.md** - shows accurate progress
- **One archive PR per change** - clear completion boundary
- **Archive PR includes spec updates** - keeps specs current

## Capability Organization Best Practices

### Naming Capabilities
- Use **verb-noun** patterns: `user-auth`, `payment-capture`, `order-checkout`
- Be specific: `payment-capture` not just `payments`
- Keep flat: Avoid nesting capabilities within capabilities
- Singular focus: If you need "AND" to describe it, split it

### When to Split Capabilities
Split when you have:
- Multiple unrelated API endpoints
- Different user personas or actors
- Separate deployment considerations
- Independent evolution paths

#### Capability Boundary Guidelines
- Would you import these separately? → Separate capabilities
- Different deployment cadence? → Separate capabilities
- Different teams own them? → Separate capabilities
- Shared data models are OK, shared business logic means combine

Examples:
- user-auth (login/logout) vs user-sessions (token management) → SEPARATE
- payment-capture vs payment-refunds → SEPARATE (different workflows)
- user-profile vs user-settings → COMBINE (same data model, same owner)

### Cross-Cutting Concerns
For system-wide policies (rate limiting, error handling, security), document them in:
- `project.md` for project-wide conventions
- Within relevant capability specs where they apply
- Or create a dedicated capability if complex enough (e.g., `api-rate-limiting/`)

### Examples of Well-Organized Capabilities
```
specs/
├── user-auth/              # Login, logout, password reset
├── user-sessions/          # Token management, refresh
├── user-profile/           # Profile CRUD operations
├── payment-capture/        # Processing payments
├── payment-refunds/        # Handling refunds
└── order-checkout/         # Checkout workflow
```

For detailed guidance, see the [Capability Organization Guide](../docs/capability-organization.md).

## Common Scenarios and Clarifications

### Decision Ambiguity: Bug vs Behavior Change

When specs are missing or ambiguous:
- If NO spec exists → Treat current code behavior as implicit spec, require proposal
- If spec is VAGUE → Require proposal to clarify spec alongside fix
- If code and spec DISAGREE → Spec is truth, code is buggy (fix without proposal)
- If unsure → Default to creating a proposal (safer option)

Example:
```
User: "The API returns 404 for missing users but should return 400"
AI: Is this a bug (spec says 400) or behavior change (spec says 404)?
```

### When You Don't Know the Scope
It's OK to explore first! Tell the user you need to investigate, then create an informed proposal.

### Exploration Phase (When Needed)

BEFORE creating proposal, you may need exploration when:
- User request is vague or high-level
- Multiple implementation approaches exist
- Scope is unclear without seeing code

Exploration checklist:
1. Tell user you need to explore first
2. Use Grep/Read to understand current state
3. Create initial proposal based on findings
4. Refine with user feedback

Example:
```
User: "Add caching to improve performance"
AI: "Let me explore the codebase to understand the current architecture and identify caching opportunities."
[After exploration]
AI: "Based on my analysis, I've identified three areas where caching would help. Here's my proposal..."
```

### When No Specs Exist
Treat current code as implicit spec. Your proposal should document current state AND proposed changes.

### When in Doubt
Default to creating a proposal. It's easier to skip an unnecessary proposal than fix an undocumented change.

### AI Workflow Adaptations

Task tracking with OpenSpec:
- Track exploration tasks separately from implementation
- Document proposal creation steps as you go
- Keep implementation tasks separate until proposal approved

Parallel operations encouraged:
- Read multiple specs simultaneously
- Check multiple pending changes at once
- Batch related searches for efficiency

Progress communication:
- "Exploring codebase to understand scope..."
- "Creating proposal based on findings..."
- "Implementing approved changes..."

### For AI Assistants
- **Bias toward simplicity** - Propose the minimal solution that works
- Use your exploration tools liberally before proposing
- Batch operations for efficiency
- Communicate your progress
- It's OK to revise proposals based on discoveries
- **Question complexity** - If your solution feels complex, simplify first

## Edge Case Handling

### Multi-Capability Changes
Create ONE proposal that:
- Lists all affected capabilities
- Shows changes per capability
- Has unified task list
- Gets approved as a whole

### Outdated Specs
If specs clearly outdated:
1. Create proposal to update specs to match reality
2. Implement new feature in separate proposal
3. OR combine both in one proposal with clear sections

### Emergency Hotfixes
For critical production issues:
1. Announce: "This is an emergency fix"
2. Implement fix immediately
3. Create retroactive proposal
4. Update specs after deployment
5. Tag with [EMERGENCY] in archive

### Pure Refactoring
No proposal needed for:
- Code formatting/style
- Internal refactoring (same API)
- Performance optimization (same behavior)
- Adding types to untyped code

Proposal REQUIRED for:
- API changes (even if compatible)
- Database schema changes
- Architecture changes
- New dependencies

### Observability Additions
No proposal needed for:
- Adding log statements
- New metrics/traces
- Debugging additions
- Error tracking

Proposal REQUIRED if:
- Changes log format/structure
- Adds new monitoring service
- Changes what's logged (privacy)

## Remember

- You are the process driver - automate documentation burden
- Specs must always reflect deployed reality
- Changes are proposed, not imposed
- Impact analysis prevents surprises
- Simplicity is the power - just markdown files, minimal solutions
- Start simple, add complexity only when justified

By following these conventions, you enable true spec-driven development where documentation stays current, changes are traceable, and evolution is intentional.