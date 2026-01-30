# Supported Tools

OpenSpec works with 20+ AI coding assistants. When you run `openspec init`, you'll be prompted to select which tools you use, and OpenSpec will configure the appropriate integrations.

## How It Works

For each tool you select, OpenSpec installs:

1. **Skills** — Reusable instruction files that power the `/opsx:*` workflow commands
2. **Commands** — Tool-specific slash command bindings

## Tool Directory Reference

| Tool | Skills Location | Commands Location |
|------|-----------------|-------------------|
| Amazon Q Developer | `.amazonq/skills/` | `.amazonq/prompts/` |
| Antigravity | `.agent/skills/` | `.agent/workflows/` |
| Auggie (Augment CLI) | `.augment/skills/` | `.augment/commands/` |
| Claude Code | `.claude/skills/` | `.claude/commands/opsx/` |
| Cline | `.cline/skills/` | `.clinerules/workflows/` |
| CodeBuddy | `.codebuddy/skills/` | `.codebuddy/commands/opsx/` |
| Codex | `.codex/skills/` | `~/.codex/prompts/`* |
| Continue | `.continue/skills/` | `.continue/prompts/` |
| CoStrict | `.cospec/skills/` | `.cospec/openspec/commands/` |
| Crush | `.crush/skills/` | `.crush/commands/opsx/` |
| Cursor | `.cursor/skills/` | `.cursor/commands/` |
| Factory Droid | `.factory/skills/` | `.factory/commands/` |
| Gemini CLI | `.gemini/skills/` | `.gemini/commands/opsx/` |
| GitHub Copilot | `.github/skills/` | `.github/prompts/` |
| iFlow | `.iflow/skills/` | `.iflow/commands/` |
| Kilo Code | `.kilocode/skills/` | `.kilocode/workflows/` |
| OpenCode | `.opencode/skills/` | `.opencode/command/` |
| Qoder | `.qoder/skills/` | `.qoder/commands/opsx/` |
| Qwen Code | `.qwen/skills/` | `.qwen/commands/` |
| RooCode | `.roo/skills/` | `.roo/commands/` |
| Trae | `.trae/skills/` | `.trae/skills/` (via `/openspec-*`) |
| Windsurf | `.windsurf/skills/` | `.windsurf/workflows/` |

\* Codex commands are installed to the global home directory (`~/.codex/prompts/` or `$CODEX_HOME/prompts/`), not the project directory.

## Non-Interactive Setup

For CI/CD or scripted setup, use the `--tools` flag:

```bash
# Configure specific tools
openspec init --tools claude,cursor

# Configure all supported tools
openspec init --tools all

# Skip tool configuration
openspec init --tools none
```

**Available tool IDs:** `amazon-q`, `antigravity`, `auggie`, `claude`, `cline`, `codebuddy`, `codex`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `kilocode`, `opencode`, `qoder`, `qwen`, `roocode`, `trae`, `windsurf`

## What Gets Installed

For each tool, OpenSpec generates 10 skill files that power the OPSX workflow:

| Skill | Purpose |
|-------|---------|
| `openspec-explore` | Thinking partner for exploring ideas |
| `openspec-new-change` | Start a new change |
| `openspec-continue-change` | Create the next artifact |
| `openspec-ff-change` | Fast-forward through all planning artifacts |
| `openspec-apply-change` | Implement tasks |
| `openspec-verify-change` | Verify implementation completeness |
| `openspec-sync-specs` | Sync delta specs to main (optional—archive prompts if needed) |
| `openspec-archive-change` | Archive a completed change |
| `openspec-bulk-archive-change` | Archive multiple changes at once |
| `openspec-onboard` | Guided onboarding through a complete workflow cycle |

These skills are invoked via slash commands like `/opsx:new`, `/opsx:apply`, etc. See [Commands](commands.md) for the full list.

## Adding a New Tool

Want to add support for another AI coding assistant? Check out the [command adapter pattern](../CONTRIBUTING.md) or open an issue on GitHub.

---

## Related

- [CLI Reference](cli.md) — Terminal commands
- [Commands](commands.md) — Slash commands and skills
- [Getting Started](getting-started.md) — First-time setup
