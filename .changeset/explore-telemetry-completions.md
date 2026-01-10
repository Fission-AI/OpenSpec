---
"@fission-ai/openspec": minor
---

### New Features

- Add `/opsx:explore` command for exploratory thinking mode - a thinking partner for exploring ideas, investigating problems, and clarifying requirements before committing to a change
- Add optional anonymous usage statistics with privacy-first design - tracks only command names and version, opt-out via `OPENSPEC_TELEMETRY=0` or `DO_NOT_TRACK=1`, auto-disabled in CI
- Add shell completions for Bash, Fish, and PowerShell (in addition to existing Zsh support)

### Fixes

- Fix parent flags not being offered in Bash and PowerShell completions when subcommands exist
- Fix Windows compatibility issues in tests
- Update Codebuddy slash command frontmatter
