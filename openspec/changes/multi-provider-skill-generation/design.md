## Context

The `artifact-experimental-setup` command generates skill files and opsx slash commands for AI coding assistants. Currently it hardcodes paths to `.claude/skills` and `.claude/commands/opsx`.

The existing `AI_TOOLS` array in `config.ts` lists 22 AI tools but lacks path information. There's also an existing `SlashCommandConfigurator` system for the old workflow commands, but it's tightly coupled to the old 3 commands (proposal, apply, archive) and can't be easily extended for the 9 opsx commands.

Each AI tool has:
- Different skill directory conventions (`.claude/skills/`, `.cursor/skills/`, etc.)
- Different command file paths (`.claude/commands/opsx/`, `.cursor/commands/`, etc.)
- Different frontmatter formats (YAML keys, structure varies by tool)

## Goals / Non-Goals

**Goals:**
- Support skill generation for any AI tool following the Agent Skills spec
- Support command generation with tool-specific formatting via adapters
- Require explicit tool selection (no defaults)
- Create a generic, extensible command generation system

**Non-Goals:**
- Global path installation for tools other than Codex (Codex uses absolute adapter paths today)
- Multi-tool generation in single command (future enhancement)
- Unifying with existing SlashCommandConfigurator (separate systems for now)

## Decisions

### 1. Add `skillsDir` to `AIToolOption` interface

**Decision**: Add single `skillsDir` field to existing interface. No `commandsDir` or `globalSkillsDir`.

```typescript
interface AIToolOption {
  name: string;
  value: string;
  available: boolean;
  successLabel?: string;
  skillsDir?: string;  // e.g., '.claude' - /skills suffix per Agent Skills spec
}
```

**Rationale**:
- Skills follow Agent Skills spec: `<toolDir>/skills/` - suffix is standard
- Commands need per-tool formatting, handled by adapters (not a simple path)
- Global paths supported — Codex adapter returns absolute paths via os.homedir()

### 2. Strategy/Adapter pattern for command generation

**Decision**: Create generic command generation with tool-specific adapters.

```text
┌─────────────────────────────────────────────────────────────────┐
│                      CommandContent                              │
│  (tool-agnostic: id, name, description, category, tags, body)   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   generateCommand(content, adapter)              │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │  Claude  │   │  Cursor  │   │ Windsurf │
        │ Adapter  │   │ Adapter  │   │ Adapter  │
        └──────────┘   └──────────┘   └──────────┘
```

**Interfaces:**

```typescript
// Tool-agnostic command data
interface CommandContent {
  id: string;           // e.g., 'explore', 'new', 'apply'
  name: string;         // e.g., 'OpenSpec Explore'
  description: string;  // e.g., 'Enter explore mode...'
  category: string;     // e.g., 'OpenSpec'
  tags: string[];       // e.g., ['openspec', 'explore']
  body: string;         // The command instructions
}

// Per-tool formatting strategy
interface ToolCommandAdapter {
  toolId: string;
  getFilePath(commandId: string): string;
  formatFile(content: CommandContent): string;
}
```

**Rationale**:
- Separates "what to generate" from "how to format it"
- Each tool's frontmatter quirks encapsulated in its adapter
- Easy to add new tools by implementing adapter interface
- Body content shared across all tools

**Alternative considered**: Extend existing SlashCommandConfigurator
- Rejected: Tightly coupled to old 3 commands, significant refactor needed

### 3. Adapter registry pattern

**Decision**: Create `CommandAdapterRegistry` similar to existing `SlashCommandRegistry`.

```typescript
class CommandAdapterRegistry {
  private static adapters: Map<string, ToolCommandAdapter> = new Map();

  static get(toolId: string): ToolCommandAdapter | undefined;
  static getAll(): ToolCommandAdapter[];
}
```

**Rationale**:
- Consistent with existing codebase patterns
- Easy lookup by tool ID
- Centralized registration

### 4. Required tool flag

**Decision**: Require `--tool` flag - error if omitted.

**Rationale**:
- Explicit tool selection avoids assumptions
- Consistent with project convention of not providing defaults
- Users must consciously choose their target tool

## Risks / Trade-offs

**[Risk] Adapter maintenance burden** → Each new tool needs an adapter. Mitigated by simple interface - most adapters are ~20 lines.

**[Risk] Frontmatter format drift** → Tools may change their formats. Mitigated by encapsulating format in adapter - single place to update.

**[Trade-off] Two command systems** → Old SlashCommandConfigurator and new CommandAdapterRegistry coexist. Acceptable for now - can unify later if needed.

**[Trade-off] skillsDir optional** → Tools without skillsDir configured will error. Acceptable - we add paths as tools are tested.

## Implementation Approach

1. Add `skillsDir` to `AIToolOption` and populate for known tools
2. Create `CommandContent` and `ToolCommandAdapter` interfaces
3. Implement adapters for Claude, Cursor, Windsurf (start with 3)
4. Create `CommandAdapterRegistry`
5. Create `generateCommand()` function
6. Update `artifact-experimental-setup` to use new system
7. Add `--tool` flag with validation
