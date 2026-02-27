## Context

OpenSpec Part 1 establishes the SkillDefinition pattern for Claude Code. However, many developers use other AI code editors like Cursor, Windsurf, and Cline. Each has its own configuration format for AI instructions. We need a unified approach to generate equivalent configurations for all supported editors.

## Goals / Non-Goals

**Goals:**
- Detect existing editor configurations automatically
- Pre-select detected editors during init
- Generate equivalent instruction files for all selected editors
- Use adapter pattern for easy addition of new editors
- Smart recommendations based on project state

**Non-Goals:**
- Supporting every AI editor (focus on popular ones)
- Runtime editor switching (generation-time only)
- Editor-specific features that don't map across editors
- Automatic detection of which editor user is currently using

## Decisions

### 1. Detection Approach

**Decision**: Scan for known directory markers at init time.

```typescript
interface DetectionResult {
  editors: {
    claudeCode: boolean;  // .claude/ exists
    cursor: boolean;      // .cursor/ exists
    windsurf: boolean;    // .windsurf/ exists
    cline: boolean;       // .cline/ exists
  };
  openspecState: 'uninitialized' | 'old' | 'new' | 'mixed';
}

function detectEditorConfigs(projectPath: string): DetectionResult
```

**Rationale**: Simple, fast, no false positives. Directory existence is a reliable signal.

**Alternative considered**: Parse editor config files to confirm they're actually configured. Rejected - adds complexity, directories are sufficient signal.

### 2. Editor Adapter Interface

**Decision**: Use adapter pattern for editor-specific generation.

```typescript
interface EditorAdapter {
  id: string;           // "claude-code", "cursor", "windsurf", "cline"
  name: string;         // "Claude Code", "Cursor", etc.
  configDir: string;    // ".claude", ".cursor", etc.

  generateSkills(skills: SkillDefinition[], outputDir: string): void;
  generateCommands(skills: SkillDefinition[], outputDir: string): void;
}

const ADAPTERS: EditorAdapter[] = [
  new ClaudeCodeAdapter(),
  new CursorAdapter(),
  new WindsurfAdapter(),
  new ClineAdapter(),
];
```

**Rationale**: Encapsulates editor-specific logic. Adding a new editor = adding one adapter class.

### 3. Editor-Specific Formats

**Claude Code:**
- Skills: `.claude/skills/openspec-*/SKILL.md`
- Commands: `.claude/commands/opsx/*.md`

**Cursor:**
- Rules: `.cursor/rules/openspec-*.mdc` (MDC format)
- All skills combined into rule files with frontmatter

**Windsurf:**
- Rules: `.windsurf/rules/openspec-*.md`
- Similar to Cursor but standard markdown

**Cline:**
- Rules: `.cline/rules/openspec-*.md`
- Standard markdown format

**Rationale**: Each editor has documented conventions. We follow them.

### 4. Smart Init Flow

**Decision**: Detection → Summary → Selection → Generation

```
$ openspec init

Detecting project configuration...

Found:
  Editors: Claude Code, Cursor
  OpenSpec: Old system (AGENTS.md exists)

Recommendation: Migrate to new skills-based system

Select editors to configure: (detected editors pre-selected)
  [x] Claude Code
  [x] Cursor
  [ ] Windsurf
  [ ] Cline

Generating files for Claude Code...
  Created .claude/skills/openspec-*/ (9 skills)
  Created .claude/commands/opsx/* (9 commands)

Generating files for Cursor...
  Created .cursor/rules/openspec-*.mdc (9 rules)

Done! Run `openspec cleanup` to remove old artifacts.
```

**Rationale**: Users see what's detected, can adjust, understand what's happening.

### 5. Content Equivalence

**Decision**: Same SkillDefinition content, different file format per editor.

All editors receive:
- Same skill names (openspec-new-change, etc.)
- Same instruction content
- Same invocation patterns documented

Format differs:
- Claude Code: SKILL.md + pointer commands
- Others: Combined rule files with metadata

**Rationale**: Consistent experience regardless of editor. Skills work the same way.

## Risks / Trade-offs

**[Risk] Editor formats may change**
→ Mitigation: Adapters isolate changes. Only one adapter needs updating per editor.

**[Risk] Some editors may not support skill references**
→ Mitigation: Adapters can include full instructions if needed (no pointer pattern).

**[Risk] Detection may have false positives (empty .cursor/ directory)**
→ Mitigation: Acceptable - pre-selection is a suggestion, user can deselect.

**[Trade-off] More complexity in generation code**
→ Acceptable: Adapter pattern keeps it manageable. Each adapter is self-contained.

## Migration Plan

This is Part 3 of 3:
- **Part 1**: Foundation - SkillDefinition pattern (required first)
- **Part 2**: Migration - Update/cleanup commands (can run in parallel)
- **Part 3 (this change)**: Multi-editor - Detection and adapters

## Open Questions

- Should we support custom adapters (user-defined editors)?
- How do we handle editor-specific features that don't map?
- Should detection also check for editor binaries in PATH?
