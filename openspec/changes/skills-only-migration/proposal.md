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

The current OpenSpec setup has two parallel systems: the "old" approach (AGENTS.md, .claude/agents/, .claude/commands/openspec/) and the "new" experimental approach (skills in .claude/skills/, commands in .claude/commands/opsx/). This creates confusion, maintenance burden, and a fragmented user experience. We need to consolidate to a skills-only architecture where skills are the source of truth and slash commands are lightweight pointers for human invocation.

## What Changes

- **Skills become source of truth**: Full instructions live only in `.claude/skills/openspec-*/SKILL.md`
- **Commands become pointers**: `.claude/commands/opsx/*.md` files reference skills instead of duplicating instructions
- **Smart init**: `openspec init` detects existing editor configs and OpenSpec state, recommends setup
- **Unified generation**: Single `SkillDefinition[]` array and one generator function for all skills
- **New cleanup command**: `openspec cleanup` removes old artifacts (CLAUDE.md, AGENTS.md, .claude/agents/, .claude/commands/openspec/)
- **Informative update**: `openspec update` creates new skills, explains changes, points to cleanup
- **Multi-editor support**: Unified generation for detected editors (Claude Code, Cursor, Windsurf, Cline)
- **BREAKING**: `openspec artifact-experimental-setup` command removed (merged into init)
- **Deprecation**: Old nested commands (openspec change show/list/validate)

## Capabilities

### New Capabilities
- `cleanup-command`: CLI command to remove old OpenSpec artifacts with --yes and --dry-run flags
- `smart-init`: Enhanced initialization with editor detection and state-aware recommendations

### Modified Capabilities
- `init`: Merge artifact-experimental-setup functionality, add detection logic, smart defaults
- `update`: Add informative upgrade messaging, create skills automatically for existing users
- `skill-generation`: Consolidate to single SkillDefinition pattern, generate pointer commands

## Impact

- **CLI commands**: Remove `artifact-experimental-setup`, add `cleanup`
- **Generator code**: Refactor `skill-templates.ts` and `artifact-workflow.ts` to use unified pattern
- **Init flow**: Significant refactor of `src/core/init.ts` for smart detection
- **User migration**: Existing users need to run `openspec update` to get new skills
- **Documentation**: Update all docs to reflect skills-only approach
