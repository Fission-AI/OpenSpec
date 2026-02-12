## Context

Currently, OpenSpec has skill templates that guide AI agents through various workflow steps (explore, new-change, continue-change, apply-change, etc.). These skills are TypeScript functions in `src/core/templates/skill-templates.ts` that return structured template objects consumed by AI agents.

The clarification workflow needs to be added as a new agent skill template following the existing pattern. This is NOT a CLI command—it's an agent skill that leverages AI capabilities to scan specs, identify ambiguities, ask intelligent questions, and integrate answers back into spec artifacts.

The existing skill templates follow a consistent structure:
- Export a `get*SkillTemplate()` function that returns a `SkillTemplate` object
- Include metadata (name, description, license, compatibility, author, version)
- Provide detailed step-by-step instructions in markdown format
- Instructions reference OpenSpec CLI commands for status checks and file operations

## Goals / Non-Goals

**Goals:**
- Add `openspec-clarify` skill template following the existing pattern
- Enable AI agents to systematically identify ambiguities using a 10-category taxonomy
- Support interactive Q&A with AI-generated recommendations (multiple-choice and short-answer)
- Integrate clarification answers directly into spec artifacts with proper sectioning
- Provide coverage reporting to track resolved/deferred/outstanding ambiguities
- Make the skill accessible via standard exports in `index.ts`

**Non-Goals:**
- Creating a CLI command (explicitly rejected—this is agent-only)
- Adding new CLI subcommands or flags
- Building ambiguity detection algorithms in TypeScript (AI does this)
- Creating test infrastructure for the clarification logic itself
- Implementing markdown parsing libraries (AI agents use their file editing tools)

## Decisions

### Decision 1: Agent Skill Template vs CLI Command

**Choice:** Implement as agent skill template in `skill-templates.ts`

**Rationale:**
- Clarification requires AI reasoning (ambiguity detection, question prioritization, contextual recommendations)
- CLI commands are for deterministic operations; agent skills are for intelligent workflows
- Avoids complexity of building ambiguity scanners, question generators, and NLP logic in TypeScript
- Leverages existing AI file editing, markdown formatting, and conversational capabilities
- Consistent with OpenSpec's agent-first architecture

**Alternatives considered:**
- CLI command with scripted questions: Too rigid, can't adapt to spec context
- Hybrid (CLI + agent): Unnecessary complexity, agent can handle entire flow

### Decision 2: Template Structure

**Choice:** Single inline template string in `getClarifyChangeSkillTemplate()` function

**Rationale:**
- Consistent with existing skill templates (see `getExploreSkillTemplate()`, `getContinueChangeSkillTemplate()`)
- All skill logic is self-contained in the returned instructions string
- No need for separate files—the full skill fits in one template string
- Easy to maintain and version alongside other skills

**Alternatives considered:**
- Separate `.ts` file for the skill: Adds file management overhead without benefits
- External markdown file: Breaks the pattern of inline templates

### Decision 3: Naming Convention

**Choice:** Name the skill `openspec-clarify` and function `getClarifyChangeSkillTemplate()`

**Rationale:**
- The "" suffix distinguishes from any previous clarification approaches
- Follows naming pattern: `openspec-<action>-<optional-variant>`
- Function name matches skill name: `getClarify Change SkillTemplate()`

**Alternatives considered:**
- `openspec-clarify`: Conflicts with any existing v1 implementations
- `openspec-clarify-skill`: Redundant since all these are skills

### Decision 4: Ambiguity Taxonomy Categories

**Choice:** Use 10 structured categories for scanning:
1. Functional Scope and Behavior
2. Domain and Data Model
3. Interaction and UX Flow
4. Non-Functional Quality Attributes
5. Integration and External Dependencies
6. Edge Cases and Failure Handling
7. Constraints and Tradeoffs
8. Terminology and Consistency
9. Completion Signals
10. Misc and Placeholders

