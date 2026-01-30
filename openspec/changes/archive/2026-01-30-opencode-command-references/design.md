## Context

OpenCode is one of many supported AI tools. Each tool has:
- A **command adapter** (in `src/core/command-generation/adapters/`) for generating tool-specific command files
- **Skills** generated via `generateSkillContent()` in `src/core/shared/skill-generation.ts`

Currently:
- Commands go through the adapter system which can transform content per-tool
- Skills use a single shared function with no tool-specific transformation

The templates in `src/core/templates/skill-templates.ts` use Claude's colon-based format (`/opsx:new`) as the canonical format. Tools that use different formats need transformation at generation time.

## Goals / Non-Goals

**Goals:**
- Transform all `/opsx:` command references to `/opsx-` for OpenCode in both commands and skills
- Create a shared, reusable transformation utility
- Keep the transformation opt-in via a callback parameter (not hard-coded tool detection)

**Non-Goals:**
- Modifying the canonical template format (templates stay with `/opsx:`)
- Applying transformation to other tools (only OpenCode for now)
- Creating a full adapter system for skills (overkill for current needs)

## Decisions

### Decision 1: Shared Utility Function

**Choice**: Create `transformToHyphenCommands()` in `src/utils/command-references.ts`

**Rationale**: 
- Single source of truth for the transformation logic
- Can be used by both command adapter and skill generation
- Easy to test in isolation
- Follows existing utils pattern in the codebase

**Alternatives considered**:
- Inline the transformation in each location - Duplicates logic, harder to maintain

### Decision 2: Callback Parameter for Skill Generation

**Choice**: Add optional `transformInstructions?: (instructions: string) => string` parameter to `generateSkillContent()`

**Rationale**:
- Flexible - callers define the transformation, not the generation function
- No coupling - `generateSkillContent()` doesn't need to know about tool formats
- Extensible - could support other transformations in the future
- Follows inversion of control principle

**Alternatives considered**:
- Add tool ID parameter and switch on it - Creates coupling, harder to extend
- Create skill adapter system parallel to commands - Over-engineering for current needs
- Transform in templates directly - Breaks single-source-of-truth principle

### Decision 3: Apply at Generation Sites

**Choice**: Pass transformer in `init.ts` and `update.ts` when `tool.value === 'opencode'`

**Rationale**:
- These are the only two places that generate skills
- Simple conditional check, no new abstractions needed
- Easy to extend to other tools if needed later

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Other `/opsx:` patterns exist that shouldn't be transformed | All occurrences in templates are command invocations - verified by inspection |
| Future tools may need same transformation | Utility is shared and easy to reuse; can add to other tools' generation |
| Callback adds complexity to function signature | Optional parameter with sensible default (no transformation) |
