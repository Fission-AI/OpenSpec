# Supported Tools

Pscode works with many AI coding assistants. When you run `pscode init`, Pscode configures selected tools using your active profile/workflow selection and delivery mode.

## How It Works

For each selected tool, Pscode can install:

1. **Skills** (if delivery includes skills): `.../skills/pscode-*/SKILL.md`
2. **Commands** (if delivery includes commands): tool-specific `pastel-*` command files

By default, Pscode uses the `core` profile, which includes:
- `propose`
- `explore`
- `apply`
- `sync`
- `archive`

You can enable expanded workflows (`new`, `continue`, `ff`, `verify`, `bulk-archive`, `onboard`) via `pscode config profile`, then run `pscode update`.

## Tool Directory Reference

| Tool (ID) | Skills path pattern | Command path pattern |
|-----------|---------------------|----------------------|
| Amazon Q Developer (`amazon-q`) | `.amazonq/skills/pscode-*/SKILL.md` | `.amazonq/prompts/pastel-<id>.md` |
| Antigravity (`antigravity`) | `.agent/skills/pscode-*/SKILL.md` | `.agent/workflows/pastel-<id>.md` |
| Auggie (`auggie`) | `.augment/skills/pscode-*/SKILL.md` | `.augment/commands/pastel-<id>.md` |
| IBM Bob Shell (`bob`) | `.bob/skills/pscode-*/SKILL.md` | `.bob/commands/pastel-<id>.md` |
| Claude Code (`claude`) | `.claude/skills/pscode-*/SKILL.md` | `.claude/commands/pastel/<id>.md` |
| Cline (`cline`) | `.cline/skills/pscode-*/SKILL.md` | `.clinerules/workflows/pastel-<id>.md` |
| CodeBuddy (`codebuddy`) | `.codebuddy/skills/pscode-*/SKILL.md` | `.codebuddy/commands/pastel/<id>.md` |
| Codex (`codex`) | `.codex/skills/pscode-*/SKILL.md` | `$CODEX_HOME/prompts/pastel-<id>.md`\* |
| ForgeCode (`forgecode`) | `.forge/skills/pscode-*/SKILL.md` | Not generated (no command adapter; use skill-based `/pscode-*` invocations) |
| Continue (`continue`) | `.continue/skills/pscode-*/SKILL.md` | `.continue/prompts/pastel-<id>.prompt` |
| CoStrict (`costrict`) | `.cospec/skills/pscode-*/SKILL.md` | `.cospec/pscode/commands/pastel-<id>.md` |
| Crush (`crush`) | `.crush/skills/pscode-*/SKILL.md` | `.crush/commands/pastel/<id>.md` |
| Cursor (`cursor`) | `.cursor/skills/pscode-*/SKILL.md` | `.cursor/commands/pastel-<id>.md` |
| Factory Droid (`factory`) | `.factory/skills/pscode-*/SKILL.md` | `.factory/commands/pastel-<id>.md` |
| Gemini CLI (`gemini`) | `.gemini/skills/pscode-*/SKILL.md` | `.gemini/commands/pastel/<id>.toml` |
| GitHub Copilot (`github-copilot`) | `.github/skills/pscode-*/SKILL.md` | `.github/prompts/pastel-<id>.prompt.md`\*\* |
| iFlow (`iflow`) | `.iflow/skills/pscode-*/SKILL.md` | `.iflow/commands/pastel-<id>.md` |
| Junie (`junie`) | `.junie/skills/pscode-*/SKILL.md` | `.junie/commands/pastel-<id>.md` |
| Kilo Code (`kilocode`) | `.kilocode/skills/pscode-*/SKILL.md` | `.kilocode/workflows/pastel-<id>.md` |
| Kimi CLI (`kimi`) | `.kimi/skills/pscode-*/SKILL.md` | Not generated (no command adapter; use skill-based `/skill:pscode-*` invocations) |
| Kiro (`kiro`) | `.kiro/skills/pscode-*/SKILL.md` | `.kiro/prompts/pastel-<id>.prompt.md` |
| Lingma (`lingma`) | `.lingma/skills/pscode-*/SKILL.md` | `.lingma/commands/pastel/<id>.md` |
| OpenCode (`opencode`) | `.opencode/skills/pscode-*/SKILL.md` | `.opencode/commands/pastel-<id>.md` |
| Pi (`pi`) | `.pi/skills/pscode-*/SKILL.md` | `.pi/prompts/pastel-<id>.md` |
| Qoder (`qoder`) | `.qoder/skills/pscode-*/SKILL.md` | `.qoder/commands/pastel/<id>.md` |
| Qwen Code (`qwen`) | `.qwen/skills/pscode-*/SKILL.md` | `.qwen/commands/pastel-<id>.toml` |
| RooCode (`roocode`) | `.roo/skills/pscode-*/SKILL.md` | `.roo/commands/pastel-<id>.md` |
| Trae (`trae`) | `.trae/skills/pscode-*/SKILL.md` | Not generated (no command adapter; use skill-based `/pscode-*` invocations) |
| Windsurf (`windsurf`) | `.windsurf/skills/pscode-*/SKILL.md` | `.windsurf/workflows/pastel-<id>.md` |

\* Codex commands are installed in the global Codex home (`$CODEX_HOME/prompts/` if set, otherwise `~/.codex/prompts/`), not your project directory.

\*\* GitHub Copilot prompt files are recognized as custom slash commands in IDE extensions (VS Code, JetBrains, Visual Studio). Copilot CLI does not currently consume `.github/prompts/*.prompt.md` directly.

## Non-Interactive Setup

For CI/CD or scripted setup, use `--tools` (and optionally `--profile`):

```bash
# Configure specific tools
pscode init --tools claude,cursor

# Configure all supported tools
pscode init --tools all

# Skip tool configuration
pscode init --tools none

# Override profile for this init run
pscode init --profile core
```

**Available tool IDs (`--tools`):** `amazon-q`, `antigravity`, `auggie`, `bob`, `claude`, `cline`, `codex`, `forgecode`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `junie`, `kilocode`, `kimi`, `kiro`, `opencode`, `pi`, `qoder`, `lingma`, `qwen`, `roocode`, `trae`, `windsurf`

## Workflow-Dependent Installation

Pscode installs workflow artifacts based on selected workflows:

- **Core profile (default):** `propose`, `explore`, `apply`, `sync`, `archive`
- **Custom selection:** any subset of all workflow IDs:
  `propose`, `explore`, `new`, `continue`, `apply`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`

In other words, skill/command counts are profile-dependent and delivery-dependent, not fixed.

## Generated Skill Names

When selected by profile/workflow config, Pscode generates these skills:

- `pscode-propose`
- `pscode-explore`
- `pscode-new-change`
- `pscode-continue-change`
- `pscode-apply-change`
- `pscode-ff-change`
- `pscode-sync-specs`
- `pscode-archive-change`
- `pscode-bulk-archive-change`
- `pscode-verify-change`
- `pscode-onboard`

See [Commands](commands.md) for command behavior and [CLI](cli.md) for `init`/`update` options.

## Related

- [CLI Reference](cli.md) — Terminal commands
- [Commands](commands.md) — Slash commands and skills
- [Getting Started](getting-started.md) — First-time setup
