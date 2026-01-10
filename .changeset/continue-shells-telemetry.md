---
"@fission-ai/openspec": minor
---

### New Features

- **Continue IDE support** – OpenSpec now generates slash commands for [Continue](https://continue.dev/), expanding editor integration options alongside Cursor, Windsurf, Claude Code, and others
- **Shell completions for Bash, Fish, and PowerShell** – Run `openspec completion install` to set up tab completion in your preferred shell
- **`/opsx:explore` command** – A new thinking partner mode for exploring ideas and investigating problems before committing to changes
- **Codebuddy slash command improvements** – Updated frontmatter format for better compatibility

### Bug Fixes

- Shell completions now correctly offer parent-level flags (like `--help`) when a command has subcommands
- Fixed Windows compatibility issues in tests

### Other

- Added optional anonymous usage statistics to help understand how OpenSpec is used. This is **opt-out** by default – set `OPENSPEC_TELEMETRY=0` or `DO_NOT_TRACK=1` to disable. Only command names and version are collected; no arguments, file paths, or content. Automatically disabled in CI environments.
