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

## Why

The current OpenSpec skill generation uses 18 separate template functions that duplicate content between skills and commands. This creates maintenance burden and makes it difficult to keep instructions in sync. We need a unified `SkillDefinition` pattern where skills are the single source of truth and commands are lightweight pointers.

This is Part 1 of the skills-only migration, focusing on establishing the foundation architecture for Claude Code only.

## What Changes

- **SkillDefinition pattern**: Single `SkillDefinition[]` array replaces 18 template functions
- **Skills as source of truth**: Full instructions live only in `.claude/skills/openspec-*/SKILL.md`
- **Pointer commands**: `.claude/commands/opsx/*.md` files reference skills (~5 lines vs ~70 lines)
- **Init for new users**: `openspec init` generates skills-only setup for Claude Code (no old artifacts)
- **Deprecate old generation**: Old template functions deprecated in favor of unified generator

## Capabilities

### Modified Capabilities
- `skill-generation`: Consolidate to single SkillDefinition pattern, generate pointer commands
- `init`: Generate skills-only setup for new Claude Code users (no AGENTS.md, no .claude/agents/)

## Impact

- **Generator code**: Refactor `skill-templates.ts` to use SkillDefinition array
- **Init flow**: Remove generation of old artifacts for new projects
- **Existing users**: No impact - this change only affects new initializations
- **Other editors**: Not affected - multi-editor support comes in Part 3
