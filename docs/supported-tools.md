# Supported Tools

ClearSpec works with many AI coding assistants. When you run `clearspec init`, ClearSpec configures selected tools using your active profile/workflow selection and delivery mode.

## How It Works

For each selected tool, ClearSpec can install:

1. **Skills** (if delivery includes skills): `.../skills/clearspec-*/SKILL.md`
2. **Commands** (if delivery includes commands): tool-specific `clsx-*` command files

By default, ClearSpec uses the `core` profile, which includes:
- `propose`
- `explore`
- `apply`
- `sync`
- `archive`

You can enable expanded workflows (`new`, `continue`, `ff`, `verify`, `bulk-archive`, `onboard`) via `clearspec config profile`, then run `clearspec update`.

## Tool Directory Reference

| Tool (ID) | Skills path pattern | Command path pattern |
|-----------|---------------------|----------------------|
| Amazon Q Developer (`amazon-q`) | `.amazonq/skills/clearspec-*/SKILL.md` | `.amazonq/prompts/clsx-<id>.md` |
| Antigravity (`antigravity`) | `.agent/skills/clearspec-*/SKILL.md` | `.agent/workflows/clsx-<id>.md` |
| Auggie (`auggie`) | `.augment/skills/clearspec-*/SKILL.md` | `.augment/commands/clsx-<id>.md` |
| IBM Bob Shell (`bob`) | `.bob/skills/clearspec-*/SKILL.md` | `.bob/commands/clsx-<id>.md` |
| Claude Code (`claude`) | `.claude/skills/clearspec-*/SKILL.md` | `.claude/commands/clsx/<id>.md` |
| Cline (`cline`) | `.cline/skills/clearspec-*/SKILL.md` | `.clinerules/workflows/clsx-<id>.md` |
| CodeBuddy (`codebuddy`) | `.codebuddy/skills/clearspec-*/SKILL.md` | `.codebuddy/commands/clsx/<id>.md` |
| Codex (`codex`) | `.codex/skills/clearspec-*/SKILL.md` | `$CODEX_HOME/prompts/clsx-<id>.md`\* |
| ForgeCode (`forgecode`) | `.forge/skills/clearspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/clearspec-*` invocations) |
| Continue (`continue`) | `.continue/skills/clearspec-*/SKILL.md` | `.continue/prompts/clsx-<id>.prompt` |
| CoStrict (`costrict`) | `.cospec/skills/clearspec-*/SKILL.md` | `.cospec/clearspec/commands/clsx-<id>.md` |
| Crush (`crush`) | `.crush/skills/clearspec-*/SKILL.md` | `.crush/commands/clsx/<id>.md` |
| Cursor (`cursor`) | `.cursor/skills/clearspec-*/SKILL.md` | `.cursor/commands/clsx-<id>.md` |
| Factory Droid (`factory`) | `.factory/skills/clearspec-*/SKILL.md` | `.factory/commands/clsx-<id>.md` |
| Gemini CLI (`gemini`) | `.gemini/skills/clearspec-*/SKILL.md` | `.gemini/commands/clsx/<id>.toml` |
| GitHub Copilot (`github-copilot`) | `.github/skills/clearspec-*/SKILL.md` | `.github/prompts/clsx-<id>.prompt.md`\*\* |
| iFlow (`iflow`) | `.iflow/skills/clearspec-*/SKILL.md` | `.iflow/commands/clsx-<id>.md` |
| Junie (`junie`) | `.junie/skills/clearspec-*/SKILL.md` | `.junie/commands/clsx-<id>.md` |
| Kilo Code (`kilocode`) | `.kilocode/skills/clearspec-*/SKILL.md` | `.kilocode/workflows/clsx-<id>.md` |
| Kimi CLI (`kimi`) | `.kimi/skills/clearspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/skill:clearspec-*` invocations) |
| Kiro (`kiro`) | `.kiro/skills/clearspec-*/SKILL.md` | `.kiro/prompts/clsx-<id>.prompt.md` |
| Lingma (`lingma`) | `.lingma/skills/clearspec-*/SKILL.md` | `.lingma/commands/clsx/<id>.md` |
| Mistral Vibe (`vibe`) | `.vibe/skills/clearspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/clearspec-*` invocations) |
| OpenCode (`opencode`) | `.opencode/skills/clearspec-*/SKILL.md` | `.opencode/commands/clsx-<id>.md` |
| Pi (`pi`) | `.pi/skills/clearspec-*/SKILL.md` | `.pi/prompts/clsx-<id>.md` |
| Qoder (`qoder`) | `.qoder/skills/clearspec-*/SKILL.md` | `.qoder/commands/clsx/<id>.md` |
| Qwen Code (`qwen`) | `.qwen/skills/clearspec-*/SKILL.md` | `.qwen/commands/clsx-<id>.toml` |
| RooCode (`roocode`) | `.roo/skills/clearspec-*/SKILL.md` | `.roo/commands/clsx-<id>.md` |
| Trae (`trae`) | `.trae/skills/clearspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/clearspec-*` invocations) |
| Windsurf (`windsurf`) | `.windsurf/skills/clearspec-*/SKILL.md` | `.windsurf/workflows/clsx-<id>.md` |

\* Codex commands are installed in the global Codex home (`$CODEX_HOME/prompts/` if set, otherwise `~/.codex/prompts/`), not your project directory.

\*\* GitHub Copilot prompt files are recognized as custom slash commands in IDE extensions (VS Code, JetBrains, Visual Studio). Copilot CLI does not currently consume `.github/prompts/*.prompt.md` directly.

## Non-Interactive Setup

For CI/CD or scripted setup, use `--tools` (and optionally `--profile`):

```bash
# Configure specific tools
clearspec init --tools claude,cursor

# Configure all supported tools
clearspec init --tools all

# Skip tool configuration
clearspec init --tools none

# Override profile for this init run
clearspec init --profile core
```

**Available tool IDs (`--tools`):** `amazon-q`, `antigravity`, `auggie`, `bob`, `claude`, `cline`, `codex`, `forgecode`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `gemini`, `github-copilot`, `iflow`, `junie`, `kilocode`, `kimi`, `kiro`, `lingma`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `vibe`, `windsurf`

## Workflow-Dependent Installation

ClearSpec installs workflow artifacts based on selected workflows:

- **Core profile (default):** `propose`, `explore`, `apply`, `sync`, `archive`
- **Custom selection:** any subset of all workflow IDs:
  `propose`, `explore`, `new`, `continue`, `apply`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`

In other words, skill/command counts are profile-dependent and delivery-dependent, not fixed.

## Generated Skill Names

When selected by profile/workflow config, ClearSpec generates these skills:

- `clearspec-propose`
- `clearspec-explore`
- `clearspec-new-change`
- `clearspec-continue-change`
- `clearspec-apply-change`
- `clearspec-ff-change`
- `clearspec-sync-specs`
- `clearspec-archive-change`
- `clearspec-bulk-archive-change`
- `clearspec-verify-change`
- `clearspec-onboard`

See [Commands](commands.md) for command behavior and [CLI](cli.md) for `init`/`update` options.

## Related

- [CLI Reference](cli.md) — Terminal commands
- [Commands](commands.md) — Slash commands and skills
- [Getting Started](getting-started.md) — First-time setup
