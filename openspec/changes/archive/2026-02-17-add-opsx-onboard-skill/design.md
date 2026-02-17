## Context

OpenSpec has a complete skill and slash command generation system. Skills are defined in `src/core/templates/skill-templates.ts` as functions that return `SkillTemplate` objects (for Agent Skills) and `CommandTemplate` objects (for slash commands). These are registered in `src/core/shared/skill-generation.ts` and generated during `openspec init` and `openspec update`.

Existing skills follow a consistent pattern:
- `getXxxSkillTemplate()` returns the skill with name, description, instructions
- `getOpsxXxxCommandTemplate()` returns the slash command with name, description, category, tags, content
- Both are registered in their respective arrays in `skill-generation.ts`

## Goals / Non-Goals

**Goals:**
- Add `/opsx:onboard` skill that teaches the OpenSpec workflow through guided practice
- Follow existing patterns for skill/command template generation
- Provide comprehensive narration that explains each step
- Include codebase analysis to suggest real, appropriately-scoped tasks

**Non-Goals:**
- Creating a separate "demo mode" or simulated workflow (we do real work)
- Adding new CLI commands (this is purely agent instructions)
- Modifying the init/update flow (just adding to the template arrays)

## Decisions

### Decision 1: Single Monolithic Skill

The onboard skill will be a single comprehensive instruction set rather than composing existing skills with flags.

**Rationale:**
- Slash commands don't support flags (they're just prompts)
- A monolithic skill gives complete control over narration and pacing
- Easier to maintain a single cohesive experience
- Users learn the real commands by seeing them mentioned in narration

### Decision 2: Codebase Analysis Patterns

The skill instructions will direct the agent to look for specific patterns when suggesting starter tasks:

1. TODO/FIXME comments in code
2. Missing error handling (`catch` blocks that swallow errors, no try-catch around risky operations)
3. Functions without tests (cross-reference src/ with test files)
4. Type: `any` in TypeScript files
5. Console.log statements in non-debug code
6. Missing input validation on user-facing inputs
7. Recent git commits (for context on what user is working on)

**Rationale:** These are universally applicable, easy to detect, and produce well-scoped tasks.

### Decision 3: Narration Integration Style

Each phase will follow a pattern:
1. **EXPLAIN** what we're about to do and why (1-2 sentences)
2. **DO** the action (run command, create artifact)
3. **SHOW** what happened
4. **PAUSE** at key transitions (not every step)

Pauses occur at:
- After task selection (before creating change)
- After drafting proposal (before saving)
- After tasks are generated (before implementation)
- After archive (final recap)

**Rationale:** Too many pauses becomes tedious. Too few loses the teaching opportunity. These are the natural "chapter breaks."

### Decision 4: Scope Guardrail Approach

When user selects a task that's too large, the skill will:
1. Acknowledge the task is valuable
2. Explain why smaller is better for first time
3. Suggest a smaller slice or alternative
4. Let user override if they insist

**Rationale:** Soft guardrails teach without frustrating. Users learn scope calibration as part of the experience.

### Decision 5: Template Structure

The skill template will be ~400-600 lines of instruction text, structured as:

```
- Preflight checks (init status)
- Phase 1: Welcome & Setup
- Phase 2: Task Selection (with codebase analysis instructions)
- Phase 3: Explore Demo (brief)
- Phase 4: Change Creation
- Phase 5: Proposal
- Phase 6: Specs
- Phase 7: Design
- Phase 8: Tasks
- Phase 9: Apply (Implementation)
- Phase 10: Archive
- Phase 11: Recap & Next Steps
- Edge cases & graceful exits
```

The command template will be identical to the skill template (same content, different wrapper).

**Rationale:** Following the established pattern where skill and command share the same core instructions.

## Risks / Trade-offs

**Risk: Instruction length**
The skill will be significantly longer than existing skills (~500 lines vs ~100-200).
→ Mitigation: This is acceptable since onboarding is inherently comprehensive. Token cost is one-time per session.

**Risk: Codebase analysis may find nothing**
Some codebases (new projects, very clean code) may not have obvious improvement opportunities.
→ Mitigation: Fall back to asking user what they want to build. Include "add a new feature" as an option.

**Risk: Task suggestions may be inappropriate**
Agent might suggest tasks that touch sensitive code or have hidden complexity.
→ Mitigation: User always chooses; agent just suggests. Scope estimates help set expectations.

**Risk: User abandons mid-way**
Onboarding takes ~15 minutes; users may not complete it.
→ Mitigation: Graceful exit handling - note the change is saved, explain how to continue later.
