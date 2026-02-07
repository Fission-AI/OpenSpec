## Context
LightSpec currently provides a passive `lightspec/project.md` template that users manually populate with project context. This file is referenced in agent instructions but never validated. The goal is to replace this with a proactive skill that validates context in the user's chosen agent instruction file and helps populate missing information.

## Goals / Non-Goals
**Goals:**
- Remove `project.md` template entirely (no backward compatibility)
- Create a new `/lightspec:context-check` skill that validates agent file context
- Install the skill automatically during `lightspec init` (as a Codex prompt)
- Detect which agent file exists (CLAUDE.md or AGENTS.md at project root)
- Provide actionable feedback on missing or incomplete context properties
- Offer to explore and populate missing context (with user confirmation)

**Non-Goals:**
- Supporting both project.md and the new skill simultaneously
- Migrating existing project.md content (user runs exploration instead)
- Supporting agent files outside the project root
- Validating agent files other than CLAUDE.md or AGENTS.md

## Decisions

### 1. Skill format and installation
**Decision:** Implement as a Codex prompt (`.codex/prompts/lightspec-context-check.md`) installed in `$CODEX_HOME/prompts` during init.

**Rationale:**
- Consistent with existing `/lightspec:proposal`, `/lightspec:apply`, `/lightspec:archive` skills
- Leverages existing `CodexSlashCommandConfigurator` infrastructure
- Automatically available to all Codex users without manual setup
- Can be extended to other AI tools in the future

**Alternatives considered:**
- CLI command: Would require users to remember to run it manually
- Git hook: Too intrusive, not all users want automatic validation
- Template check during init: One-time check is insufficient for ongoing validation

### 2. Agent file detection strategy
**Decision:** Check for CLAUDE.md first, then AGENTS.md at project root. Fail with clear error if neither exists.

**Rationale:**
- CLAUDE.md is the preferred convention for Codex and similar tools
- AGENTS.md is the LightSpec-generated fallback for universal compatibility
- Checking both provides flexibility while maintaining clear precedence

**Implementation:**
```typescript
// Detection logic (pseudocode for skill instructions)
1. Check if CLAUDE.md exists at project root
2. If not, check if AGENTS.md exists at project root
3. If neither exists, report error with suggestion to create one
4. Validate the found file
```

### 3. Validation criteria
**Decision:** Define required context properties as a structured checklist:

**Required properties:**
- Purpose (project goals and objectives)
- Domain Context (domain-specific knowledge)
- Tech Stack (technologies and frameworks)
- Project Non-Obvious Conventions (at least one subsection):
  - Code Style
  - Architecture Patterns
  - Testing Strategy
  - Git Workflow (optional)
- Important Constraints
- External Dependencies

**Validation levels:**
- **Missing**: Section header absent or contains only placeholder text like `[...]` or `[Describe...]`
- **Sub-optimal**: Section exists but is too brief (< 20 words) or generic
- **Good**: Section has meaningful, project-specific content

**Rationale:**
- Matches the property structure defined in the user's request
- Provides graduated feedback (not just pass/fail)
- Allows skill to suggest improvements, not just report missing sections

### 4. Exploration and population workflow
**Decision:** When context is missing or sub-optimal, the skill will:
1. Report specific issues (which properties are missing/sub-optimal)
2. Explain what each property should contain
3. Ask user: "Would you like me to explore your codebase to gather this context and propose updates to [CLAUDE.md|AGENTS.md]?"
4. If user confirms, use Task tool or direct exploration to gather context
5. Present proposed content for review before writing to file

**Rationale:**
- User stays in control (no automatic file modifications)
- Provides educational value (explains what's needed)
- Leverages AI's exploration capabilities to reduce manual work
- Allows user to review and adjust before committing

**Alternatives considered:**
- Auto-populate: Too aggressive, might generate incorrect context
- Report only: Misses opportunity to help user complete the task

### 5. Backward compatibility
**Decision:** No backward compatibility. Delete `project.md` template entirely. Do not migrate content.

**Rationale:**
- User explicitly requested "no backward compat" and "pretend it never existed"
- LightSpec is early-stage; breaking changes are acceptable
- Migration complexity not justified for what's essentially a template file
- Users who already populated project.md can run context-check exploration to regenerate in proper location

## Risks / Trade-offs

**Risk:** Users with existing `project.md` content lose that data.
**Mitigation:**
- Clear release notes explaining the change
- Context-check skill can help regenerate content through exploration
- Most users likely haven't heavily invested in project.md yet

**Risk:** Context validation might be too strict or too lenient.
**Mitigation:**
- Use graduated validation (missing/sub-optimal/good)
- Provide clear examples of what "good" looks like
- Allow iteration based on user feedback

**Trade-off:** Adding context-check to init increases init complexity.
**Justification:** Better UX - users get proactive help setting up context rather than discovering gaps later.

## Migration Plan

### For users upgrading LightSpec:
1. Run `lightspec update` to refresh AGENTS.md (removes project.md references)
2. Delete `lightspec/project.md` manually if it exists (optional - no harm if kept)
3. Run `/lightspec:context-check` to validate and populate context in CLAUDE.md or AGENTS.md

### For new users:
1. Run `lightspec init` - gets context-check skill automatically
2. Run `/lightspec:context-check` to set up project context

### Rollback:
If this change needs to be reverted, the archived change includes the original project.md template and all removed references.

## Open Questions
None - all clarifications received from user.
