## Why

OpenSpec users already expect `openspec init` to let them pick the AI tool they actually use. MiniMax Code is a meaningful gap today: users can install the desktop app and CLI locally, but OpenSpec has no supported way to target it during initialization or refresh.

MiniMax Code does not behave like most project-local tools OpenSpec supports today. Its OpenSpec-compatible workflows are exposed through skills, and current local verification shows the active MiniMax skill location is backed by the user's `~/.minimax/skills` directory. Treating MiniMax Code like a repo-local `.minimax/commands/...` integration would produce the wrong artifacts.

This first version intentionally uses a fixed user-home target instead of invoking MiniMax runtime configuration. Runtime profile/data-dir discovery can be added later if MiniMax installations require it in practice.

## What Changes

- Add MiniMax Code as a supported `openspec init --tools minimax-code` target and interactive selection.
- Define MiniMax Code as a global user-home skill-installation target, writing OpenSpec-managed skills into `~/.minimax/skills` instead of a project-local hidden folder.
- Update configured-tool detection so OpenSpec can recognize an existing MiniMax Code installation from the fixed user-home MiniMax skill location.
- Update `openspec update` so it refreshes MiniMax Code managed skills in place without creating a repo-local MiniMax directory.
- Treat MiniMax Code like a global skills-only integration: repo-local init/update generate skills when delivery includes skills, commands are skipped when delivery includes commands, and commands-only repo delivery does not delete the user's global MiniMax Code skills. Workspace setup/update remains skills-only like existing workspace behavior and still refreshes MiniMax Code skills when selected.
- Extend workspace skill setup/update so MiniMax Code can use the same shared skill target helper instead of being accidentally excluded by project-local `skillsDir` assumptions.
- Document MiniMax Code as a skills-invocable integration so users understand that OpenSpec workflows are exposed through MiniMax skills rather than adapter-generated command files.

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `ai-tool-paths`: support AI tools whose OpenSpec skill target is a fixed user-home global skill directory instead of a fixed project-local `skillsDir`
- `cli-init`: allow selecting MiniMax Code and install its OpenSpec skills into the MiniMax Code user-home skills location
- `cli-update`: detect and refresh existing MiniMax Code OpenSpec-managed skills from the user-home installation target
- `workspace-links`: allow workspace skill setup/update to resolve MiniMax Code's user-home global skill target through the shared helper

## Impact

- `src/core/config.ts` - add MiniMax Code tool metadata and a home-relative global skill target path
- shared skill path helpers - resolve either project-local `<projectRoot>/<skillsDir>/skills` paths or home-relative global `globalSkillsDir` values such as `.minimax` to final targets such as `~/.minimax/skills`
- `src/core/available-tools.ts` and `src/core/shared/tool-detection.ts` - detect configured MiniMax Code installs from the fixed global skill path
- `src/core/init.ts` - write MiniMax Code skills to the global target and preserve existing no-command-adapter behavior
- `src/core/update.ts` - refresh MiniMax Code managed skills in place and preserve existing global MiniMax Code skills when delivery is commands-only
- `src/core/profile-sync-drift.ts` and `src/core/migration.ts` - read MiniMax Code skill status through the shared skill path helper rather than assuming project-local `skillsDir`
- `src/core/workspace/skills.ts` and workspace command tests - route workspace skill generation, refresh, selection, and cleanup through the shared skill path helper
- `docs/supported-tools.md`, `docs/cli.md`, and `docs/commands.md` - document MiniMax Code setup, tool id, fixed global skill path, and skill invocation expectations
- `test/core/init.test.ts`, `test/core/update.test.ts`, `test/core/workspace/skills.test.ts`, `test/commands/workspace.test.ts`, and detection/path tests - cover MiniMax Code path resolution, detection, refresh, workspace setup/update, managed-only cleanup, commands-only preservation, and adapterless delivery behavior
