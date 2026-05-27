# Supported Tools

Pastelsdd works with many AI coding assistants. When you run `pastelsdd init`, Pastelsdd configures selected tools using your active profile/workflow selection and delivery mode.

## How It Works

For each selected tool, Pastelsdd can install:

1. **Skills** (if delivery includes skills): `.../skills/pastelsdd-*/SKILL.md`
2. **Commands** (if delivery includes commands): tool-specific `pastel-*` command files

By default, Pastelsdd uses the `core` profile, which includes:
- `propose`
- `explore`
- `apply`
- `sync`
- `archive`

You can enable expanded workflows (`new`, `continue`, `ff`, `verify`, `bulk-archive`, `onboard`) via `pastelsdd config profile`, then run `pastelsdd update`.

## Tool Directory Reference

| Tool (ID) | Skills path pattern | Command path pattern |
|-----------|---------------------|----------------------|
| Amazon Q Developer (`amazon-q`) | `.amazonq/skills/pastelsdd-*/SKILL.md` | `.amazonq/prompts/pastel-<id>.md` |
| Antigravity (`antigravity`) | `.agent/skills/pastelsdd-*/SKILL.md` | `.agent/workflows/pastel-<id>.md` |
| Auggie (`auggie`) | `.augment/skills/pastelsdd-*/SKILL.md` | `.augment/commands/pastel-<id>.md` |
| IBM Bob Shell (`bob`) | `.bob/skills/pastelsdd-*/SKILL.md` | `.bob/commands/pastel-<id>.md` |
| Claude Code (`claude`) | `.claude/skills/pastelsdd-*/SKILL.md` | `.claude/commands/pastel/<id>.md` |
| Cline (`cline`) | `.cline/skills/pastelsdd-*/SKILL.md` | `.clinerules/workflows/pastel-<id>.md` |
| CodeBuddy (`codebuddy`) | `.codebuddy/skills/pastelsdd-*/SKILL.md` | `.codebuddy/commands/pastel/<id>.md` |
| Codex (`codex`) | `.codex/skills/pastelsdd-*/SKILL.md` | `$CODEX_HOME/prompts/pastel-<id>.md`\* |
| ForgeCode (`forgecode`) | `.forge/skills/pastelsdd-*/SKILL.md` | Not generated (no command adapter; use skill-based `/pastelsdd-*` invocations) |
| Continue (`continue`) | `.continue/skills/pastelsdd-*/SKILL.md` | `.continue/prompts/pastel-<id>.prompt` |
| CoStrict (`costrict`) | `.cospec/skills/pastelsdd-*/SKILL.md` | `.cospec/pastelsdd/commands/pastel-<id>.md` |
| Crush (`crush`) | `.crush/skills/pastelsdd-*/SKILL.md` | `.crush/commands/pastel/<id>.md` |
| Cursor (`cursor`) | `.cursor/skills/pastelsdd-*/SKILL.md` | `.cursor/commands/pastel-<id>.md` |
| Factory Droid (`factory`) | `.factory/skills/pastelsdd-*/SKILL.md` | `.factory/commands/pastel-<id>.md` |
| Gemini CLI (`gemini`) | `.gemini/skills/pastelsdd-*/SKILL.md` | `.gemini/commands/pastel/<id>.toml` |
| GitHub Copilot (`github-copilot`) | `.github/skills/pastelsdd-*/SKILL.md` | `.github/prompts/pastel-<id>.prompt.md`\*\* |
| iFlow (`iflow`) | `.iflow/skills/pastelsdd-*/SKILL.md` | `.iflow/commands/pastel-<id>.md` |
| Junie (`junie`) | `.junie/skills/pastelsdd-*/SKILL.md` | `.junie/commands/pastel-<id>.md` |
| Kilo Code (`kilocode`) | `.kilocode/skills/pastelsdd-*/SKILL.md` | `.kilocode/workflows/pastel-<id>.md` |
| Kimi CLI (`kimi`) | `.kimi/skills/pastelsdd-*/SKILL.md` | Not generated (no command adapter; use skill-based `/skill:pastelsdd-*` invocations) |
| Kiro (`kiro`) | `.kiro/skills/pastelsdd-*/SKILL.md` | `.kiro/prompts/pastel-<id>.prompt.md` |
| Lingma (`lingma`) | `.lingma/skills/pastelsdd-*/SKILL.md` | `.lingma/commands/pastel/<id>.md` |
| OpenCode (`opencode`) | `.opencode/skills/pastelsdd-*/SKILL.md` | `.opencode/commands/pastel-<id>.md` |
| Pi (`pi`) | `.pi/skills/pastelsdd-*/SKILL.md` | `.pi/prompts/pastel-<id>.md` |
| Qoder (`qoder`) | `.qoder/skills/pastelsdd-*/SKILL.md` | `.qoder/commands/pastel/<id>.md` |
| Qwen Code (`qwen`) | `.qwen/skills/pastelsdd-*/SKILL.md` | `.qwen/commands/pastel-<id>.toml` |
| RooCode (`roocode`) | `.roo/skills/pastelsdd-*/SKILL.md` | `.roo/commands/pastel-<id>.md` |
| Trae (`trae`) | `.trae/skills/pastelsdd-*/SKILL.md` | Not generated (no command adapter; use skill-based `/pastelsdd-*` invocations) |
| Windsurf (`windsurf`) | `.windsurf/skills/pastelsdd-*/SKILL.md` | `.windsurf/workflows/pastel-<id>.md` |

\* Codex commands are installed in the global Codex home (`$CODEX_HOME/prompts/` if set, otherwise `~/.codex/prompts/`), not your project directory.

\*\* GitHub Copilot prompt files are recognized as custom slash commands in IDE extensions (VS Code, JetBrains, Visual Studio). Copilot CLI does not currently consume `.github/prompts/*.prompt.md` directly.

## Non-Interactive Setup

For CI/CD or scripted setup, use `--tools` (and optionally `--profile`):

```bash
# Configure specific tools
pastelsdd init --tools claude,cursor

# Configure all supported tools
pastelsdd init --tools all

# Skip tool configuration
pastelsdd init --tools none

# Override profile for this init run
pastelsdd init --profile core
```

**Available tool IDs (`--tools`):** `amazon-q`, `antigravity`, `auggie`, `bob`, `claude`, `cline`, `codex`, `forgecode`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `junie`, `kilocode`, `kimi`, `kiro`, `opencode`, `pi`, `qoder`, `lingma`, `qwen`, `roocode`, `trae`, `windsurf`

## Workflow-Dependent Installation

Pastelsdd installs workflow artifacts based on selected workflows:

- **Core profile (default):** `propose`, `explore`, `apply`, `sync`, `archive`
- **Custom selection:** any subset of all workflow IDs:
  `propose`, `explore`, `new`, `continue`, `apply`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`

In other words, skill/command counts are profile-dependent and delivery-dependent, not fixed.

## Generated Skill Names

When selected by profile/workflow config, Pastelsdd generates these skills:

- `pastelsdd-propose`
- `pastelsdd-explore`
- `pastelsdd-new-change`
- `pastelsdd-continue-change`
- `pastelsdd-apply-change`
- `pastelsdd-ff-change`
- `pastelsdd-sync-specs`
- `pastelsdd-archive-change`
- `pastelsdd-bulk-archive-change`
- `pastelsdd-verify-change`
- `pastelsdd-onboard`

See [Commands](commands.md) for command behavior and [CLI](cli.md) for `init`/`update` options.

## Related

- [CLI Reference](cli.md) — Terminal commands
- [Commands](commands.md) — Slash commands and skills
- [Getting Started](getting-started.md) — First-time setup
