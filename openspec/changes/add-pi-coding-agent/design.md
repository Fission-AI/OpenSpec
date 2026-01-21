## Context

OpenSpec supports 21 AI coding assistants through a plugin-based architecture:
- `ToolConfigurator` for root config files (e.g., CLAUDE.md)
- `SlashCommandConfigurator` for slash command files (e.g., `.claude/commands/`)
- `ToolRegistry` and `SlashCommandRegistry` for registration
- `AI_TOOLS` array in `config.ts` for UI display

Pi-coding-agent from badlogic/pi-mono already supports AGENTS.md files natively, so only slash command support is needed.

## Goals / Non-Goals

**Goals:**
- Enable pi users to select "Pi" during `openspec init`
- Generate `/openspec-proposal`, `/openspec-apply`, `/openspec-archive` commands in `.pi/prompts/`
- Follow pi's expected format: `.md` files with YAML frontmatter containing `description`

**Non-Goals:**
- Creating a separate PI.md root config file (pi reads AGENTS.md already)
- Supporting pi's `$1`/`$@` argument syntax (not needed for OpenSpec commands)
- Global installation support (pi prompts are project-local in `.pi/prompts/`)

## Decisions

### 1. Slash command file location: `.pi/prompts/openspec-*.md`

**Rationale**: Pi-coding-agent loads custom commands from `.pi/prompts/*.md` where the filename becomes the command name. Using `openspec-proposal.md` creates `/openspec-proposal`.

**Alternatives considered**:
- `.pi/commands/` - Not a valid pi location
- Global `~/.pi/agent/prompts/` - Would apply to all projects, not project-specific

### 2. YAML frontmatter with `description` only

**Rationale**: Pi requires minimal frontmatter - just `description`. Unlike Continue (which needs `invokable: true`) or Gemini (TOML format), pi keeps it simple.

```yaml
---
description: Scaffold a new OpenSpec change and validate strictly.
---
```

### 3. No ToolConfigurator needed

**Rationale**: Pi-coding-agent already reads AGENTS.md files in priority order (global → parent dirs → current dir). The existing root AGENTS.md stub is sufficient. Adding a separate PI.md would be redundant.

## Risks / Trade-offs

**[Risk]** Pi's format may change in future versions → **Mitigation**: Implementation follows current documented format from pi-mono README. Format is stable and matches standard markdown with YAML frontmatter pattern.

**[Trade-off]** No root PI.md file means pi users don't get the visual confirmation of a dedicated config file → **Acceptable**: Pi's AGENTS.md support means the existing stub works. Less file clutter is preferable.
