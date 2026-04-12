# Supported Tools

OpenSpec works with many AI coding assistants. When you run `openspec init`, OpenSpec configures selected tools using your active profile/workflow selection and delivery mode.

## How It Works

For each selected tool, OpenSpec can install:

1. **Skills** (if delivery includes skills): `.../skills/openspec-*/SKILL.md`
2. **Commands** (if delivery includes commands): tool-specific `opsx-*` command files

By default, OpenSpec uses the `core` profile, which includes:
- `propose`
- `explore`
- `apply`
- `archive`

You can enable expanded workflows (`new`, `continue`, `ff`, `verify`, `sync`, `bulk-archive`, `onboard`) via `openspec config profile`, then run `openspec update`.

## What to Expect After `openspec init`

- **Only 4 workflows installed?** That is the default `core` profile. You should expect `propose`, `explore`, `apply`, and `archive` unless you explicitly opt into a broader workflow set.
- **Missing command files?** Check your delivery mode. `skills` delivery installs only `openspec-*` skills, `commands` delivery installs only `opsx-*` command files, and `both` installs both surfaces when the tool supports both.
- **Wrong command syntax?** The same workflow may surface as `/opsx:propose`, `/opsx-propose`, or `/openspec-propose` depending on the tool and delivery mode.

## Command Syntax by Tool Family

| Tool family | Syntax example |
|-------------|----------------|
| Claude Code and other colon-style integrations | `/opsx:propose`, `/opsx:apply` |
| OpenCode, Cursor, Windsurf, GitHub Copilot IDE, Bob Shell, Pi, and other hyphen-style integrations | `/opsx-propose`, `/opsx-apply` |
| ForgeCode, Trae, or any project using skills-only delivery | `/openspec-propose`, `/openspec-apply-change` |

## Tool Directory Reference

| Tool (ID) | Skills path pattern | Command path pattern |
|-----------|---------------------|----------------------|
| Amazon Q Developer (`amazon-q`) | `.amazonq/skills/openspec-*/SKILL.md` | `.amazonq/prompts/opsx-<id>.md` |
| Antigravity (`antigravity`) | `.agent/skills/openspec-*/SKILL.md` | `.agent/workflows/opsx-<id>.md` |
| Auggie (`auggie`) | `.augment/skills/openspec-*/SKILL.md` | `.augment/commands/opsx-<id>.md` |
| IBM Bob Shell (`bob`) | `.bob/skills/openspec-*/SKILL.md` | `.bob/commands/opsx-<id>.md` |
| Claude Code (`claude`) | `.claude/skills/openspec-*/SKILL.md` | `.claude/commands/opsx/<id>.md` |
| Cline (`cline`) | `.cline/skills/openspec-*/SKILL.md` | `.clinerules/workflows/opsx-<id>.md` |
| CodeBuddy (`codebuddy`) | `.codebuddy/skills/openspec-*/SKILL.md` | `.codebuddy/commands/opsx/<id>.md` |
| Codex (`codex`) | `.codex/skills/openspec-*/SKILL.md` | `$CODEX_HOME/prompts/opsx-<id>.md`\* |
| ForgeCode (`forgecode`) | `.forge/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/openspec-*` invocations) |
| Continue (`continue`) | `.continue/skills/openspec-*/SKILL.md` | `.continue/prompts/opsx-<id>.prompt` |
| CoStrict (`costrict`) | `.cospec/skills/openspec-*/SKILL.md` | `.cospec/openspec/commands/opsx-<id>.md` |
| Crush (`crush`) | `.crush/skills/openspec-*/SKILL.md` | `.crush/commands/opsx/<id>.md` |
| Cursor (`cursor`) | `.cursor/skills/openspec-*/SKILL.md` | `.cursor/commands/opsx-<id>.md` |
| Factory Droid (`factory`) | `.factory/skills/openspec-*/SKILL.md` | `.factory/commands/opsx-<id>.md` |
| Gemini CLI (`gemini`) | `.gemini/skills/openspec-*/SKILL.md` | `.gemini/commands/opsx/<id>.toml` |
| GitHub Copilot (`github-copilot`) | `.github/skills/openspec-*/SKILL.md` | `.github/prompts/opsx-<id>.prompt.md`\*\* |
| iFlow (`iflow`) | `.iflow/skills/openspec-*/SKILL.md` | `.iflow/commands/opsx-<id>.md` |
| Junie (`junie`) | `.junie/skills/openspec-*/SKILL.md` | `.junie/commands/opsx-<id>.md` |
| Kilo Code (`kilocode`) | `.kilocode/skills/openspec-*/SKILL.md` | `.kilocode/workflows/opsx-<id>.md` |
| Kiro (`kiro`) | `.kiro/skills/openspec-*/SKILL.md` | `.kiro/prompts/opsx-<id>.prompt.md` |
| OpenCode (`opencode`) | `.opencode/skills/openspec-*/SKILL.md` | `.opencode/commands/opsx-<id>.md` |
| Pi (`pi`) | `.pi/skills/openspec-*/SKILL.md` | `.pi/prompts/opsx-<id>.md` |
| Qoder (`qoder`) | `.qoder/skills/openspec-*/SKILL.md` | `.qoder/commands/opsx/<id>.md` |
| Qwen Code (`qwen`) | `.qwen/skills/openspec-*/SKILL.md` | `.qwen/commands/opsx-<id>.toml` |
| RooCode (`roocode`) | `.roo/skills/openspec-*/SKILL.md` | `.roo/commands/opsx-<id>.md` |
| Trae (`trae`) | `.trae/skills/openspec-*/SKILL.md` | Not generated (no command adapter; use skill-based `/openspec-*` invocations) |
| Windsurf (`windsurf`) | `.windsurf/skills/openspec-*/SKILL.md` | `.windsurf/workflows/opsx-<id>.md` |

