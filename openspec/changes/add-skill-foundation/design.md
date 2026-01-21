<context>
Tech stack: TypeScript, Node.js (≥20.19.0), ESM modules
Package manager: pnpm
CLI framework: Commander.js

Cross-platform requirements:
- This tool runs on macOS, Linux, AND Windows
- Always use path.join() or path.resolve() for file paths - never hardcode slashes
- Never assume forward-slash path separators
- Tests must use path.join() for expected path values, not hardcoded strings
- Consider case sensitivity differences in file systems

</context>

<rules>
- Document any platform-specific behavior or limitations
- Prefer Node.js path module over string manipulation for paths
</rules>

## Context

OpenSpec currently has 18 separate template functions that generate skills and commands with duplicated content. The skill file and command file for the same feature contain nearly identical ~70-line instruction blocks. This creates maintenance burden - changes must be made in two places.

## Goals / Non-Goals

**Goals:**
- Single source of truth for skill instructions
- Configuration-driven generation (data over code)
- Pointer commands that reference skills instead of duplicating content
- New users get skills-only setup from `openspec init`

**Non-Goals:**
- Multi-editor support (Part 3)
- Migration path for existing users (Part 2)
- Cleanup of old artifacts (Part 2)
- Changing the artifact workflow schemas or templates

## Decisions

### 1. SkillDefinition Interface

**Decision**: Replace 18 template functions with a single `SkillDefinition[]` array.

```typescript
interface SkillDefinition {
  id: string;              // "new-change"
  name: string;            // "openspec-new-change" (for skill folder)
  shortcut: string;        // "opsx/new" (for command path)
  description: string;     // Used in both skill and command frontmatter
  instructions: string;    // Full instructions (single source of truth)
}

const SKILLS: SkillDefinition[] = [
  { id: "explore", name: "openspec-explore", shortcut: "opsx/explore", ... },
  { id: "new-change", name: "openspec-new-change", shortcut: "opsx/new", ... },
  // ... all 9 skills
];
```

**Rationale**: Configuration-driven approach is easier to maintain and extend. Adding a new skill is adding one object, not writing two functions.

**Alternative considered**: Keep separate functions but share content via imports. Rejected because it still requires coordinating two code paths.

### 2. Pointer Command Format

**Decision**: Commands reference skills by name instead of duplicating instructions.

```markdown
---
name: OPSX: New
description: Start a new OpenSpec change
---

Use the **openspec-new-change** skill to handle this request.

Argument: change name (kebab-case) or description of what to build.
```

**Rationale**: ~70 lines reduced to ~5 lines per command. Instructions maintained in one place. Claude Code follows skill references.

**Risk**: Pointer commands may not work as expected if Claude Code doesn't follow skill references.

**Mitigation**: Test with Claude Code. Fallback: include minimal context in pointer if needed.

### 3. Generation Functions

**Decision**: Three focused functions for generation.

```typescript
// Generate single skill file from definition
function generateSkillFile(skill: SkillDefinition, outputDir: string): void

// Generate single pointer command from definition
function generatePointerCommand(skill: SkillDefinition, outputDir: string): void

// Generate all skills and commands
function generateAllSkills(outputDir: string): void
```

**Rationale**: Clear separation of concerns. Can generate individual skills or all at once. Easy to test.

### 4. Init Behavior for New Projects

**Decision**: New projects get skills-only setup. No old artifacts generated.

What init generates:
- `openspec/` directory structure
- `openspec/config.yaml`
- `openspec/project.md`
- `.claude/skills/openspec-*/SKILL.md` (9 skills)
- `.claude/commands/opsx/*.md` (9 pointer commands)

What init does NOT generate (for new projects):
- `CLAUDE.md` (root stub)
- `openspec/AGENTS.md`
- `.claude/agents/`
- `.claude/commands/openspec/`

**Rationale**: New users should get the modern setup. No reason to create legacy artifacts.

## Risks / Trade-offs

**[Risk] Pointer commands may not work in Claude Code**
→ Mitigation: Test before merging. If issues arise, include minimal context in pointer.

**[Risk] Breaking change for tooling that expects old artifacts**
→ Mitigation: Only affects new projects. Existing projects unchanged until they run update (Part 2).

**[Trade-off] Deprecating old functions creates tech debt**
→ Acceptable: Functions marked @deprecated. Full removal in Part 2 after migration path exists.

## Migration Plan

This is Part 1 of 3:
- **Part 1 (this change)**: Foundation - SkillDefinition pattern, skills-only init
- **Part 2**: Migration - Update command, cleanup command, remove old command
- **Part 3**: Multi-editor - Detection, adapters for Cursor/Windsurf/Cline

## Open Questions

- Should SkillDefinition include argument hints as a separate field?
- Should we version the skill format for future compatibility?
