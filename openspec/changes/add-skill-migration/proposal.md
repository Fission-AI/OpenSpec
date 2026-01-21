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

After Part 1 (add-skill-foundation) establishes the skills-only architecture for new users, existing users need a migration path. They have old artifacts (AGENTS.md, .claude/agents/, .claude/commands/openspec/) that should be replaced with the new skills-based system. This change provides the tools for that migration.

This is Part 2 of the skills-only migration, focusing on the upgrade experience for existing users.

## What Changes

- **Informative update**: `openspec update` creates new skills and explains what changed
- **New cleanup command**: `openspec cleanup` removes old artifacts with --yes and --dry-run flags
- **Remove old command**: `artifact-experimental-setup` command removed (functionality merged into init)
- **Deprecation complete**: Old template functions removed (were deprecated in Part 1)

## Capabilities

### New Capabilities
- `cleanup-command`: CLI command to remove old OpenSpec artifacts

### Modified Capabilities
- `update`: Add informative upgrade messaging, create skills for existing users

### Removed Capabilities
- `artifact-experimental-setup`: Merged into init (Part 1)

## Impact

- **CLI commands**: Add `cleanup`, remove `artifact-experimental-setup`
- **Update flow**: Enhanced to generate skills and explain changes
- **Existing users**: Can migrate via `openspec update` then `openspec cleanup`
- **Breaking**: Users of `artifact-experimental-setup` must use `openspec init` instead

## Dependencies

- Requires Part 1 (add-skill-foundation) to be completed first