\* Codex commands are installed in the global Codex home (`$CODEX_HOME/prompts/` if set, otherwise `~/.codex/prompts/`), not your project directory.

\*\* GitHub Copilot prompt files are recognized as custom slash commands in IDE extensions (VS Code, JetBrains, Visual Studio). Copilot CLI does not currently consume `.github/prompts/*.prompt.md` directly.

## Non-Interactive Setup

For CI/CD or scripted setup, use `--tools` (and optionally `--profile`):

```bash
# Configure specific tools
openspec init --tools claude,cursor

# Configure all supported tools
openspec init --tools all

# Skip tool configuration
openspec init --tools none

# Override profile for this init run
openspec init --profile core
```

**Available tool IDs (`--tools`):** `amazon-q`, `antigravity`, `auggie`, `bob`, `claude`, `cline`, `codex`, `codebuddy`, `continue`, `costrict`, `crush`, `cursor`, `factory`, `forgecode`, `gemini`, `github-copilot`, `iflow`, `junie`, `kilocode`, `kiro`, `opencode`, `pi`, `qoder`, `qwen`, `roocode`, `trae`, `windsurf`

## Workflow-Dependent Installation

OpenSpec installs workflow artifacts based on selected workflows:

- **Core profile (default):** `propose`, `explore`, `apply`, `archive`
- **Custom selection:** any subset of all workflow IDs:
  `propose`, `explore`, `new`, `continue`, `apply`, `ff`, `sync`, `archive`, `bulk-archive`, `verify`, `onboard`

In other words, skill/command counts are profile-dependent and delivery-dependent, not fixed.

## Generated Skill Names

When selected by profile/workflow config, OpenSpec generates these skills:

- `openspec-propose`
- `openspec-explore`
- `openspec-new-change`
- `openspec-continue-change`
- `openspec-apply-change`
- `openspec-ff-change`
- `openspec-sync-specs`
- `openspec-archive-change`
- `openspec-bulk-archive-change`
- `openspec-verify-change`
- `openspec-onboard`

See [Commands](commands.md) for command behavior and [CLI](cli.md) for `init`/`update` options.

## Troubleshooting

### Why did I only get 4 workflows?

Because OpenSpec defaults to the `core` profile. Run `openspec config profile`, choose the expanded workflows you want, then run `openspec update` in the project.

### Why are command files missing?

Two common reasons:

1. **Delivery is set to `skills`**. That installs only `openspec-*` skills, so missing `opsx-*` files are expected.
2. **Your tool is skill-based**. Tools such as ForgeCode and Trae do not currently get generated `opsx-*` command files, so use the installed skills instead.

### Which syntax should I use?

Use the syntax family that matches your tool:

- `/opsx:...` for colon-style integrations
- `/opsx-...` for hyphen-style integrations
- `/openspec-...` when you are using skills directly

If you are unsure, compare your generated file paths against the table above or check [Commands](commands.md) first.

### Why does OpenCode documentation sometimes mention `.opencode/command/` and sometimes `.opencode/commands/`?

Current OpenSpec releases generate `.opencode/commands/`. Older OpenCode setups and older docs may still mention `.opencode/command/`. If you see the singular path in older reports, treat it as version drift rather than a separate workflow model.

## Related

- [CLI Reference](cli.md) — Terminal commands
- [Commands](commands.md) — Slash commands and skills
- [Getting Started](getting-started.md) — First-time setup