**Rationale:**
- Comprehensive coverage of common spec ambiguities
- Structured enough for systematic scanning, flexible enough for AI judgment
- Based on industry best practices (IEEE 830, RFC requirements patterns)
- Each category maps to implementable questions

**Alternatives considered:**
- Fewer categories (5-6): Too coarse, misses important dimensions
- More categories (15+): Overwhelming, diminishing returns
- Unstructured scanning: AI might miss systematic coverage areas

### Decision 5: Question Format and Recommendations

**Choice:** Two question types with AI-generated recommendations:
- **Multiple-choice:** 2-5 options in a markdown table, AI recommends one with reasoning
- **Short-answer:** ≤5 word answers, AI suggests default with reasoning

**Rationale:**
- Multiple-choice forces explicit decision points (better than open-ended)
- Short-answer keeps responses actionable and concise
- AI recommendations reduce user cognitive load (accept, override, or customize)
- Table format is readable in agent chat interfaces
- 5-word limit prevents essay responses that bloat specs

**Alternatives considered:**
- Open-ended questions only: Too vague, hard to integrate into specs
- Yes/no questions only: Too limiting for complex clarifications
- Ranking/priority questions: Harder to integrate into prose specs

### Decision 6: Incremental Spec Integration

**Choice:** Update spec artifact immediately after each accepted answer

**Rationale:**
- Progressive state saves work if session is interrupted
- User sees clarifications accumulating in real-time
- Each answer independently validates and writes (fail-fast)
- Easier to debug issues with individual clarifications

**Alternatives considered:**
- Batch updates at end: Risk losing all work if session interrupted
- Separate clarifications file: Fragments context, harder to reference during implementation

### Decision 7: Clarifications Section Format

**Choice:** Add `## Clarifications` section with timestamped sessions:
```markdown
## Clarifications

### Session 2026-02-12
- Q: <question> -> A: <answer>
- Q: <question> -> A: <answer>
```

**Rationale:**
- Timestamped sessions preserve historical context across multiple clarification runs
- Bullet format is scannable and easy to reference
- Q/A pairs show original ambiguity and resolution
- Section can grow over time without restructuring

**Alternatives considered:**
- Inline comments in each section: Clutters existing sections, hard to find
- Separate changelog: Fragments spec, harder to maintain coherence
- No historical tracking: Loses context on why decisions were made

## Risks / Trade-offs

**[Risk] AI may generate irrelevant or overly-speculative questions**
→ **Mitigation:** Instructions emphasize "materially impact implementation" prioritization; user can skip/terminate early; 5-question cap limits time waste

**[Risk] Users may over-rely on AI recommendations without critical thinking**
→ **Mitigation:** Template requires AI to show reasoning; user must explicitly accept or override; encourages custom answers with "(Custom)" option

**[Risk] Spec artifacts may become cluttered with too many clarifications over time**
→ **Mitigation:** Timestamped sessions keep history organized; template instructs to integrate answers into appropriate sections (not just append)

**[Risk] Ambiguity taxonomy may not cover domain-specific concerns**
→ **Mitigation:** Category 10 (Misc/Placeholders) catches outliers; AI can adapt taxonomy interpretation to context; future versions can extend categories

**[Risk] Incremental writes may leave specs in inconsistent state if AI errors mid-session**
→ **Mitigation:** Each write is atomic; validation step at end checks consistency; user can manually fix or re-run; Git versioning allows rollback

**[Risk] Cross-platform path handling in template**
→ **Mitigation:** Template instructs agents to use file tools (which handle paths correctly); no hardcoded paths in template instructions

## Migration Plan

N/A - This is a new feature with no existing users or data to migrate.

Deployment steps:
1. Add `getClarifyChangeSkillTemplate()` function to `skill-templates.ts`
2. Export function in `index.ts`
3. Test by having an agent invoke the skill on a test change
4. Document in README or skill catalog (if applicable)

Rollback: Simply remove the function and export if issues arise. No persistent state changes.

## Open Questions

None at this time—proposal clarifies scope and approach sufficiently.
