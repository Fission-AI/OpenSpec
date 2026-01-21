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

OpenSpec currently has two parallel systems for AI agent instructions:

**Old System (via `openspec init`):**
- `CLAUDE.md` - Root stub pointing to AGENTS.md
- `openspec/AGENTS.md` - Monolithic ~200 line instruction file
- `.claude/agents/change.md`, `.claude/agents/spec.md` - Subagent definitions
- `.claude/commands/openspec/*.md` - Old slash commands (proposal, apply, archive)

**New System (via `openspec artifact-experimental-setup`):**
- `.claude/skills/openspec-*/SKILL.md` - 9 self-contained skills
- `.claude/commands/opsx/*.md` - 9 slash commands (duplicating skill instructions)

The duplication creates maintenance burden and user confusion. AgentSkills standard (used by Claude Code) doesn't support aliases, so we need both verbose skill names (for AI detection) and short command names (for human invocation).

## Goals / Non-Goals

**Goals:**
- Skills become the single source of truth for instructions
- Commands become lightweight pointers to skills
- New users get skills-only setup from `openspec init`
- Existing users have a clear migration path
- Smart detection of editor configs and existing OpenSpec state
- Multi-editor support with unified generation

**Non-Goals:**
- Changing the artifact workflow (schemas, templates, artifact graph)
- Modifying how skills work at runtime (that's Claude Code's domain)
- Supporting non-AgentSkills editors (focus on Claude Code, Cursor, Windsurf, Cline)
- Automatic cleanup of old files (user must opt-in via cleanup command)

## Decisions

### 1. Unified SkillDefinition Pattern

**Decision**: Replace 18 separate template functions with a single `SkillDefinition[]` array.

```typescript
interface SkillDefinition {
  id: string;              // "new-change"
  name: string;            // "openspec-new-change" (for skill folder)
  shortcut: string;        // "opsx/new" (for command path)
  description: string;     // Used in both skill and command frontmatter
  instructions: string;    // Full instructions (single source)
}

const SKILLS: SkillDefinition[] = [
  { id: "explore", name: "openspec-explore", shortcut: "opsx/explore", ... },
  { id: "new-change", name: "openspec-new-change", shortcut: "opsx/new", ... },
  // ...
];
```

**Rationale**: Single source of truth, easier to maintain, configuration-driven.

**Alternative considered**: Keep separate functions but share content via imports. Rejected because it still requires coordinating two sets of definitions.

### 2. Pointer Commands

**Decision**: Commands reference skills instead of duplicating instructions.

```markdown
---
name: OPSX: New
description: Start a new OpenSpec change
---

Use the **openspec-new-change** skill to handle this request.

Argument: change name (kebab-case) or description of what to build.
```

**Rationale**: ~70 lines reduced to ~5 lines per command. Instructions maintained in one place.

**Alternative considered**: Eliminate commands entirely. Rejected because AgentSkills doesn't support aliases, and users need short invocation paths.

### 3. Smart Init Detection

**Decision**: `openspec init` detects and recommends based on project state.

Detection targets:
- Editor configs: `.claude/`, `.cursor/`, `.windsurf/`, `.cline/`
- OpenSpec state: `openspec/`, `AGENTS.md` (old), skills (new)

Flow:
1. Scan for editor configs and OpenSpec artifacts
2. Show detected state to user
3. Pre-select detected editors, let user modify
4. Generate appropriate files for selected editors

**Rationale**: Better UX than blind checkbox list. Users don't have to guess what they need.

### 4. Cleanup as Separate Command

**Decision**: New `openspec cleanup` command instead of auto-cleanup.

```bash
openspec cleanup           # Interactive confirmation
openspec cleanup --yes     # Skip confirmation (CI/scripts)
openspec cleanup --dry-run # Preview only
```

Removes:
- `CLAUDE.md` (root)
- `openspec/AGENTS.md`
- `.claude/agents/`
- `.claude/commands/openspec/`

**Rationale**: Non-destructive migration. Users control when old files are removed. Allows gradual adoption.

**Prerequisite**: New system must be set up. If not, error with "Run `openspec update` first".

### 5. Informative Update Experience

**Decision**: `openspec update` creates new skills and explains changes.

Output:
```
🎉 OpenSpec has a new skills-based workflow!

Created:
  ✓ .claude/skills/openspec-*/ (9 skills)
  ✓ .claude/commands/opsx/* (9 shortcut commands)

These replace the old system. You can now use:
  • Natural language: "I want to start a new change"
  • Shortcuts: /opsx:new, /opsx:apply, /opsx:archive

Old files are still present. Run `openspec cleanup` when ready.
```

**Rationale**: Users understand what changed without being blocked. Clear path to cleanup.

### 6. Multi-Editor Generation

**Decision**: Each editor gets equivalent files in its native format.

| Editor | Skills Location | Commands Location |
|--------|-----------------|-------------------|
| Claude Code | `.claude/skills/` | `.claude/commands/` |
| Cursor | `.cursor/rules/` | (embedded in rules) |
| Windsurf | `.windsurf/rules/` | (embedded in rules) |
| Cline | `.cline/rules/` | (embedded in rules) |

**Rationale**: Users shouldn't have to choose between editors. Detection + selection flow handles this.

## Risks / Trade-offs

**[Risk] Pointer commands may not work as expected**
→ Mitigation: Test with Claude Code to verify skill references are followed. Fallback: include minimal context in pointer.

**[Risk] Users may not run cleanup, leaving cruft**
→ Mitigation: Acceptable trade-off for non-breaking migration. Phase 2 can auto-cleanup.

**[Risk] Detection may miss edge cases**
→ Mitigation: Detection informs recommendations but user can override selections.

**[Risk] Breaking change for artifact-experimental-setup users**
→ Mitigation: `openspec init` on existing project detects and handles gracefully.

## Migration Plan

**Phase 1 (This Change):**
1. Implement unified SkillDefinition pattern
2. Update init to generate skills-only (no old artifacts for new users)
3. Update update command for informative upgrade
4. Add cleanup command
5. Remove artifact-experimental-setup command

**Phase 2 (Future):**
- `openspec update` runs cleanup automatically
- Or: deprecation warning → then auto-cleanup in subsequent version
- Timeline: TBD based on adoption and feedback

**Rollback Strategy:**
- If issues arise, users can manually restore old files from git history
- No data loss risk - cleanup only removes instruction files, not specs/changes

## Open Questions

- Should we support custom skill definitions? (e.g., user adds their own skills)
- How do we handle editor-specific features that don't map across all editors?
- Should cleanup have a --force flag to remove even if new system isn't fully set up?
